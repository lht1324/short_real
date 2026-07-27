import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import { imageServerAPI } from "@/lib/api/server/imageServerAPI";
import { aiModelDataServerAPI } from "@/lib/api/server/aiModelDataServerAPI";
import { llmServerAPI } from "@/lib/api/server/llmServerAPI";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized internal request",
        });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required param: userId",
        });
    }

    try {
        const requestBody = await request.json();
        const {
            taskId,
            sceneNumber,
        }: {
            taskId: string;
            sceneNumber: number;
        } = requestBody;

        if (!taskId || !sceneNumber) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "taskId and sceneNumber are required",
            });
        }

        // 1. Task 및 User 정보 조회
        const [videoGenerationTask, user] = await Promise.all([
            videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId),
            usersServerAPI.getUserByUserId(userId),
        ]);

        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Video Generation Task not found",
            });
        }

        if (!user || !user.fal_ai_api_key) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "User API Key is missing or invalid",
            });
        }

        const encryptedFalAiApiKey = user.fal_ai_api_key;

        const currentSceneBreakdownList = videoGenerationTask.scene_breakdown_list || [];

        // 2. 해당 sceneNumber의 SceneData 추출
        const targetSceneIndex = sceneNumber - 1;
        const targetSceneData = currentSceneBreakdownList[targetSceneIndex];

        const selectedI2VAIModelId = targetSceneData.selectedI2VAIModelId;

        if (!selectedI2VAIModelId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Selected Video generation model is invalid.",
            });
        }

        const selectedI2VAIModelData = await aiModelDataServerAPI.getAIModelDataById(selectedI2VAIModelId);

        if (!selectedI2VAIModelData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Image generation model data not found.",
            });
        }

        // 3. 씬 이미지 Signed URL 생성 및 Base64 변환
        const sceneImageUrl = await imageServerAPI.getImageSignedUrl(`${taskId}/${sceneNumber}.jpeg`);
        const imageFetchResponse = await fetch(sceneImageUrl);

        if (!imageFetchResponse.ok) {
            throw new Error(`Failed to fetch scene image for Scene #${sceneNumber}`);
        }

        const imageArrayBuffer = await imageFetchResponse.arrayBuffer();
        const imageBase64 = Buffer.from(imageArrayBuffer).toString("base64");

        // 4. Vision LLM을 통해 신규 비디오 모션 프롬프트 생성 (Regenerate Prompt)
        console.log(`[Regenerate Video Prompt] Generating new motion prompt for Scene #${sceneNumber}...`);
        const postVideoGenPromptResult = await llmServerAPI.postVideoGenPrompt(
            sceneNumber,
            imageBase64,
            targetSceneData.narration
        );

        if (!postVideoGenPromptResult.success || !postVideoGenPromptResult.videoGenPrompt) {
            throw Error(postVideoGenPromptResult.error?.message || "Failed to generate new video prompt");
        }

        const videoGenPrompt = postVideoGenPromptResult.videoGenPrompt;

        // 5. videoServerAPI.postVideo 호출 (isRegenerate: true 인자를 전달하여 웹훅에 isRegenerate=true 자동 부착)
        console.log(`[Regenerate Video] Submitting single scene video generation queue for Scene #${sceneNumber}...`);
        const requestId = await videoServerAPI.postVideo(
            targetSceneData,
            taskId,
            userId,
            selectedI2VAIModelData,
            encryptedFalAiApiKey,
            videoGenerationTask.aspect_ratio || "9:16",
            videoGenerationTask.resolution || "1080p",
            false,
            true,
        );

        console.log(`[Regenerate Video] Successfully submitted queue. Request ID: ${requestId}`);

        // 7. DB scene_breakdown_list에 생성된 videoGenPrompt 패치
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: currentSceneBreakdownList.map((sceneData, index) => {
                return targetSceneIndex === index
                    ? {
                        ...sceneData,
                        videoGenPrompt: videoGenPrompt,
                    } : sceneData;
            }),
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Single scene video generation submitted successfully for Scene #${sceneNumber}`,
        });
    } catch (error) {
        console.error("Error in POST /api/video/regenerate/process:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown internal server error",
        });
    }
}
