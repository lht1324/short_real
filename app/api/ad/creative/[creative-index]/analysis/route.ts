import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

/**
 * Creative 묶음 분석 단계 — process/ratios가 RPC#2에서 isLastCreative=true를 받았을 때만 호출.
 * 이 creative의 선택 비율 이미지 전부를 Gemini Vision으로 보고
 * 오버레이 지오메트리(design)와 score(0.0~10.0)를 비율당 확정한 뒤
 * RPC#3 update_creative_image_analysis로 저장한다.
 * (RPC#3이 배치 전부의 score 완료를 보고 status 'completed' 전이까지 처리한다)
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ 'creative-index': string }> },
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { 'creative-index': creativeIndexParam } = await context.params;
    const batchId = request.nextUrl.searchParams.get('batchId');

    if (!batchId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: batchId"
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

        const creativeSpec = batch.ad_creative_specs[creativeIndex];

        if (!creativeSpec || creativeSpec.creativeIndex !== creativeIndex) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Creative spec #${creativeIndex} not found in batch.`
            });
        }

        // TODO(작업 대기): 평가 대상 수집 — 이 creative의 생성 완료 비율별 signed URL
        //   (규칙 경로 재조립: {user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext})

        // TODO(작업 대기): Gemini Vision 묶음 평가 — 비율별 design(AdDesignLayout) + score 산출
        //   cta_enabled=false면 design.cta는 null

        // TODO(작업 대기): RPC#3 update_creative_image_analysis(batchId, creativeIndex, imageResults) 저장

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Creative analysis completed.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/creative/${creativeIndexParam}/analysis (batch=${batchId}):`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to run analysis"
        });
    }
}
