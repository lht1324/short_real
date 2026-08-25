import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Replicate 웹훅 배달부 — 파생(ratios) 이미지 prediction 전용.
 * webhook_url에 batchId·creativeIndex가 query로 박혀 제출 시점에 전달되며,
 * ratio_key 식별자 전달 방식(webhook query vs payload input)은 미확정 — 구현 때 결정.
 * 역할은 수신→전달뿐: 파싱해서 process/ratios로 넘기고 즉시 200 응답.
 * (절대 에러 상태로 응답하지 않는다 — 재시도 폭풍 방지, fal 웹훅 선례와 동일)
 */
export async function POST(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const batchId = searchParams.get('batchId');
    const creativeIndexParam = searchParams.get('creativeIndex');
    const ratioKey = searchParams.get('ratioKey'); // TODO(미정): ratio_key 전달 방식 확정 전까지 선택적

    if (!batchId || creativeIndexParam === null) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Missing batchId or creativeIndex query params."
        });
    }

    try {
        const payload = await request.json();

        // TODO(작업 대기): 최소 검증 — payload.id(prediction id), payload.status 존재 확인
        // TODO(작업 대기): 멱등 방어 — 같은 prediction id의 중복 전송 무시

        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/ad/image/process/ratios?batchId=${batchId}&creativeIndex=${creativeIndexParam}${ratioKey ? `&ratioKey=${ratioKey}` : ""}`,
            { method: "POST" },
            {
                replicatePayload: payload,
            },
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Received ratio image webhook successfully",
        });
    } catch (error) {
        console.error(`[webhook/ad/replicate/image/ratios] processing error (batch=${batchId}):`, error);

        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error",
        });
    }
}
