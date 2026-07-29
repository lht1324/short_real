import { NextRequest } from 'next/server';
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { VideoGenerationTaskStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { taskCheckAndCleanupIfCancelled } from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

export async function POST(
    request: NextRequest,
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;

    const taskId = searchParams.get('taskId');
    const sessionUserId = searchParams.get('userId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Task not found'
            });
        }

        if (!videoGenerationTask.final_video_merge_data) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Missing required field of task: final_video_merge_data'
            });
        }

        const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.FINALIZING);

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        // Fire-and-Forget으로 백그라운드 프로세스 엔드포인트 비동기 호출
        const baseUrl = process.env.BASE_URL || "";
        const internalProcessUrl = `${baseUrl}/api/video/merge/final/process?taskId=${taskId}`;

        console.log(`[Merge Final Trigger] Fire-and-forget final video merge process for Task #${taskId}...`);
        internalFireAndForgetFetch(
            internalProcessUrl,
            { method: "POST" }
        );

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Final video merge process started successfully.",
        });
    } catch (error) {
        console.error('[API Final Trigger] Error:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}