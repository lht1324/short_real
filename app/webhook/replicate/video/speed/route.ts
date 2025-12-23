import { NextRequest } from "next/server";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";

export async function POST(request: NextRequest) {
    // 1. URL 쿼리 파라미터에서 문맥(Context) 정보 복구
    // startSpeedAdjustment에서 보낸 taskId와 requestId를 여기서 받습니다.
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const requestId = searchParams.get('requestId');

    if (!taskId || !requestId) {
        return getNextBaseResponse({
            success: true, // Replicate가 재시도하지 않도록 200 OK 처리하되 에러 로그 남김
            status: 200,
            error: "Missing metadata (taskId or requestId)"
        });
    }

    try {
        // 2. Replicate 웹훅 바디 파싱
        const body = await request.json();
        const { status, output, error } = body;

        // 5. Replicate 작업 실패 처리
        if (status === 'failed') {
            console.error(`Speed adjustment failed for scene ${requestId}:`, error);

            // 전체 Task 실패 처리 (정책에 따라 부분 성공 허용 시 변경 가능)
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Marked as failed due to Replicate error"
            });
        }

        // 성공했지만 결과 URL이 없는 경우 방어
        if (!output) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "No output received, but status is not failed. Ignoring."
            });
        }

        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/process/speed/after?taskId=${taskId}&requestId=${requestId}`,
            {
                method: 'POST',
            },
            {
                replicatePayload: body,
            }
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Speed adjustment processed successfully"
        });

    } catch (error) {
        console.error("Speed Webhook Logic Error:", error);

        // 에러 발생 시에도 Replicate가 무한 재시도하지 않도록 200을 반환하되,
        // 내부적으로는 Task를 Failed로 돌리는 것이 안전합니다.
        // 단, 일시적 네트워크 오류일 수 있으므로 상황에 따라 다릅니다.
        // 여기서는 안전하게 로깅만 하고 종료하거나, 심각한 경우 Task Failed 처리합니다.

        return getNextBaseResponse({
            success: true, // Replicate 재시도 방지
            status: 200,
            error: "Internal Server Error in Speed Webhook"
        });
    }
}