import {NextRequest, NextResponse} from 'next/server';
import {videoServerAPI} from '@/api/server/videoServerAPI';
import {musicServerAPI} from '@/api/server/musicServerAPI';
import {generateASSContent} from "@/utils/captionUtils";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {FinalVideoMergeData, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {taskCheckAndCleanupIfCancelled} from "@/app/api/video/process/taskCheckAndCleaupIfCancelled";

export async function POST(request: NextRequest) {
    try {
        // URL에서 파라미터 추출
        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get('taskId');

        if (!taskId) {
            return NextResponse.json(
                { error: 'Missing required query param: taskId' },
                { status: 400 }
            );
        }

        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            return NextResponse.json(
                { error: 'Missing required query param: generationTaskId' },
                { status: 404 }
            );
        }

        if (!videoGenerationTask.final_video_merge_data) {
            return NextResponse.json(
                { error: 'Missing required field of task: final_video_merge_data' },
                { status: 404 }
            );
        }


        // video, audio url 저장이 아닌 새로 받아오는 걸로 수정 (잘못하면 만료됨)
        const {
            // Caption 관련
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
            return NextResponse.json(
                {
                    success: false,
                    error: 'cuttingAreaEndSec must be greater than cuttingAreaStartSec'
                },
                { status: 400 }
            );
        }

        if (volumePercentage < 0 || volumePercentage > 100) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'volumePercentage must be between 0 and 100'
                },
                { status: 400 }
            );
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

        return NextResponse.json({
            success: true,
            captionPredictionId,
            musicPredictionId
        });

    } catch (error) {
        console.error('[API Final] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}