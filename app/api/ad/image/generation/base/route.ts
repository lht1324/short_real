import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

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

    try {
        // TODO(작업 대기): 배치·spec 조회 — 캡션(specs[creativeIndex].imageSpecs[baseRatio])과
        //   참조 이미지(원본 product/person) signed URL 규칙 경로 재조립

        // TODO(작업 대기): replicateClient.postAdImageEditPrediction 제출
        //   webhook_url = ${BASE_URL}/webhook/ad/replicate/image/base?batchId=..&creativeIndex=..

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
