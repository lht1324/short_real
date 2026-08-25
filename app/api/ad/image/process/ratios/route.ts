import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

/**
 * 파생(ratios) 이미지 후처리 단계 — 웹훅 배달부(webhook/.../ratios)에서 전달받아 실행.
 * payload 검사 → 이미지 다운로드·Supabase 저장 → RPC#2(완료 마커·마지막 조각 판정).
 * RPC#2가 isLastCreative=true를 반환하면 analysis(Vision 묶음 평가)를 호출한다.
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
    const ratioKey = searchParams.get('ratioKey'); // TODO(미정): ratio_key 전달 방식 확정 전까지 선택적

    if (!batchId || creativeIndexParam === null) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query params: batchId, creativeIndex"
        });
    }

    const creativeIndex = Number.parseInt(creativeIndexParam, 10);

    try {
        const body = await request.json();
        const replicatePayload = body?.replicatePayload;

        // TODO(작업 대기): payload 검사 — status === 'succeeded' 확인
        //   failed/canceled면 해당 조각 실패 처리(정책 미정: 즉시 failed vs 재시도) 후 종료
        // TODO(작업 대기): output URL 추출 + ratioKey 확정(query 또는 payload input)

        // TODO(작업 대기): 이미지 다운로드 → Supabase Storage 저장
        //   경로 규칙: {user_id}/{batch_id}/ad_generation_result_{creativeIndex}_{ratio}.{ext}
        //   ⚠️ 버킷명 미정

        // TODO(작업 대기): RPC#2 update_creative_image_by_ratio_generation_completed(batchId, creativeIndex, ratioKey)
        //   반환 { isLastCreative, batchCompleted } — isLastCreative=true일 때만 아래 analysis 호출

        const isLastCreative = false; // TODO(작업 대기): 위 RPC 반환값으로 대체

        if (isLastCreative) {
            internalFireAndForgetFetch(
                `${process.env.BASE_URL}/api/ad/creative/${creativeIndex}/analysis?batchId=${batchId}`,
                { method: "POST" },
            );
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Ratio image processed.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/image/process/ratios (batch=${batchId}, creative=${creativeIndex}):`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to process ratio image"
        });
    }
}
