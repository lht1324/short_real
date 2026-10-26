import { Redis } from "@upstash/redis";

/**
 * 태스크 이벤트 버스 — Supabase Realtime 대체 (Upstash Streams).
 * REST는 SUBSCRIBE가 안 돼서 Streams + `/api/events`(SSE) 조합으로 간다.
 * 쓰는 쪽(serverAPI — post/patch/delete에서 발행), 보는 쪽(클라 훅)이 SSE로 수신 후 재조회.
 * 발행 실패는 fail-soft (이벤트 유실이지 데이터 유실이 아님 — 폴백 재조회로 복구).
 * 서버 전용 (클라에서 import 금지 — 훅은 type만 import).
 */

/** SSE 이벤트 종류 — 이벤트는 "변화 있음" 신호만 담고, 클라는 수신 후 재조회한다 */
export type TaskEventType = 'task';

export interface TaskEventMessage {
    type: TaskEventType;
    taskId?: string;
}

const STREAM_MAXLEN = 100;

let redis: Redis | null = null;
let warnedMissingKeys = false;

function getRedis(): Redis | null {
    if (redis) return redis;
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
        if (!warnedMissingKeys) {
            warnedMissingKeys = true;
            console.error("[task-events] UPSTASH keys missing — events disabled (fail-soft).");
        }
        return null;
    }
    redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
    return redis;
}

/** 유저 스트림 키 — 대시보드 task 목록 갱신 */
export function userStreamKey(userId: string): string {
    return `short-real:user:${userId}`;
}

/** 태스크 스트림 키 — 에디터 단일 태스크 갱신 */
export function taskStreamKey(taskId: string): string {
    return `short-real:task:${taskId}`;
}

async function add(key: string, message: TaskEventMessage): Promise<void> {
    const client = getRedis();
    if (!client) return;
    await client.xadd(key, "*", { data: JSON.stringify(message) });
    await client.xtrim(key, { strategy: "MAXLEN", threshold: STREAM_MAXLEN });
}

/** 태스크 쓰기 알림 — user 스트림(목록 갱신) + task 스트림(에디터) */
export async function publishTaskWrite(taskId: string, userId: string): Promise<void> {
    try {
        await add(taskStreamKey(taskId), { type: 'task', taskId });
        await add(userStreamKey(userId), { type: 'task', taskId });
    } catch (error) {
        console.error("[task-events] publish failed (fail-soft):", error);
    }
}

/** 유저 스코프 알림 — 목록 갱신 전용 (삭제 시 task 스트림에 보낼 대상이 없어도 무방하나 균일성 위해 유지) */
export async function publishTaskDelete(taskId: string, userId: string): Promise<void> {
    try {
        await add(taskStreamKey(taskId), { type: 'task', taskId });
        await add(userStreamKey(userId), { type: 'task', taskId });
    } catch (error) {
        console.error("[task-events] publish failed (fail-soft):", error);
    }
}

export interface StreamEntry {
    id: string;
    message: TaskEventMessage;
}

/** 스트림 읽기 — cursor exclusive (xrange는 '$'를 모르니 호출자가 최신 ID를 넘긴다) */
export async function readStream(key: string, cursor: string, take: number): Promise<StreamEntry[]> {
    const client = getRedis();
    if (!client) return [];
    const raw: unknown = await client.xrange(key, cursor, '+', take);
    // Upstash는 Record(entryId → 필드)로 반환. 구버전 튜플 형태도 흡수.
    const pairs: Array<[string, unknown]> = Array.isArray(raw)
        ? raw.map((item) => [entryIdOf(item) ?? '', fieldsOf(item)])
        : Object.entries((raw ?? {}) as Record<string, unknown>);
    const entries: StreamEntry[] = [];
    for (const [id, fields] of pairs) {
        if (!id) continue;
        // Upstash REST는 필드값을 이미 객체로 파싱해서 줄 수 있다 (문자열·객체 양쪽 흡수)
        const rawData = (fields as Record<string, unknown> | null)?.data;
        try {
            const message = (typeof rawData === 'string' ? JSON.parse(rawData) : rawData) as TaskEventMessage;
            if (!message || typeof message.type !== 'string') continue;
            entries.push({ id, message });
        } catch {
            /* 깨진 엔트리 스킵 */
        }
    }
    return entries;
}

function entryIdOf(item: unknown): string | null {
    if (Array.isArray(item)) return String(item[0]);
    const id = (item as { id?: unknown }).id;
    return typeof id === 'string' ? id : null;
}

function fieldsOf(item: unknown): unknown {
    if (Array.isArray(item)) return item[1] ?? null;
    return (item as { message?: unknown }).message ?? null;
}

/** 스트림 최신 ID — 첫 연결 커서용 (없으면 null) */
export async function latestStreamId(key: string): Promise<string | null> {
    const client = getRedis();
    if (!client) return null;
    const raw: unknown = await client.xrevrange(key, '+', '-', 1);
    if (Array.isArray(raw)) {
        const first = raw[0];
        if (Array.isArray(first)) return String(first[0]);
        const id = (first as { id?: unknown } | undefined)?.id;
        if (typeof id === 'string') return id;
        return null;
    }
    const ids = Object.keys((raw ?? {}) as Record<string, unknown>);
    return ids[0] ?? null;
}
