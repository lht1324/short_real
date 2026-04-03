import {NextRequest} from 'next/server';
import {videoServerAPI} from '@/lib/api/server/videoServerAPI';
import {musicServerAPI} from '@/lib/api/server/musicServerAPI';
import {generateASSContent} from "@/lib/utils/captionUtils";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {FinalVideoMergeData, VideoGenerationTaskStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import {taskCheckAndCleanupIfCancelled} from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";

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

    const taskId = searchParams.get('taskId')
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


        // video, audio url 저장이 아닌 새로 받아오는 걸로 수정 (잘못하면 만료됨)
        const {
            // Caption 관련
            isCaptionEnabled,
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
            // Music 관련
            musicIndex,
            cuttingAreaStartSec,
            cuttingAreaEndSec,
            volumePercentage,
        }: FinalVideoMergeData = videoGenerationTask.final_video_merge_data;

        if (cuttingAreaEndSec <= cuttingAreaStartSec) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'cuttingAreaEndSec must be greater than cuttingAreaStartSec'
            });
        }

        if (volumePercentage < 0 || volumePercentage > 100) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'volumePercentage must be between 0 and 100'
            });
        }

        const videoUrl = await videoServerAPI.getVideoSignedUrl(`${taskId}/${taskId}.mp4`, 60 * 60);
        const audioUrl = await musicServerAPI.getMusicSignedUrl(`${taskId}/${taskId}_${musicIndex}.mp3`, 60 * 60);

        const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.FINALIZING);

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        // ASS 콘텐츠 생성
        const assContent = generateASSContent(
            isCaptionEnabled,
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
        );

        // 1. Caption 번인 2. Music 편집을 병렬 실행
        const [captionPredictionId, musicPredictionId] = await Promise.all([
            videoServerAPI.postVideoMergeCaption(
                videoUrl,
                assContent,
                taskId
            ),
            musicServerAPI.postMusicModifying(
                audioUrl,
                cuttingAreaStartSec,
                cuttingAreaEndSec,
                volumePercentage,
                taskId
            )
        ]);

        console.log(`[API Final] Caption prediction: ${captionPredictionId}`);
        console.log(`[API Final] Music prediction: ${musicPredictionId}`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Requested merging caption and modifying music successfully. caption: ${captionPredictionId}, music: ${musicPredictionId}}`,
        });

    } catch (error) {
        console.error('[API Final] Error:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}