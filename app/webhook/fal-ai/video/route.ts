import { NextRequest } from "next/server";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Fal AI Webhook 배달부 엔드포인트
 * Fal AI 작업 완료 시 웹훅을 받아, 쿼리 파라미터에 따라 
 * 정규 파이프라인(/api/video/process/speed) 또는 단건 재생성(/api/video/process/speed/regenerate)으로 배달합니다.
 */
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const isRetriedByViolence = searchParams.get("isRetriedByViolence");
    const isRegenerate = searchParams.get("isRegenerate");
    const sceneNumber = searchParams.get("sceneNumber");

    if (!taskId) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "taskId is required",
        });
    }

    try {
        const falPayload = await request.json();
        const { request_id: requestId } = falPayload;

        if (!falPayload || !requestId) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "falPayload or requestId is invalid",
            });
        }

        // 단건 재생성인 경우 단건 전용 속도 후처리 라우트로 배달
        const nextRouteUrl = isRegenerate === "true" && sceneNumber
            ? `${process.env.BASE_URL}/api/video/process/speed/regenerate?taskId=${taskId}&sceneNumber=${sceneNumber}`
            : `${process.env.BASE_URL}/api/video/process/speed?taskId=${taskId}&isRetriedByViolence=${isRetriedByViolence}`;

        internalFireAndForgetFetch(
            nextRouteUrl,
            {
                method: "POST",
            },
            {
                falPayload: falPayload,
            }
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Received fal-ai Webhook successfully",
        });
    } catch (error) {
        console.error("fal-ai Webhook processing error:", error);
        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error",
        });
    }
}