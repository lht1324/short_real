import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {getErrorMessage} from "@/utils/ErrorUtils";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";

/**
 * fal-ai Webhook 엔드포인트
 * fal-ai는 작업 완료 시 설정된 webhook URL로 POST 요청을 보냅니다.
 */
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const isRetriedByViolence = searchParams.get('isRetriedByViolence');

    if (!taskId) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "taskId is required"
        });
    }

    try {
        // 1. fal-ai Payload 받기
        // fal-ai의 구조: { request_id: string, status: "COMPLETED" | "ERROR", payload: any, error: any }
        const falPayload = await request.json();
        const { request_id: requestId } = falPayload;

        if (!falPayload) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "falPayload is invalid."
            });
        }

        if (!requestId) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "requestId is invalid."
            });
        }

        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video/process/speed?taskId=${taskId}&isRetriedByViolence=${isRetriedByViolence}`,
            {
                method: 'POST',
            },
            {
                falPayload: falPayload,
            },
        )

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Received fal-ai Webhook successfully."
        });
    } catch (error) {
        console.error("fal-ai Webhook processing error:", error);
        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error"
        });
    }
}