import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { postImage } from "@/trigger/post-image";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/utils/getIsValidRequest";

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
        // 3. Trigger.dev 작업 실행 (이미지 생성)
        const handle = await tasks.trigger<typeof postImage>("post-image", {
            taskId: taskId,
        });

        // 4. 즉시 응답 반환
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Image generation task has been queued.",
            data: {
                handleId: handle.id,
                taskId: taskId
            }
        });

    } catch (error) {
        console.error("Failed to trigger image generation task:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to queue image generation task.",
        });
    }
}