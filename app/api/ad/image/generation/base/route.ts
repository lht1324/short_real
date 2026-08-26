import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";
import { adImageServerAPI } from "@/lib/api/server/ad/imageServerAPI";
import { selectBaseRatio } from "@/lib/api/server/ad/creativeCombinationSampler";
import {
    ReplicateImageModelId,
    replicateClient,
} from "@/lib/ReplicateClient";

/**
 * 기준(base) 이미지 제출 단계 — 복수 비율 배치의 creative당 최초 1회 호출.
 * selectBaseRatio(1:1 우선, 없으면 캐노니컬 첫째)로 기준 비율을 정해
 * Replicate prediction을 제출하고 즉시 반환한다 (동기 대기 없음).
 * 완료는 웹훅(webhook/ad/replicate/image/base)으로 도착하며, 이 라우트가 다음 단계를 직접 부르지 않는다.
 */
export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const creativeIndexParam = searchParams.get('creativeIndex');

    if (!batchId || creativeIndexParam === null) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query params: batchId, creativeIndex"
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);

    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid creativeIndex query param.",
        });
    }

    try {
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        const creativeSpec = batch.ad_creative_specs[creativeIndex];

        if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative spec #${creativeIndex} not found in batch.`
            });
        }

        const baseRatio = selectBaseRatio(batch.aspect_ratios);

        const caption = creativeSpec.imageSpecs[baseRatio];

        if (!caption || typeof caption !== 'string' || caption.trim().length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Caption for base ratio ${baseRatio} is missing. Prompt step must be completed before generation.`
            });
        }

        const originalImageUrls = await adImageServerAPI.getAdOriginalImageSignedUrls(batch);

        const baseUrl = process.env.BASE_URL;

        if (!baseUrl) {
            throw new Error("BASE_URL is not configured.");
        }

        const webhookUrl = `${baseUrl}/webhook/ad/replicate/image/base?batchId=${encodeURIComponent(batchId)}&creativeIndex=${encodeURIComponent(String(creativeIndex))}&ratioKey=${encodeURIComponent(baseRatio)}`;

        await replicateClient.postAdImageEditPrediction({
            model: ReplicateImageModelId.NANO_BANANA,
            prompt: caption,
            imageUrls: originalImageUrls,
            aspectRatio: baseRatio,
            webhookUrl,
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Base image prediction submitted.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/image/generation/base (batch=${batchId}, creative=${creativeIndex}):`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to submit base image generation"
        });
    }
}
