import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { postMasterStyle } from "@/trigger/post-master-style";

export async function POST(request: NextRequest) {
    // 1. 보안 검사
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    // 2. 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        // 3. Trigger.dev 작업 실행 (비동기)
        // 여기서 await을 써도 실제 작업 완료를 기다리는 게 아니라 "등록"만 기다립니다. (매우 빠름)
        const handle = await tasks.trigger<typeof postMasterStyle>("post-master-style", {
            taskId: taskId,
        });

        // 4. 즉시 응답 반환 (타임아웃 해결!)
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Video generation task has been queued.",
            data: {
                handleId: handle.id,
                taskId: taskId
            }
        });

    } catch (error) {
        console.error("Failed to trigger task:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to queue video generation task.",
        });
    }
}