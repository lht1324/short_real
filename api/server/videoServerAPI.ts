import {SceneData, SceneGenerationStatus} from '@/api/types/supabase/VideoGenerationTasks';
import {findOptimalVideoParameters} from "@/utils/videoUtils";
import {
    ReplicateInput,
    VIDEO_ASPECT_RATIOS, VIDEO_GENERATION_STATUS,
    VIDEO_RESOLUTIONS,
    VideoAspectRatio,
    VideoResolution
} from "@/lib/ReplicateData";
import Replicate from "replicate";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {RendiClient} from "@/lib/rendi/RendiClient";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {ALL_FORMATS, Input, UrlSource} from "mediabunny";
import {FalAIClient} from "@/lib/fal-ai/FalAIClient";
import {FalAIService} from "@/lib/fal-ai/FalAIService";

export const videoServerAPI = {
    // POST /videos - Scene별 이미지투비디오 생성 요청 제출
    async postVideo(
        sceneData: SceneData,
        generationTaskId: string,
        aspectRatio: VideoAspectRatio = VIDEO_ASPECT_RATIOS.PORTRAIT_9_16,
        videoResolution: VideoResolution = VIDEO_RESOLUTIONS.RES_720P,
    ) {
        const supabase = createSupabaseServiceRoleClient();
        const replicate = new Replicate();

        // ---- [추가] 웹훅 URL 환경 변수 확인 ----
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('base url is invalid.');
        }

        // ---- [추가] generationTaskId를 포함한 동적 웹훅 URL 생성 ----
        const webhookUrl = `${baseUrl}/webhook/replicate?generationTaskId=${generationTaskId}`;


        // Base64를 Data URL로 변환
        // const imageUrl = sceneData.imageBase64
        //     ? `data:image/png;base64,${sceneData.imageBase64}`
        //     : '';

        // Signed URL 생성 (1시간 유효)
        const { data, error } = await supabase.storage
            .from('scene_image_temp_storage')
            .createSignedUrl(`${generationTaskId}/${sceneData.sceneNumber}.jpeg`, 3600);

        // if (!imageUrl) {
        //     throw new Error(`Scene ${sceneData.sceneNumber}: 이미지 데이터가 없습니다.`);
        // }

        if (error || !data?.signedUrl) {
            throw new Error(error?.message || `Scene ${sceneData.sceneNumber}: 이미지 데이터가 없습니다.`);
        }
        const imageUrl = data.signedUrl;

        // const frameRate = 24;
        const videoParameters = findOptimalVideoParameters(sceneData.sceneDuration || 3);

        const inputData: ReplicateInput = {
            image: imageUrl,
            prompt: sceneData.videoGenPrompt || "",
            num_inference_steps: 28,
            num_frames: videoParameters.num_frames,
            frames_per_second: videoParameters.frames_per_second,
            enable_safety_checker: false,
            resolution: videoResolution,
            aspect_ratio: aspectRatio,
        };
        const prediction = await replicate.predictions.create({
            version: "wan-video/wan-2.2-i2v-fast",
            input: inputData,
            webhook: webhookUrl,
            webhook_events_filter: ["completed"],
        });

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
     * @param filePath - Storage에 저장할 파일 경로 ([taskId]/[requestId].mp4)
     */
    async postProcessedVideo(replicateVideoUrl: string, targetDuration: number, filePath: string): Promise<{ success: boolean, processedVideoUrl?: string, error?: { message: string; code: string } }> {
        const supabase = createSupabaseServiceRoleClient();
        const rendiClient = new RendiClient();

        try {
            // 1. MediaBunny를 사용해 영상 정보 확인
            const mediaBunnyInput = new Input({
                source: new UrlSource(replicateVideoUrl),
                formats: ALL_FORMATS,
            });

            const actualDuration = await mediaBunnyInput.computeDuration();

            // 2. 속도 배율 계산 (소수점 6자리로 제한)
            const videoPtsRatio = parseFloat((targetDuration / actualDuration).toFixed(6));
            console.log(`${filePath.split("/")[1]} actualDuration = ${actualDuration}`);
            console.log(`${filePath.split("/")[1]} targetDuration = ${targetDuration}`);
            console.log(`${filePath.split("/")[1]} videoRatio = ${videoPtsRatio}`);

            const speedAdjustRequest = {
                input_files: {
                    "in_1": replicateVideoUrl,
                },
                output_files: {
                    // "out_1": `${filePath.split("/")[1]}`
                    "out_1": "speed_adjusted_video.mp4",
                },
                ffmpeg_command: `-i {{in_1}} -vf "setpts=${videoPtsRatio}*PTS" {{out_1}}`
            };

            const speedAdjustResponse = await rendiClient.runFfmpegCommand(speedAdjustRequest);
            const speedAdjustResult = await rendiClient.waitForCompletion(speedAdjustResponse.command_id);

            // 3. Rendi에서 처리된 영상을 다운로드하여 Supabase Storage에 업로드
            const processedVideoUrl = speedAdjustResult.out_1.storage_url;
            const videoResponse = await fetch(processedVideoUrl);

            if (!videoResponse.ok) {
                throw new Error(`처리된 영상 다운로드 실패: ${videoResponse.statusText}`);
            }

            const videoBuffer = await videoResponse.arrayBuffer();

            // Supabase Storage에 업로드
            const { error: uploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(filePath, videoBuffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Supabase Storage 업로드 실패: ${uploadError.message}`);
            }

            // Supabase Storage의 public URL 생성
            const { data: { publicUrl } } = supabase.storage
                .from('processed_video_storage')
                .getPublicUrl(filePath);

            return {
                success: true,
                processedVideoUrl: publicUrl
            };

        } catch (error) {
            console.error("영상 처리 중 에러 발생:", error);
            return {
                success: false,
                error: {
                    message: error instanceof Error ? error.message : 'Unknown error',
                    code: 'VIDEO_PROCESSING_ERROR',
                },
            };
        }
    },

    async postFinalVideo(generationTaskId: string) {
        const supabase = createSupabaseServiceRoleClient();
        const falAIClient = new FalAIClient();
        const falAIService = new FalAIService(falAIClient);

        try {
            // 1. 필요한 데이터 조회 (영상 리스트, 음성 URL)
            console.log(`[Merge Service] Task 데이터 조회: ${generationTaskId}`);
            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(generationTaskId);
            if (!videoGenerationTask) {
                throw new Error("Task not found.");
            }

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

            // 5. Task 상태 'completed'로 업데이트
            await videoGenerationTasksServerAPI.updateTaskStatus(generationTaskId, 'completed');

            // 5.5. Rendi에서 최종 병합된 영상을 다운로드하여 Supabase Storage에 업로드
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

            // Supabase Storage의 public URL 생성
            const { data: { publicUrl } } = supabase.storage
                .from('processed_video_storage')
                .getPublicUrl(finalFilePath);

            // 6. 최종 결과 URL 반환 (Supabase Storage URL)
            return publicUrl;

        } catch (error) {
            console.error(`[Merge Service] 최종 영상 병합 중 에러:`, error);
            // 실패 시 Task 상태 'failed'로 업데이트

            if (generationTaskId) {
                const supabase = createSupabaseServiceRoleClient();
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

                    await videoGenerationTasksServerAPI.patchVideoGenerationTask({
                        id: generationTaskId,
                        scene_breakdown_list: mappedList,
                    });

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
            await videoGenerationTasksServerAPI.updateTaskStatus(generationTaskId, 'failed');
            throw error;
        }
    }
}