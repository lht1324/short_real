import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

/**
 * 파생(ratios) 이미지 제출 단계 — 중립 실행자.
 * 호출처가 두 곳이지만(프롬프트 직통 / process-base 뒤따름) 이 라우트는 그 차이를 모른다.
 * 배치의 aspect_ratios length만으로 모드를 판별한다:
 *   - length === 1 → 직통 모드: 그 한 장 제출 (곧 마지막 조각)
 *   - length >= 2  → 뒤따름 모드: (aspect_ratios − selectBaseRatio) 전부 제출,
 *                    기준 이미지는 규칙 경로로 signed URL 재조립해 참조 입력에 포함
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
        const batch = await adGenerationBatchServerAPI.getAdGenerationBatchById(batchId);

        if (!batch) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Batch not found."
            });
        }

        // TODO(작업 대기): 모드 판별 — aspect_ratios.length 기준 (selectBaseRatio 사용)
        //   직통 모드: 캡션 + 원본 참조로 1장 제출
        //   뒤따름 모드: 남은 비율 전부 제출 (기준 이미지 signed URL 재조립해서 참조 포함)
        //   ⚠️ 불변성 가드: 뒤따름 모드인데 기준 이미지가 준비 안 됐으면 거부
        // TODO(작업 대기): replicateClient.postAdImageEditPrediction 반복 제출
        //   webhook_url = ${BASE_URL}/webhook/ad/replicate/image/ratios?batchId=..&creativeIndex=..
        // TODO(미정): ratio_key 식별자를 webhook query로 전달할지 payload input에 넣을지

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Ratio image predictions submitted.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/image/generation/ratios (batch=${batchId}, creative=${creativeIndex}):`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to submit ratio image generations"
        });
    }
}
