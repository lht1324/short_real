import {
    SceneData,
    VideoGenerationTask,
} from '@/lib/api/types/supabase/VideoGenerationTasks';
import {
    VIDEO_RESOLUTIONS,
    VideoResolution
} from "@/lib/ReplicateData";
import Replicate from "replicate";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {ALL_FORMATS, Input, UrlSource} from "mediabunny";
import {fal} from "@fal-ai/client";

export const videoServerAPI = {
    // POST /videos - Scene별 image-to-video 생성 요청 제출
    async postVideo(
        sceneData: SceneData,
        taskId: string,
        isViolence: boolean = false,
        aspectRatio: "16:9" | "9:16" | "1:1" | "21:9" | "4:3" | "3:4" | "auto" = "9:16",
        videoResolution: VideoResolution = VIDEO_RESOLUTIONS.RES_1080P, // nP란 가로세로 중 짧은 쪽의 비율을 따라감
    ) {
        const supabase = createSupabaseServiceRoleClient();
        const falAIClient = fal;
        falAIClient.config({
            credentials: process.env.FAL_AI_API_KEY!
        })

        // ---- [추가] 웹훅 URL 환경 변수 확인 ----
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('base url is invalid.');
        }

        // ---- [추가] generationTaskId를 포함한 동적 웹훅 URL 생성 ----
        const webhookUrlObject = new URL(`${baseUrl}/webhook/fal-ai/video`);
        webhookUrlObject.searchParams.set("taskId", taskId);
        webhookUrlObject.searchParams.set("isRetriedByViolence", isViolence ? 'true' : 'false');
        const webhookUrl = webhookUrlObject.toString();

        // Signed URL 생성 (1시간 유효)
        const { data, error } = await supabase.storage
            .from('scene_image_temp_storage')
            .createSignedUrl(`${taskId}/${sceneData.sceneNumber}.jpeg`, 60 * 60 * 24);

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `Scene ${sceneData.sceneNumber}: 이미지 데이터가 없습니다.`);
        }
        const imageUrl = data.signedUrl;

        const baseInputData = {
            image_url: imageUrl,
            aspect_ratio: aspectRatio,
            camera_fixed: false,
            enable_safety_checker: false,
        }

        const safeDuration = sceneData.sceneDuration + 0.2 < 4.2
            ? 4
            : sceneData.sceneDuration + 0.2 > 12.2
                ? 12
                : Math.round(sceneData.sceneDuration + 0.2);
        const inputData = {
            ...baseInputData,
            prompt: sceneData.videoGenPrompt ?? "A cinematic video",
            duration: safeDuration.toString() as "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12", // 4-12
            resolution: videoResolution as "480p" | "720p" | "1080p",
            generate_audio: false,
        }

        const { request_id: requestId } = await falAIClient.queue.submit('fal-ai/bytedance/seedance/v1.5/pro/image-to-video', {
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

            const processedVideoUrl = await replicate.run(
                'lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339',
                {
                    input: {
                        video_urls: JSON.stringify([replicateVideoUrl]),
                        ffmpeg_args: ffmpegArgs,
                    }
                }
            )

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
        taskId: string
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
            const captionVideoPath = `${taskId}/${taskId}_caption_added.mp4`;
            const { data: captionVideoData, error: captionVideoError } = await supabase.storage
                .from('processed_video_storage')
                .createSignedUrl(captionVideoPath, 86400);

            if (captionVideoError || !captionVideoData?.signedUrl) {
                console.error(`[Video-Music Merge] Caption 영상 URL 생성 실패:`, captionVideoError);
                throw new Error(`Caption 영상 Signed URL 생성 실패: ${captionVideoError?.message}`);
            }
            console.log(`[Video-Music Merge] Caption 영상 URL 생성 완료`);

            console.log(`[Video-Music Merge] 음악 Signed URL 생성 시작`);
            const modifiedMusicPath = `${taskId}/${taskId}_processed_audio.mp3`;
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

            // 3. Replicate로 영상에 음악 병합 요청
            console.log(`[Video-Music Merge] Replicate prediction 생성 시작`);
            const prediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-merge-video-audio:a3d58bc87983f123a8eb63cd3d6ab516bd92e0504ab5e7d830395dcd2663f735",
                input: {
                    video_url: captionVideoUrl,
                    audio_url: modifiedMusicUrl,
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

    async postFinalVideo(generationTaskId: string, videoGenerationTask: VideoGenerationTask) {
        const supabase = createSupabaseServiceRoleClient();
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        try {
            // 1. 필요한 데이터 조회 (영상 리스트, 음성 URL)
            console.log(`[Merge Service] 음성 파일 URL 조회`);
            const { data: audioData, error: audioError } = await supabase.storage
                .from('narration_voice_storage')
                .createSignedUrl(`${generationTaskId}.mp3`, 3600);

            if (!audioData || !audioData?.signedUrl || audioError) {
                throw new Error(audioError?.message || "Voice audio file not found.");
            }

            const audioUrl = audioData.signedUrl;

            // 2. 처리된 영상 클립들의 URL 수집 (순서대로 정렬)
            const sortedSceneDataList = videoGenerationTask.scene_breakdown_list
                .sort((a, b) => a.sceneNumber - b.sceneNumber);

            // Supabase Storage에서 처리된 영상 클립들의 URL 생성 (Signed URL 사용)
            const getSignedUrlPromises = sortedSceneDataList.map(async (sceneData) => {
                // Supabase Storage에 저장된 처리된 영상의 경로 구성
                const filePath = `${generationTaskId}/${sceneData.requestId}.mp4`;

                // Signed URL 생성 (1시간 유효)
                const { data, error } = await supabase.storage
                    .from('processed_video_storage')
                    .createSignedUrl(filePath, 3600);

                if (error || !data?.signedUrl) {
                    throw new Error(`Scene #${sceneData.sceneNumber} signed URL 생성 실패: ${JSON.stringify(error)}`)
                }
                return data.signedUrl;
            });
            const processedVideoSignedUrlList = await Promise.all(getSignedUrlPromises);

            const videoMergeInput = {
                audio_url: audioUrl,
                video_urls: JSON.stringify(processedVideoSignedUrlList),
                ffmpeg_args: "-c:v libx264 -preset fast -crf 12 -c:a aac",
            }
            const finalVideoUrl = await replicate.run(
                "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                {
                    input: videoMergeInput,
                },
            )

            console.log(`[Merge Service] 최종 영상 병합 완료`);

            // 5.5. Fal AI에서 최종 병합된 영상을 다운로드하여 Supabase Storage에 업로드
            const finalVideoResponse = await fetch(finalVideoUrl.toString());

            if (!finalVideoResponse.ok) {
                throw new Error(`최종 영상 다운로드 실패: ${finalVideoResponse.statusText}`);
            }

            const finalVideoBuffer = await finalVideoResponse.arrayBuffer();
            const finalFilePath = `${generationTaskId}/${generationTaskId}.mp4`;

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
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(generationTaskId, {
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