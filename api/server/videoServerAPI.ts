import {
    SceneData,
    SceneGenerationStatus,
    VideoGenerationTask,
} from '@/api/types/supabase/VideoGenerationTasks';
import {
    VIDEO_ASPECT_RATIOS,
    VIDEO_GENERATION_STATUS,
    VIDEO_RESOLUTIONS,
    VideoAspectRatio,
    VideoResolution
} from "@/lib/ReplicateData";
import Replicate from "replicate";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {ALL_FORMATS, Input, UrlSource} from "mediabunny";
import {FalAIClient} from "@/lib/fal-ai/FalAIClient";
import {FalAIService} from "@/lib/fal-ai/FalAIService";

export const videoServerAPI = {
    // POST /videos - Scene별 image-to-video 생성 요청 제출
    async postVideo(
        sceneData: SceneData,
        taskId: string,
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16,
        videoResolution: VideoResolution = VIDEO_RESOLUTIONS.RES_720P, // nP란 가로세로 중 짧은 쪽의 비율을 따라감
    ) {
        const supabase = createSupabaseServiceRoleClient();
        const replicate = new Replicate();

        // ---- [추가] 웹훅 URL 환경 변수 확인 ----
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('base url is invalid.');
        }

        // ---- [추가] generationTaskId를 포함한 동적 웹훅 URL 생성 ----
        const webhookUrl = `${baseUrl}/webhook/replicate/video?taskId=${taskId}`;

        // Signed URL 생성 (1시간 유효)
        const { data, error } = await supabase.storage
            .from('scene_image_temp_storage')
            .createSignedUrl(`${taskId}/${sceneData.sceneNumber}.jpeg`, 60 * 60 * 24);

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `Scene ${sceneData.sceneNumber}: 이미지 데이터가 없습니다.`);
        }
        const imageUrl = data.signedUrl;

        const roundedDuration = Math.round(sceneData.sceneDuration);
        const safeRoundedDuration = roundedDuration < 2
            ? 2
            : roundedDuration > 12
                ? 12
                : roundedDuration;

        const inputData = {
            image: imageUrl,
            fps: 24,
            prompt: sceneData.videoGenPrompt ?? "A cinematic video",
            duration: safeRoundedDuration, // 2-12
            resolution: videoResolution as "480p" | "720p" | "1080p",
            aspect_ratio: aspectRatio,
            camera_fixed: false,
        }

        const prediction = await replicate.predictions.create({
            version: "bytedance/seedance-1-pro-fast",
            input: inputData,
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
        })

        if (prediction.error || prediction.status === (VIDEO_GENERATION_STATUS.FAILED || VIDEO_GENERATION_STATUS.CANCELED)) {
            throw Error(`Scene ${sceneData.sceneNumber}: ${prediction.error || prediction.status}`);
        }

        return prediction.id;
    },

    /**
     * Replicate 원본 영상을 다운로드하여 목표 길이에 맞게 속도를 조절하고,
     * Supabase Storage에 업로드한 뒤 최종 URL을 반환합니다.
     * @param replicateVideoUrl - Replicate에서 받은 원본 영상 URL
     * @param targetDuration - 목표 영상 길이 (초)
     * @param taskId - 작업 Row ID
     * @param requestId - 영상 생성 요청 ID
     */
    async postProcessedVideo(
        replicateVideoUrl: string,
        targetDuration: number,
        taskId: string,
        requestId: string,
    ): Promise<{
        success: boolean,
        predictionId?: string,
    }> {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        try {
            // 1. MediaBunny를 사용해 영상 정보 확인
            const mediaBunnyInput = new Input({
                source: new UrlSource(replicateVideoUrl),
                formats: ALL_FORMATS,
            });

            const actualDuration = await mediaBunnyInput.computeDuration();

            // 2. 속도 배율 계산 (소수점 6자리로 제한)
            const videoPtsRatio = parseFloat((targetDuration / actualDuration).toFixed(6));

            const webhookUrl = `${process.env.BASE_URL!}/webhook/replicate/video/speed?taskId=${taskId}&requestId=${requestId}`
            const prediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-video-speed-modifier:2a804bdac8858f5d67e47360210214e5d97e6f572cb3621299b03dfe5a6555f0",
                input: {
                    video: replicateVideoUrl,
                    pts_ratio: videoPtsRatio,
                },
                webhook: webhookUrl,
                webhook_events_filter: ["completed"],
            });

            return {
                success: true,
                predictionId: prediction.id
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
        const falAIClient = new FalAIClient();
        const falAIService = new FalAIService(falAIClient);

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
                    throw new Error(`Scene #${sceneData.sceneNumber} signed URL 생성 실패: ${error?.message}`)
                }
                return data.signedUrl;
            });
            const processedVideoSignedUrlList = await Promise.all(getSignedUrlPromises);

            const mergeVideosRequest = {
                video_urls: processedVideoSignedUrlList,
                target_fps: 24,
                image_size: 'portrait_16_9' as ("portrait_16_9" | "square_hd" | "square" | "portrait_4_3" | "landscape_4_3" | "landscape_16_9" | {
                    width: number;
                    height: number;
                } | undefined),
            }
            const mergeVideosResponse = await falAIService.mergeVideos(mergeVideosRequest);
            const mergeVideoResult = mergeVideosResponse.data;

            const mergeVideoAndAudioRequest = {
                video_url: mergeVideoResult.video.url,
                audio_url: audioUrl,
                start_offset: 0,
            }
            const mergeVideoAndAudioResponse = await falAIService.mergeAudioVideo(mergeVideoAndAudioRequest);
            const mergeVideoAndAudioResult = mergeVideoAndAudioResponse.data;

            console.log(`[Merge Service] 최종 영상 병합 완료`);

            // 5.5. Fal AI에서 최종 병합된 영상을 다운로드하여 Supabase Storage에 업로드
            const finalVideoUrl = mergeVideoAndAudioResult.video.url;
            const finalVideoResponse = await fetch(finalVideoUrl);

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
            // 실패 시 Task 상태 'failed'로 업데이트

            if (generationTaskId) {
                const generationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(generationTaskId);

                if (generationTask) {
                    const mappedList: SceneData[] = generationTask?.scene_breakdown_list.map((sceneData) => {
                        return {
                            ...sceneData,
                            status: SceneGenerationStatus.IN_PROGRESS,
                        }
                    });
                    const requestIdList = mappedList.map((sceneData) => {
                        return sceneData.requestId!;
                    });

                    await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                        generationTaskId,
                        {
                            scene_breakdown_list: mappedList,
                        }
                    );

                    // 처리된 영상 파일들 삭제
                    const filesToDelete = requestIdList.map(requestId => `${generationTaskId}/${requestId}.mp4`);
                    const { error: deleteError } = await supabase.storage
                        .from('processed_video_storage')
                        .remove(filesToDelete);

                    if (deleteError) {
                        console.error('처리된 영상 파일 삭제 중 에러:', deleteError);
                    }

                }
            }
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(generationTaskId, {
                is_generation_failed: true,
            })
            return false;
        }
    },

    async getVideoSignedUrl(filePath: string, expiresIn: number = 60 * 60 * 24) {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase.storage
            .from('processed_video_storage')
            .createSignedUrl(filePath, expiresIn);

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `There is no video data.`);
        }

        return data.signedUrl;
    }
}