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
            mixingGainDb,

            isMusicPreProcessed,
        }: FinalVideoMergeData = videoGenerationTask.final_video_merge_data;

        if (!isMusicPreProcessed && (cuttingAreaEndSec <= cuttingAreaStartSec)) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'cuttingAreaEndSec must be greater than cuttingAreaStartSec'
            });
        }

        // volumePercentage(%) 혹은 mixingGainDb(dB) 중 하나는 유효해야 함
        if ((volumePercentage < 0 || volumePercentage > 100) && (mixingGainDb === undefined)) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Invalid volume settings: volumePercentage or mixingGainDb required'
            });
        }

        const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.FINALIZING);

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        // --- 1. 씬별 속도 조절 및 비디오 결합 렌더링 선행 ---
        const isFinalVideoCreated = await videoServerAPI.postFinalVideo(taskId, videoGenerationTask);
        if (!isFinalVideoCreated) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to create final stitched video.'
            });
        }

        // --- 1.5 최종 배속 조절 반영하여 자막 및 씬 타임라인 재계산 및 DB 업데이트 ---
        let realTimeOffset = 0;
        let originalTimeOffset = 0;

        const sceneTimeOffsets = videoGenerationTask.scene_breakdown_list
            .sort((a, b) => a.sceneNumber - b.sceneNumber)
            .map((scene) => {
                const captionData = captionDataList.find(c => c.sceneNumber === scene.sceneNumber);
                const speed = captionData?.speedMultiplier ?? 1.0;
                const duration = scene.sceneDuration;

                const offsetInfo = {
                    sceneNumber: scene.sceneNumber,
                    originalStart: originalTimeOffset,
                    realStart: realTimeOffset,
                    speed: speed,
                };

                originalTimeOffset += duration;
                realTimeOffset += (duration / speed);

                return offsetInfo;
            });

        const adjustedCaptionDataList = captionDataList.map((caption) => {
            const offsetInfo = sceneTimeOffsets.find(o => o.sceneNumber === caption.sceneNumber);
            const speed = offsetInfo?.speed ?? 1.0;

            if (!offsetInfo) return caption;

            const adjustedSegments = caption.subtitleSegmentationList.map((seg) => {
                const relativeStart = seg.startSec - offsetInfo.originalStart;
                const relativeEnd = seg.endSec - offsetInfo.originalStart;

                const scaledStart = relativeStart / speed;
                const scaledEnd = relativeEnd / speed;

                return {
                    ...seg,
                    startSec: parseFloat((offsetInfo.realStart + scaledStart).toFixed(3)),
                    endSec: parseFloat((offsetInfo.realStart + scaledEnd).toFixed(3)),
                };
            });

            return {
                ...caption,
                startSec: parseFloat(offsetInfo.realStart.toFixed(3)),
                endSec: parseFloat((offsetInfo.realStart + (caption.endSec - caption.startSec) / speed).toFixed(3)),
                subtitleSegmentationList: adjustedSegments,
            };
        });

        const adjustedSceneBreakdownList = videoGenerationTask.scene_breakdown_list.map((scene) => {
            const captionData = captionDataList.find(c => c.sceneNumber === scene.sceneNumber);
            const speed = captionData?.speedMultiplier ?? 1.0;
            return {
                ...scene,
                sceneDuration: parseFloat((scene.sceneDuration / speed).toFixed(3)),
                speedMultiplier: speed,
            };
        });

        // Supabase DB에 최종 배속이 완료된 자막과 씬 리스트 저장 (데이터 정합성 보존)
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            final_video_merge_data: {
                ...videoGenerationTask.final_video_merge_data,
                captionDataList: adjustedCaptionDataList,
            },
            scene_breakdown_list: adjustedSceneBreakdownList,
        });

        // --- 2. 렌더링 완료된 비디오 및 오디오 URL 획득 ---
        const audioFilePath = isMusicPreProcessed
            ? `${taskId}/autopilot_cut_music.mp3`
            : `${taskId}/${taskId}_${musicIndex}.mp3`;

        const videoUrl = await videoServerAPI.getVideoSignedUrl(`${taskId}/${taskId}.mp4`, 60 * 60);
        const audioUrl = await musicServerAPI.getMusicSignedUrl(audioFilePath, 60 * 60);

        // --- 3. ASS 자막 생성 ---
        const assContent = generateASSContent(
            isCaptionEnabled,
            adjustedCaptionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
        );

        // --- 4. 총 영상 길이 (배속 적용) 계산 ---
        const videoDuration = adjustedSceneBreakdownList.reduce((acc, sceneData) => {
            return sceneData.sceneDuration + acc;
        }, 0);

        // 1. Caption 번인 2. Music 편집을 병렬 실행
        const [captionPredictionId, musicPredictionId] = await Promise.all([
            videoServerAPI.postVideoMergeCaption(
                videoUrl,
                assContent,
                taskId
            ),
            musicServerAPI.postMusicModifying(
                audioUrl,
                isMusicPreProcessed ? 0 : cuttingAreaStartSec,
                isMusicPreProcessed ? videoDuration : cuttingAreaEndSec,
                volumePercentage,
                taskId,
                mixingGainDb
            )
        ])

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