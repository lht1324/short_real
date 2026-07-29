import {
    SceneData,
    VideoGenerationTask,
} from '@/lib/api/types/supabase/VideoGenerationTasks';
import Replicate from "replicate";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {ALL_FORMATS, Input, UrlSource} from "mediabunny";
import {fal} from "@fal-ai/client";
import {cryptoUtils} from "@/lib/utils/cryptoUtils";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {falAIInputMapper} from "@/lib/falAIInputMapper";
import {voiceServerAPI} from "@/lib/api/server/voiceServerAPI";

export const videoServerAPI = {
    // POST /videos - Scene별 image-to-video 생성 요청 제출
    async postVideo(
        sceneData: SceneData,
        taskId: string,
        userId: string,
        videoAIModelData: AIModelData,
        falAiApiKey: string,
        aspectRatio: "16:9" | "9:16",
        resolution: '720p' | '1080p' | '2160p', // nP란 가로세로 중 짧은 쪽의 비율을 따라감
        isViolence: boolean = false,
        isRegenerate: boolean = false,
    ) {
        const supabase = createSupabaseServiceRoleClient();
        const decryptedApiKey = cryptoUtils.decrypt(falAiApiKey, userId);

        const falAIClient = fal;
        falAIClient.config({
            credentials: decryptedApiKey
        });

        // ---- [추가] 웹훅 URL 환경 변수 확인 ----
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('base url is invalid.');
        }

        // ---- [추가] generationTaskId를 포함한 동적 웹훅 URL 생성 ----
        const webhookUrlObject = new URL(`${baseUrl}/webhook/fal-ai/video`);
        webhookUrlObject.searchParams.set("taskId", taskId);
        webhookUrlObject.searchParams.set("isRetriedByViolence", isViolence ? 'true' : 'false');
        if (isRegenerate) {
            webhookUrlObject.searchParams.set("isRegenerate", "true");
            webhookUrlObject.searchParams.set("sceneNumber", sceneData.sceneNumber.toString());
        }
        const webhookUrl = webhookUrlObject.toString();

        // Signed URL 생성 (1시간 유효)
        const { data, error } = await supabase.storage
            .from('scene_image_temp_storage')
            .createSignedUrl(`${userId}/${taskId}/${sceneData.sceneNumber}.jpeg`, 60 * 60 * 24);

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `Scene ${sceneData.sceneNumber}: 이미지 데이터가 없습니다.`);
        }
        const imageUrl = data.signedUrl;

        const videoAIModelEndpointId = videoAIModelData.endpoint_id;
        const videoAIModelSupportedDurations = videoAIModelData.supported_duration_range ?? [];

        const targetDuration = sceneData.sceneDuration + 0.2;
        let safeDuration = Math.round(targetDuration);

        if (videoAIModelSupportedDurations.length > 0) {
            const sortedDurations = [...videoAIModelSupportedDurations].sort((a, b) => a - b);
            const coveringDuration = sortedDurations.find(d => d >= targetDuration);
            
            if (coveringDuration !== undefined) {
                safeDuration = coveringDuration;
            } else {
                safeDuration = sortedDurations[sortedDurations.length - 1];
            }
        } else {
            throw Error("AI Model Data is wrong.");
        }

        const inputData = falAIInputMapper.buildVideoInput(videoAIModelEndpointId, {
            prompt: sceneData.videoGenPrompt ?? "A cinematic video",
            imageUrl: imageUrl,
            duration: safeDuration,
            aspectRatio: aspectRatio,
            resolution: resolution,
        });

        const { request_id: requestId } = await falAIClient.queue.submit(videoAIModelEndpointId, {
            input: inputData,
            webhookUrl: webhookUrl,
        });

        return requestId;
    },

    /**
     * Replicate 원본 영상을 다운로드하여 목표 길이에 맞게 속도를 조절하고,
     * Supabase Storage에 업로드한 뒤 최종 URL을 반환합니다.
     * @param replicateVideoUrl - Replicate에서 받은 원본 영상 URL
     * @param targetDuration - 목표 영상 길이 (초)
     */
    async postProcessedVideo(
        replicateVideoUrl: string,
        targetDuration: number,
    ): Promise<{
        success: boolean,
        processedVideoUrl?: string,
    }> {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        try {
            // 1. MediaBunny를 사용해 영상 정보 확인 (실제 생성된 길이 측정)
            const mediaBunnyInput = new Input({
                source: new UrlSource(replicateVideoUrl),
                formats: ALL_FORMATS,
            });

            let ffmpegArgs: string;
            const totalNeeded = targetDuration + 0.2;
            const generatedVideoDuration = await mediaBunnyInput.computeDuration();

            // 조건 1: 4.0초 미만은 무조건 4초가 나오니까 넉넉함 (기존 로직)
            // 조건 2: 반올림 결과가 원본보다 크면(X.5 이상), 넉넉함 (제안하신 로직)
            const isCutting = (totalNeeded <= 4.0) || (generatedVideoDuration >= totalNeeded);

            // 결국 반올림해서 생성된 건데, 빠른 배속 걸어줘야 하는 경우엔 잘라주는 게 맞는 건가?
            // videoGenPrompt도 봐야 한다
            if (isCutting) {
                // [Case 1] 자르기 모드 (Target <= 3.8s)
                // 4초 이상의 영상에서 앞부분 0.2초를 버리고, 거기서부터 Target만큼만 씀.
                // 배율 변화 없음. 화질 손상 없음.
                ffmpegArgs = `-ss 0.2 -t ${targetDuration} -c:v libx264 -c:a copy`;
            } else {
                // [Case 2] 배율 모드 (Target >= 3.9s)
                const generatedVideoDuration = await mediaBunnyInput.computeDuration();

                // 2. 가용 길이 계산 (실제 길이 - 앞부분 0.2초)
                const availableDuration = generatedVideoDuration - 0.2;

                // 3. 속도 배율 계산 (소수점 6자리로 제한)
                // ptsRatio = 목표 / 가용 -> 이 값이 1보다 크면 영상이 느려짐(Slow), 작으면 빨라짐(Fast)
                const videoPtsRatio = (targetDuration / availableDuration).toFixed(6);

                // 명령어: 0.2초 스킵 + 배율 적용
                ffmpegArgs = `-ss 0.2 -filter:v "setpts=${videoPtsRatio}*PTS" -c:v libx264 -c:a copy`;
            }

            const prediction = await replicate.predictions.create({
                version: 'lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339',
                input: {
                    video_urls: JSON.stringify([replicateVideoUrl]),
                    ffmpeg_args: ffmpegArgs,
                }
            });
            const completedPrediction = await replicate.wait(prediction);
            const processedVideoUrl = completedPrediction.output;

            return {
                success: true,
                processedVideoUrl: processedVideoUrl.toString(),
            };
        } catch (error) {
            console.error("영상 처리 중 에러 발생:", error);
            return {
                success: false,
            };
        }
    },

    async postVideoMergeCaption(
        videoUrl: string,
        assContent: string,
        taskId: string,
    ) {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        // 웹훅 URL 생성
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('BASE_URL is not set');
        }

        const webhookUrl = `${baseUrl}/webhook/replicate/video/merge/caption?taskId=${taskId}`;

        try {
            const prediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-caption-burner:8baa73455e00995485ad5e8e62077c04fc3a4f9ece3096911e1bc100427cda33",
                input: {
                    video_url: videoUrl,
                    ass_content: assContent,
                },
                webhook: webhookUrl,
                webhook_events_filter: ["completed"],
            });

            if (prediction.error || prediction.status === "failed") {
                throw new Error(`Subtitle burn-in failed: ${prediction.error}`);
            }

            console.log(`[Subtitle Burn-in] Prediction ID: ${prediction.id}`);
            return prediction.id;

        } catch (error) {
            console.error("[Subtitle Burn-in] Error:", error);
            throw error;
        }
    },

    async postVideoMergeMusic(
        taskId: string,
        userId: string,
    ) {
        const supabase = createSupabaseServiceRoleClient();
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        // 웹훅 URL 생성
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('BASE_URL is not set');
        }

        const webhookUrl = `${baseUrl}/webhook/replicate/video/merge/music?taskId=${taskId}`;
        console.log(`[Video-Music Merge] Webhook URL: ${webhookUrl}`);

        try {
            console.log(`[Video-Music Merge] Task 데이터 조회 시작: ${taskId}`);

            // 1. Task 데이터 조회
            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
            if (!videoGenerationTask) {
                console.error(`[Video-Music Merge] Task를 찾을 수 없음: ${taskId}`);
                throw new Error("Task not found.");
            }
            console.log(`[Video-Music Merge] Task 조회 완료`);

            // 2. Supabase Storage에서 Signed URL 생성
            console.log(`[Video-Music Merge] Caption 영상 Signed URL 생성 시작`);
            const captionVideoPath = `${userId}/${taskId}/${taskId}_caption_added.mp4`;
            const { data: captionVideoData, error: captionVideoError } = await supabase.storage
                .from('processed_video_storage')
                .createSignedUrl(captionVideoPath, 86400);

            if (captionVideoError || !captionVideoData?.signedUrl) {
                console.error(`[Video-Music Merge] Caption 영상 URL 생성 실패:`, captionVideoError);
                throw new Error(`Caption 영상 Signed URL 생성 실패: ${captionVideoError?.message}`);
            }
            console.log(`[Video-Music Merge] Caption 영상 URL 생성 완료`);

            console.log(`[Video-Music Merge] 음악 Signed URL 생성 시작`);
            const modifiedMusicPath = `${userId}/${taskId}/${taskId}_processed_audio.mp3`;
            const { data: modifiedMusicData, error: modifiedMusicError } = await supabase.storage
                .from('video_music_temp_storage')
                .createSignedUrl(modifiedMusicPath, 86400);

            if (modifiedMusicError || !modifiedMusicData?.signedUrl) {
                console.error(`[Video-Music Merge] 음악 URL 생성 실패:`, modifiedMusicError);
                throw new Error(`음악 Signed URL 생성 실패: ${modifiedMusicError?.message}`);
            }
            console.log(`[Video-Music Merge] 음악 URL 생성 완료`);

            const captionVideoUrl = captionVideoData.signedUrl;
            const modifiedMusicUrl = modifiedMusicData.signedUrl;

            console.log(`[Video-Music Merge] Caption Video URL: ${captionVideoUrl}`);
            console.log(`[Video-Music Merge] Modified Music URL: ${modifiedMusicUrl}`);

            // 3. Replicate로 영상에 음악 병합 요청 (amix duration=longest로 배경음악을 비디오 끝까지 유지)
            console.log(`[Video-Music Merge] Replicate prediction 생성 시작`);
            const prediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                input: {
                    video_urls: JSON.stringify([captionVideoUrl]),
                    audio_url: modifiedMusicUrl,
                    ffmpeg_args: `-filter_complex "[0:a][1:a]amix=inputs=2:duration=longest[aout]" -map 0:v -map "[aout]" -c:v copy -c:a aac`,
                    output_extension: "mp4"
                },
                webhook: webhookUrl,
                webhook_events_filter: ["completed"],
            });

            console.log(`[Video-Music Merge] Prediction 생성 응답:`, prediction);

            if (prediction.error || prediction.status === "failed") {
                console.error(`[Video-Music Merge] Prediction 생성 실패:`, prediction.error);
                throw new Error(`Video-Music merge failed: ${prediction.error}`);
            }

            console.log(`[Video-Music Merge] Prediction ID: ${prediction.id}, Status: ${prediction.status}`);
            return prediction.id;

        } catch (error) {
            console.error(`[Video-Music Merge] 병합 중 에러:`, error);

            // 실패 시 Task 상태 'failed'로 업데이트
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                is_generation_failed: true,
            });

            throw error;
        }
    },

    async postFinalVideo(taskId: string, videoGenerationTask: VideoGenerationTask) {
        const supabase = createSupabaseServiceRoleClient();
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        try {
            console.log(`[Merge Service] 최종 영상 병합 시작 (분할 병렬 렌더링)`);

            const userId = videoGenerationTask.user_id;
            const captionDataList = videoGenerationTask.final_video_merge_data?.captionDataList ?? [];
            const sortedSceneDataList = videoGenerationTask.scene_breakdown_list
                .sort((a, b) => a.sceneNumber - b.sceneNumber);

            // [안전장치] DB에 오염된 데이터가 존재하더라도 자막 타임스탬프를 기반으로 1.0배속 순수 원본 sceneDuration을 안전하게 정화
            const sanitizedSceneDataList = sortedSceneDataList.map((sceneData, index, array) => {
                const subtitleSegments = sceneData.sceneSubtitleSegments ?? [];
                let pureOriginalDuration: number;

                if (subtitleSegments.length > 0) {
                    const isLastScene = index === array.length - 1;
                    if (isLastScene) {
                        pureOriginalDuration = subtitleSegments[subtitleSegments.length - 1].endSec - subtitleSegments[0].startSec + 0.75;
                    } else {
                        const nextSubtitleList = array[index + 1]?.sceneSubtitleSegments ?? [];
                        if (nextSubtitleList.length > 0) {
                            pureOriginalDuration = nextSubtitleList[0].startSec - subtitleSegments[0].startSec;
                        } else {
                            pureOriginalDuration = sceneData.sceneDuration;
                        }
                    }
                } else {
                    pureOriginalDuration = sceneData.sceneDuration;
                }

                return {
                    ...sceneData,
                    sceneDuration: pureOriginalDuration,
                };
            });

            // atempo 체인링 헬퍼
            const getAtempoFilterString = (speed: number) => {
                let filters = [];
                let currentSpeed = speed;
                while (currentSpeed > 2.0) {
                    filters.push("atempo=2.0");
                    currentSpeed /= 2.0;
                }
                while (currentSpeed < 0.5) {
                    filters.push("atempo=0.5");
                    currentSpeed /= 0.5;
                }
                if (currentSpeed !== 1.0) {
                    filters.push(`atempo=${currentSpeed.toFixed(4)}`);
                }
                return filters.join(",");
            };

            // Step 1. 씬별 비디오 조각 배속 렌더링 (무음 비디오 조각 생성)
            console.log(`[Merge Service] Step 1: 씬별 무음 비디오 조각 렌더링 시작 (${sanitizedSceneDataList.length}개)`);
            const step1Promises = sanitizedSceneDataList.map(async (sceneData) => {
                const sceneNumber = sceneData.sceneNumber;
                const captionData = captionDataList.find(c => c.sceneNumber === sceneNumber);
                const speedMultiplier = captionData?.speedMultiplier ?? 1.0;

                let videoUrl = "";
                let ffmpegArgs = "";

                if (speedMultiplier === 1.0) {
                    // 배속이 1.0이면 가공본(processed) 사용 (비디오만 추출)
                    videoUrl = await this.getVideoSignedUrl(`${userId}/${taskId}/video_processed_${sceneNumber}.mp4`, 3600);
                    ffmpegArgs = "-an -c:v libx264 -pix_fmt yuv420p -bf 0 -flags +cgop";
                    console.log(`[TEST LOG][Scene #${sceneNumber} Video] 1.0x speed -> originalDuration: ${sceneData.sceneDuration.toFixed(4)}s, targetDuration: ${sceneData.sceneDuration.toFixed(4)}s`);
                } else {
                    // 배속이 변경되었으면 원본(raw) 사용 및 MediaBunny 실측 기반 곱연산 인코딩 1회
                    videoUrl = await this.getVideoSignedUrl(`${userId}/${taskId}/video_raw_${sceneNumber}.mp4`, 3600);
                    
                    const sceneDuration = sceneData.sceneDuration; // 1.0배속 순수 원본 목표 길이
                    const finalTargetDuration = sceneDuration / speedMultiplier; // 2차 배속 최종 목표 길이

                    // 1. MediaBunny를 사용해 raw 영상 정보 실측 (실제 생성된 물리적 길이 측정)
                    const mediaBunnyInput = new Input({
                        source: new UrlSource(videoUrl),
                        formats: ALL_FORMATS,
                    });
                    const generatedVideoDuration = await mediaBunnyInput.computeDuration();
                    const availableDuration = generatedVideoDuration - 0.2; // 앞 0.2초 트림 후 실측 가용 영상 길이

                    const totalNeeded = finalTargetDuration + 0.2;
                    const isCutting = (totalNeeded <= 4.0) || (generatedVideoDuration >= totalNeeded);

                    if (isCutting) {
                        ffmpegArgs = `-ss 0.2 -t ${finalTargetDuration.toFixed(4)} -an -c:v libx264 -pix_fmt yuv420p -bf 0 -flags +cgop`;
                        console.log(`[TEST LOG][Scene #${sceneNumber} Video] speed: ${speedMultiplier}x (isCutting) -> targetDuration: ${finalTargetDuration.toFixed(4)}s, generatedVideoDuration: ${generatedVideoDuration.toFixed(4)}s`);
                    } else {
                        const videoPtsRatio = (finalTargetDuration / availableDuration).toFixed(6);
                        ffmpegArgs = `-ss 0.2 -filter:v "setpts=${videoPtsRatio}*PTS" -an -c:v libx264 -pix_fmt yuv420p -bf 0 -flags +cgop`;
                        console.log(`[TEST LOG][Scene #${sceneNumber} Video] speed: ${speedMultiplier}x (PTS scaling) -> targetDuration: ${finalTargetDuration.toFixed(4)}s, generatedVideoDuration: ${generatedVideoDuration.toFixed(4)}s, availableDuration: ${availableDuration.toFixed(4)}s, videoPtsRatio: ${videoPtsRatio}`);
                    }
                }

                // Replicate 샌드박스로 씬 비디오 조각 굽기
                const prediction = await replicate.predictions.create({
                    version: "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                    input: {
                        video_urls: JSON.stringify([videoUrl]),
                        ffmpeg_args: ffmpegArgs,
                        output_extension: "mp4"
                    }
                });
                const completedPrediction = await replicate.wait(prediction);
                const processedSceneUrl = completedPrediction.output;
                
                if (!processedSceneUrl) {
                    throw new Error(`Scene #${sceneNumber} 비디오 렌더링 실패`);
                }
                
                return processedSceneUrl.toString();
            });

            const mergedSceneUrlList = await Promise.all(step1Promises);
            console.log(`[Merge Service] Step 1: 씬별 무음 비디오 렌더링 완료 (${mergedSceneUrlList.length}개)`);

            // Step 2. 무음 비디오 조각 모음 (Stitching)
            console.log(`[Merge Service] Step 2: 무음 비디오 조각 모음 시작`);
            const stitchedPrediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                input: {
                    video_urls: JSON.stringify(mergedSceneUrlList),
                    ffmpeg_args: "-c:v libx264 -pix_fmt yuv420p -bf 0 -flags +cgop -an",
                },
            });
            const completedStitchedPrediction = await replicate.wait(stitchedPrediction);
            const stitchedVideoUrl = completedStitchedPrediction.output;

            if (!stitchedVideoUrl) {
                throw new Error("Stitched video creation failed.");
            }

            // Step 3. 통짜 원본 오디오(voice_full.mp3) 1개로 단 1회 filter_complex 구간 배속 인코딩 및 비디오 믹싱
            console.log(`[Merge Service] Step 3: 통짜 오디오 기반 1회 filter_complex 배속 믹싱 시작`);
            const fullVoiceSignedUrl = await voiceServerAPI.getVoiceSignedUrl(taskId, userId);

            let filterSegments: string[] = [];
            let concatInputs: string[] = [];

            sanitizedSceneDataList.forEach((sceneData, index) => {
                const sceneNumber = sceneData.sceneNumber;
                const captionData = captionDataList.find(c => c.sceneNumber === sceneNumber);
                const speedMultiplier = captionData?.speedMultiplier ?? 1.0;
                const subtitleSegments = sceneData.sceneSubtitleSegments ?? [];

                const startSec = subtitleSegments[0]?.startSec ?? 0;
                const duration = sceneData.sceneDuration;
                const endSec = startSec + duration;

                const atempoFilter = getAtempoFilterString(speedMultiplier);

                filterSegments.push(`[1:a]atrim=start=${startSec.toFixed(4)}:end=${endSec.toFixed(4)},asetpts=PTS-STARTPTS,${atempoFilter}[a${index}]`);
                concatInputs.push(`[a${index}]`);
                console.log(`[TEST LOG][Scene #${sceneNumber} Voice] trim range: ${startSec.toFixed(4)}s ~ ${endSec.toFixed(4)}s (duration: ${duration.toFixed(4)}s), speed: ${speedMultiplier}x -> scaledDuration: ${(duration / speedMultiplier).toFixed(4)}s`);
            });

            const filterComplexStr = `${filterSegments.join("; ")}; ${concatInputs.join("")}concat=n=${sanitizedSceneDataList.length}:v=0:a=1[aout]`;
            console.log(`[TEST LOG][Voice FilterComplex] ${filterComplexStr}`);

            const finalPrediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                input: {
                    video_urls: JSON.stringify([stitchedVideoUrl.toString()]),
                    audio_url: fullVoiceSignedUrl,
                    ffmpeg_args: `-filter_complex "${filterComplexStr}" -map 0:v -map "[aout]" -c:v libx264 -pix_fmt yuv420p -bf 0 -flags +cgop -c:a aac`,
                    output_extension: "mp4"
                }
            });
            const completedFinalPrediction = await replicate.wait(finalPrediction);
            const finalVideoUrl = completedFinalPrediction.output;

            if (!finalVideoUrl) {
                throw new Error("Final video-audio mixing failed.");
            }

            console.log(`[Merge Service] 최종 영상 병합 완료`);

            // 5.5. Fal AI에서 최종 병합된 영상을 다운로드하여 Supabase Storage에 업로드
            const finalVideoResponse = await fetch(finalVideoUrl.toString());

            if (!finalVideoResponse.ok) {
                throw new Error(`최종 영상 다운로드 실패: ${finalVideoResponse.statusText}`);
            }

            const finalVideoBuffer = await finalVideoResponse.arrayBuffer();
            const finalFilePath = `${userId}/${taskId}/${taskId}.mp4`;

            // Supabase Storage에 최종 영상 업로드
            const { error: uploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(finalFilePath, finalVideoBuffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`최종 영상 Supabase Storage 업로드 실패: ${uploadError.message}`);
            }

            return true;
        } catch (error) {
            console.error(`[Merge Service] 최종 영상 병합 중 에러:`, error);
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                is_generation_failed: true,
            })
            return false;
        }
    },

    async getVideoSignedUrl(filePath: string, expiresIn: number = 60 * 60 * 24, fileName?: string) {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase.storage
            .from('processed_video_storage')
            .createSignedUrl(filePath, expiresIn, {
                download: fileName ?? true,
            });

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `There is no video data.`);
        }

        return data.signedUrl;
    }
}