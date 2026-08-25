import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

/**
 * Creative별 프롬프트(LLM) 단계 — Creative마다 1회 호출 (ad_variation_study.md §3).
 * 코드가 배정한 5축 조합 + 사용자 입력을 받아 비율별 캡션 묶음(imageSpecs)과
 * 판매 카피(headline/CTA)를 한 번에 생성한다.
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

    if (Number.isNaN(creativeIndex) || creativeIndex < 0) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Invalid creative-index path param."
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

        // 크리에이티브 디렉터(DeepSeek)에게 전달할 재료 — 조합 1개 + 유저 입력 해석용 컨텍스트
        const creativeDirectorInput = {
            camera: creativeSpec.camera,
            lighting: creativeSpec.lighting,
            palette: creativeSpec.palette,
            framing: creativeSpec.framing,
            layout_tone: creativeSpec.layout_tone,
            aspectRatios: batch.aspect_ratios,
            productNote: batch.product_image?.note ?? null,
            personNote: batch.person_image?.note ?? null,
            ctaEnabled: batch.cta_enabled,
            conceptCount: batch.concept_count,
            creativeIndex,
            seed: creativeSpec.seed,
        };

        // ============================================================
        // TODO(LLM 경계): 여기서 OpenRouter로 DeepSeek V4 Flash를 호출해
        //   - imageSpecs: 선택 비율 각각의 I2I 캡션 1문장
        //   - copy: headline(+cta_enabled일 때 cta 문구)
        // 를 1회 응답으로 받는다. 응답 처리 순서:
        //   1) ad_creative_specs[creativeIndex].imageSpecs 채우기
        //   2) ad_creative_results[creativeIndex].copy 저장
        //   3) 비율 갯수 판정 → generation/base 또는 generation/ratios 호출
        // ============================================================

        return getNextBaseResponse({
            success: false,
            status: 501,
            error: "LLM call is not wired yet.",
            data: {
                creativeDirectorInput,
            },
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/creative/${creativeIndexParam}/prompt:`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to run prompt step"
        });
    }
}
