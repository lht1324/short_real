import {task} from "@trigger.dev/sdk/v3";
import {logger} from "@trigger.dev/sdk";
import {bundle} from "@remotion/bundler";
import {ensureBrowser, renderMedia, selectComposition} from "@remotion/renderer";
import {ALL_FORMATS, Input, UrlSource} from "mediabunny";
import {readFile, rm} from "fs/promises";
import os from "os";
import path from "path";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {musicServerAPI} from "@/lib/api/server/musicServerAPI";
import {voiceServerAPI} from "@/lib/api/server/voiceServerAPI";
import {videoServerAPI} from "@/lib/api/server/videoServerAPI";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {taskCheckAndCleanupIfCancelled} from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import {FinalVideoMergeData, VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {RemotionCaptionStyleConfig, RemotionFullVideoInput, RemotionSceneData} from "@/components/remotion/remotionTypes";
import {getFullVideoDurationInFrames} from "@/components/remotion/server/FullVideo";

const FINAL_FPS = 24;
const REMOTION_ENTRY_POINT = path.join(process.cwd(), "components", "remotion", "server", "index.ts");
const FINAL_VIDEO_BUCKET = "processed_video_storage";

export const renderFinalVideo = task({
    id: "render-final-video",
    maxDuration: 1800, // 30분 (Chrome 다운로드 + 1080x1920 24fps 렌더)

    // Chrome headless + Remotion 렌더를 위한 메모리 확보 (1vCPU / 1GB)
    machine: {
        preset: "small-2x",
    },

    retry: {
        maxAttempts: 3,
        minTimeoutInMs: 2000,
        maxTimeoutInMs: 30000,
        factor: 2,
        randomize: true,
    },

    // 메모리 제한 머신이라 동시 렌더는 1개로 제한
    queue: {
        concurrencyLimit: 1,
    },

    run: async (payload: {taskId: string}) => {
        const {taskId} = payload;
        const startedAt = Date.now();

        try {
            logger.info(`Task start: ${taskId}`);

            // ----------------------------------------------------------------
            // 1. DB 조회 및 검증
            // ----------------------------------------------------------------
            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
            if (!videoGenerationTask) {
                throw new Error("Task not found");
            }

            const cancelCheckResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
            if (cancelCheckResult) {
                throw new Error("Task cancelled or not in mergeable status");
            }

            const finalVideoMergeData = videoGenerationTask.final_video_merge_data as FinalVideoMergeData | null;
            if (!finalVideoMergeData) {
                throw new Error("Missing required field of task: final_video_merge_data");
            }

            const {
                isCaptionEnabled,
                captionDataList,
                captionConfigState,
                videoWidth,
                videoHeight,
                musicIndex,
                cuttingAreaStartSec,
                cuttingAreaEndSec,
                volumePercentage,
            } = finalVideoMergeData;

            if (captionDataList.length === 0) {
                throw new Error("captionDataList is empty");
            }

            const userId = videoGenerationTask.user_id;
            const sortedCaptionDataList = [...captionDataList].sort((a, b) => a.sceneNumber - b.sceneNumber);

            // ----------------------------------------------------------------
            // 2. 씬별 영상 URL 확보
            //    - 1.0배속 씬: 기존 파이프라인이 만들어 둔 1차 가공본(processed)을 1:1 재생.
            //      배율 연산 없이 재생하므로 프레임 스터터(드드득)가 발생하지 않는다.
            //    - 배속 변경 씬: raw에 1차(음성 맞춤) × 2차(유저 배속) 합성 배율을 인코딩으로
            //      반영(기존 postFinalVideo와 동일)한 뒤 1:1 재생. 실측/인코딩 비용은 배속 씬에만 발생.
            // ----------------------------------------------------------------
            const scenes: RemotionSceneData[] = await Promise.all(
                sortedCaptionDataList.map(async (captionData) => {
                    const sceneNumber = captionData.sceneNumber;
                    const speedMultiplier = captionData.speedMultiplier ?? 1.0;
                    const sceneDurationSec = captionData.endSec - captionData.startSec; // 1차 배속 후(=음성) 축 길이

                    let videoUrl: string;

                    if (speedMultiplier === 1.0) {
                        videoUrl = await videoServerAPI.getVideoSignedUrl(
                            `${userId}/${taskId}/video_processed_${sceneNumber}.mp4`,
                            3600,
                        );
                    } else {
                        const rawSignedUrl = await videoServerAPI.getVideoSignedUrl(
                            `${userId}/${taskId}/video_raw_${sceneNumber}.mp4`,
                            3600,
                        );

                        // 최종 목표 길이: sceneDurationSec / speedMultiplier (1차×2차 합성)
                        const finalTargetDuration = sceneDurationSec / speedMultiplier;
                        const processedResult = await videoServerAPI.postProcessedVideo(
                            rawSignedUrl,
                            finalTargetDuration,
                        );

                        if (!processedResult.success || !processedResult.processedVideoUrl) {
                            throw new Error(`Scene #${sceneNumber} video processing failed`);
                        }

                        videoUrl = processedResult.processedVideoUrl;
                    }

                    return {
                        sceneNumber: sceneNumber,
                        startSec: captionData.startSec,
                        endSec: captionData.endSec,
                        videoUrl: videoUrl,
                        voiceUrl: null,
                        speedMultiplier: speedMultiplier,
                        videoPlaybackRate: 1.0, // 배속/트림은 전부 인코딩에 반영되어 1:1 재생
                        videoTrimBeforeSec: 0, // 앞 0.2초 트림(-ss 0.2)도 인코딩에 반영됨
                    };
                }),
            );

            // ----------------------------------------------------------------
            // 3. 음성(voice_full) 실측 길이 측정 (trimAfter 계산용)
            // ----------------------------------------------------------------
            const voiceSignedUrl = await voiceServerAPI.getVoiceSignedUrl(taskId, userId);
            const voiceMediaInput = new Input({
                source: new UrlSource(voiceSignedUrl),
                formats: ALL_FORMATS,
            });
            const voiceDurationSec = await voiceMediaInput.computeDuration();

            // ----------------------------------------------------------------
            // 4. BGM 구성
            // ----------------------------------------------------------------
            let bgm: RemotionFullVideoInput["bgm"] = null;
            if (musicIndex !== -1) {
                const musicDataList = await musicServerAPI.getMusicData(taskId, userId);
                const musicData = musicDataList[musicIndex];

                if (musicData?.audioUrl && musicData.duration > 0) {
                    bgm = {
                        audioUrl: musicData.audioUrl,
                        startSec: cuttingAreaStartSec,
                        // BGM 축 기준 종료 지점 (음악 길이 초과 시 클램프)
                        endSec: Math.min(cuttingAreaEndSec, musicData.duration),
                        volume: Math.max(0, Math.min(1, volumePercentage / 100)),
                        durationSec: musicData.duration,
                    };
                }
            }

            // ----------------------------------------------------------------
            // 5. Remotion 입력 구성
            // ----------------------------------------------------------------
            const inputProps: RemotionFullVideoInput = {
                isCaptionEnabled: isCaptionEnabled,
                width: videoWidth,
                height: videoHeight,
                fps: FINAL_FPS,
                scenes: scenes,
                voiceUrl: voiceSignedUrl,
                voiceDurationSec: voiceDurationSec,
                captions: sortedCaptionDataList.map((captionData) => {
                    return {
                        sceneNumber: captionData.sceneNumber,
                        segments: captionData.subtitleSegmentationList,
                    };
                }),
                captionStyle: captionConfigState as RemotionCaptionStyleConfig,
                bgm: bgm,
            };

            // ----------------------------------------------------------------
            // 6. 번들 → 컴포지션 셀렉트 → 렌더
            // ----------------------------------------------------------------
            const serveUrl = await bundle(REMOTION_ENTRY_POINT, (progress) => {
                if (progress % 25 === 0) {
                    logger.info(`Bundle progress: ${progress}%`);
                }
            }, {
                // Remotion 웹팩은 tsconfig paths(@/)를 자동 해석하지 않으므로 직접 alias를 매핑
                webpackOverride: (config) => {
                    return {
                        ...config,
                        resolve: {
                            ...(config.resolve ?? {}),
                            alias: {
                                ...(config.resolve?.alias ?? {}),
                                '@': path.join(process.cwd()),
                            },
                        },
                    };
                },
            });

            const composition = await selectComposition({
                serveUrl: serveUrl,
                id: "FullVideo",
                inputProps: inputProps as unknown as Record<string, unknown>,
            });

            // 정적 등록값(durationInFrames=1, fps=30)을 실제 Input 기반으로 덮어쓴다
            composition.durationInFrames = getFullVideoDurationInFrames(inputProps);
            composition.fps = FINAL_FPS;
            composition.width = videoWidth;
            composition.height = videoHeight;

            logger.info(`Render start: ${composition.durationInFrames} frames @ ${FINAL_FPS}fps (${(composition.durationInFrames / FINAL_FPS).toFixed(2)}s)`);

            const outputLocation = path.join(os.tmpdir(), `${taskId}_final.mp4`);

            await ensureBrowser();

            await renderMedia({
                codec: "h264",
                composition: composition,
                serveUrl: serveUrl,
                inputProps: inputProps as unknown as Record<string, unknown>,
                outputLocation: outputLocation,
                overwrite: true,
                concurrency: 1,
                colorSpace: 'bt709',
                logLevel: "warn",
                onProgress: ({renderedFrames, encodedFrames}) => {
                    const totalFrames = composition.durationInFrames;
                    if (renderedFrames > 0 && totalFrames > 0 && (renderedFrames % 120 === 0 || renderedFrames === totalFrames)) {
                        logger.info(`Render progress: ${renderedFrames}/${totalFrames} frames rendered, ${encodedFrames} encoded`);
                    }
                },
            });

            // ----------------------------------------------------------------
            // 7. 최종 영상 업로드 (기존 웹훅과 동일 경로/이름)
            // ----------------------------------------------------------------
            const videoBuffer = await readFile(outputLocation);
            const finalFilePath = `${userId}/${taskId}/${taskId}_final.mp4`;

            const supabase = createSupabaseServiceRoleClient();
            const {error: uploadError} = await supabase.storage
                .from(FINAL_VIDEO_BUCKET)
                .upload(finalFilePath, videoBuffer, {
                    contentType: "video/mp4",
                    upsert: true,
                });

            if (uploadError) {
                throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
            }

            await rm(outputLocation, {force: true});

            await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.COMPLETED);

            const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
            logger.info(`Complete in ${elapsedSec}s: ${finalFilePath}`);

            return {
                success: true,
                taskId: taskId,
                filePath: finalFilePath,
                durationFrames: composition.durationInFrames,
                elapsedSec: parseFloat(elapsedSec),
            };
        } catch (error) {
            logger.error(`Task failed:`, {error});
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId).catch((patchError) => {
                logger.error(`Failed to update task status:`, {patchError});
            });
            throw error;
        }
    },
});
