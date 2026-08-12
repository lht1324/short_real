import {SceneData} from '@/lib/api/types/supabase/VideoGenerationTasks';
import Replicate from "replicate";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {ALL_FORMATS, Input, UrlSource} from "mediabunny";
import {fal} from "@fal-ai/client";
import {cryptoUtils} from "@/lib/utils/cryptoUtils";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {falAIInputMapper} from "@/lib/falAIInputMapper";

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