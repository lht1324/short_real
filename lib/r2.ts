import {
    CopyObjectCommand,
    DeleteObjectsCommand,
    GetObjectCommand,
    ListObjectsV2Command,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * R2 서버 전용 헬퍼 — S3 규격으로 Cloudflare R2를 본다 (AWS 아님).
 * 키 규칙({user_id}/{task_id}/…, 기존 Supabase 버킷명 폴더 구조)은 serverAPI들이 소유.
 * 버킷: CLOUDFLARE_R2_BUCKET은 base 이름(예: short-real) 고정.
 * dev는 -dev 버킷을 본다 (short-real-dev, 사장님이 184파일 업로드 완료). prod는 base 그대로(빈 깡통 시작).
 * 전제: env값에 -dev를 붙이지 말 것 (중복 접미사 방지).
 */

const PRESIGN_EXPIRES_SECONDS = 60 * 60 * 24;

let cachedClient: S3Client | null = null;
let cachedBucket: string | null = null;

function getR2(): { client: S3Client; bucket: string } {
    if (!cachedClient || !cachedBucket) {
        if (
            !process.env.CLOUDFLARE_R2_ENDPOINT ||
            !process.env.CLOUDFLARE_R2_ACCESS_KEY_ID ||
            !process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY ||
            !process.env.CLOUDFLARE_R2_BUCKET
        ) {
            throw new Error('Cloudflare R2 environment variables are not set.')
        }
        const baseBucket = process.env.CLOUDFLARE_R2_BUCKET;
        cachedBucket = process.env.NODE_ENV === 'production' ? baseBucket : `${baseBucket}-dev`;
        cachedClient = new S3Client({
            region: 'auto',
            endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
            credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
                secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
            },
        });
    }
    return { client: cachedClient, bucket: cachedBucket };
}

async function toBytes(data: ArrayBuffer | Uint8Array | Blob): Promise<Uint8Array> {
    if (data instanceof Blob) return new Uint8Array(await data.arrayBuffer());
    return data instanceof Uint8Array ? data : new Uint8Array(data);
}

export const r2ServerAPI = {
    /** 업로드 — upsert 고정 (File/Blob도 허용 — Supabase upload 계약 유지) */
    async putObject(key: string, data: ArrayBuffer | Uint8Array | Blob, contentType: string): Promise<void> {
        const { client, bucket } = getR2();
        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: await toBytes(data),
            ContentType: contentType,
        }));
    },

    /** 읽기용 서명 URL — Replicate·프록시·브라우저가 직접 읽는다 (Supabase signedUrl 계약 유지) */
    async presignGet(
        key: string,
        expiresInSeconds: number = PRESIGN_EXPIRES_SECONDS,
        options?: { responseContentDisposition?: string },
    ): Promise<string> {
        const { client, bucket } = getR2();
        return getSignedUrl(client, new GetObjectCommand({
            Bucket: bucket,
            Key: key,
            // Supabase createSignedUrl의 { download: fileName } 계약 대응 — 다운로드 강제 헤더
            ...(options?.responseContentDisposition && { ResponseContentDisposition: options.responseContentDisposition }),
        }), {
            expiresIn: expiresInSeconds,
        });
    },

    /** 파일 다운로드 (export 업로드 흐름에서 영상을 읽을 때 사용) */
    async getObject(key: string): Promise<Uint8Array> {
        const { client, bucket } = getR2();
        const result = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
        const bytes = await result.Body?.transformToByteArray();
        if (!bytes) {
            throw new Error(`R2 object not found or empty: ${key}`);
        }
        return bytes;
    },

    /** prefix 아래 키 목록 (파일명만, prefix 제거) */
    async listKeys(prefix: string): Promise<string[]> {
        const { client, bucket } = getR2();
        const names: string[] = [];
        let continuationToken: string | undefined;
        do {
            const result = await client.send(new ListObjectsV2Command({
                Bucket: bucket,
                Prefix: prefix,
                ContinuationToken: continuationToken,
            }));
            for (const obj of result.Contents ?? []) {
                if (obj.Key) names.push(obj.Key);
            }
            continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
        } while (continuationToken);
        return names.map((k) => (k.startsWith(prefix) ? k.slice(prefix.length) : k));
    },

    /** 삭제 — 빈 배열이면 no-op */
    async deleteKeys(keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        const { client, bucket } = getR2();
        await client.send(new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: keys.map((Key) => ({ Key })) },
        }));
    },

    /** 버킷 내 복사 (upsert) */
    async copyObject(fromKey: string, toKey: string): Promise<void> {
        const { client, bucket } = getR2();
        await client.send(new CopyObjectCommand({
            Bucket: bucket,
            Key: toKey,
            CopySource: `${bucket}/${fromKey}`,
        }));
    },
};
