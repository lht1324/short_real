import { NextRequest, NextResponse } from 'next/server';
import { videoServerAPI } from '@/lib/api/server/videoServerAPI';
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function POST(request: NextRequest) {
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
        console.log(`[API Video-Music Merge] 병합 요청 시작: ${taskId}`);

        // postVideoMergeMusic() 호출 - Replicate prediction 생성
        const predictionId = await videoServerAPI.postVideoMergeMusic(taskId);

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