import { NextRequest } from 'next/server';
import { videoServerAPI } from '@/lib/api/server/videoServerAPI';
import { musicServerAPI } from '@/lib/api/server/musicServerAPI';
import { generateASSContent } from "@/lib/utils/captionUtils";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { FinalVideoMergeData } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

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

        if (!videoGenerationTask.final_video_merge_data) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Missing required field of task: final_video_merge_data'
            });
        }

        const {
            isCaptionEnabled,
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
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

        if ((volumePercentage < 0 || volumePercentage > 100) && (mixingGainDb === undefined)) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Invalid volume settings: volumePercentage or mixingGainDb required'
            });
        }

        // --- 1. 씬별 속도 조절 및 비디오 결합 렌더링 선행 ---
        const isFinalVideoCreated = await videoServerAPI.postFinalVideo(taskId, videoGenerationTask);
        if (!isFinalVideoCreated) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
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
                speedMultiplier: speed,
            };
        });

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            final_video_merge_data: {
                ...videoGenerationTask.final_video_merge_data,
                captionDataList: adjustedCaptionDataList,
            },
            scene_breakdown_list: adjustedSceneBreakdownList,
        });

        // --- 2. 렌더링 완료된 비디오 및 오디오 URL 획득 ---
        const userId = videoGenerationTask.user_id;
        const audioFilePath = isMusicPreProcessed
            ? `${userId}/${taskId}/autopilot_cut_music.mp3`
            : `${userId}/${taskId}/${taskId}_${musicIndex}.mp3`;

        const videoUrl = await videoServerAPI.getVideoSignedUrl(`${userId}/${taskId}/${taskId}.mp4`, 60 * 60);
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
            const speed = sceneData.sceneDuration ? (sceneData.speedMultiplier ?? 1.0) : 1.0;
            return (sceneData.sceneDuration / speed) + acc;
        }, 0);

        console.log(`==================================================`);
        console.log(`[TEST LOG][Final Process Route] 배속 반영 총 영상/음성 목표 길이 (videoDuration): ${videoDuration.toFixed(4)}s`);
        console.log(`[TEST LOG][Final Process Route] 음악 편집 구간: ${isMusicPreProcessed ? 0 : cuttingAreaStartSec}s ~ ${isMusicPreProcessed ? videoDuration : cuttingAreaEndSec}s (총 ${(isMusicPreProcessed ? videoDuration : (cuttingAreaEndSec - cuttingAreaStartSec)).toFixed(4)}s)`);
        console.log(`==================================================`);

        // Caption 번인 및 Music 편집을 병렬 실행
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
        ]);

        console.log(`[API Final Process] Caption prediction: ${captionPredictionId}`);
        console.log(`[API Final Process] Music prediction: ${musicPredictionId}`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Requested merging caption and modifying music successfully. caption: ${captionPredictionId}, music: ${musicPredictionId}`,
        });
    } catch (error) {
        console.error('[API Final Process] Error:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
