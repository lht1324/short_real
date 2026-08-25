import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

/**
 * 기준(base) 이미지 후처리 단계 — 웹훅 배달부(webhook/.../base)에서 전달받아 실행.
 * payload 검사 → 이미지 다운로드·Supabase 저장 → RPC#2(완료 마커·마지막 조각 판정) →
 * 성공 시 generation/ratios 재호출로 파생 단계를 연다. 이 라우트가 creative의 갈래점이다.
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
        const body = await request.json();
        const replicatePayload = body?.replicatePayload;

        // TODO(작업 대기): payload 검사 — status === 'succeeded' 확인
        //   failed/canceled면 배치 failed 전이 후 종료
        // TODO(작업 대기): output URL 추출(collectOutputUrls 정규화 활용)

        // TODO(작업 대기): 이미지 다운로드 → Supabase Storage 저장
        //   경로 규칙: {user_id}/{batch_id}/ad_generation_result_{creativeIndex}_{baseRatio}.{ext}
        //   ⚠️ 버킷명 미정

        // TODO(작업 대기): RPC#2 update_creative_image_by_ratio_generation_completed 호출
        //   완료 마커 기록 — 반환값은 ratios 재호출 판단에 불필요(base는 무조건 파생을 연다)

        // 파생 단계 개시 — 중립 실행자(ratios)가 모드를 스스로 판별한다
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/ad/image/generation/ratios?batchId=${batchId}&creativeIndex=${creativeIndex}`,
            { method: "POST" },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Base image processed and ratio generation dispatched.",
        });
    } catch (error) {
        console.error(`Error in POST /api/ad/image/process/base (batch=${batchId}, creative=${creativeIndex}):`, error);

        await adGenerationBatchServerAPI.patchAdGenerationBatchStatus(batchId, 'failed').catch(() => {});

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to process base image"
        });
    }
}
