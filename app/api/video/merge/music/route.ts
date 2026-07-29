import { NextRequest } from 'next/server';
import { videoServerAPI } from '@/lib/api/server/videoServerAPI';
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
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

        console.log(`[API Video-Music Merge] 병합 요청 시작: ${taskId}`);

        // postVideoMergeMusic() 호출 - Replicate prediction 생성
        const predictionId = await videoServerAPI.postVideoMergeMusic(taskId, videoGenerationTask.user_id);

        console.log(`[API Video-Music Merge] Prediction 생성 완료: ${predictionId}`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Requested merging music and video successfully: ${predictionId}`,
        });

    } catch (error) {
        console.error('[API Video-Music Merge] Error:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}