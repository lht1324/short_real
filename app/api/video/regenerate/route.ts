import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import { imageServerAPI } from "@/lib/api/server/imageServerAPI";
import { aiModelDataServerAPI } from "@/lib/api/server/aiModelDataServerAPI";
import { llmServerAPI } from "@/lib/api/server/llmServerAPI";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { SceneGenerationStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";

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
            selectedI2VModelId,
        }: {
            taskId: string;
            sceneNumber: number;
            selectedI2VModelId?: string;
        } = requestBody;

        if (!taskId || !sceneNumber) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "taskId and sceneNumber are required",
            });
        }

        const supabase = createSupabaseServiceRoleClient();

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

        const currentSceneBreakdownList = videoGenerationTask.scene_breakdown_list || [];

        // 2. 해당 sceneNumber의 SceneData 추출
        const targetSceneIndex = currentSceneBreakdownList.findIndex(
            (sceneData) => sceneData.sceneNumber === sceneNumber
        );

        if (targetSceneIndex === -1) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: `Scene #${sceneNumber} not found in breakdown list`,
            });
        }

        const targetSceneData = currentSceneBreakdownList[targetSceneIndex];

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
        const videoPromptResult = await llmServerAPI.postVideoGenPrompt(
            sceneNumber,
            imageBase64,
            targetSceneData.narration
        );

        if (videoPromptResult.success && videoPromptResult.videoGenPrompt) {
            targetSceneData.videoGenPrompt = videoPromptResult.videoGenPrompt;
        }

        // 6. 비디오 AI Model 엔드포인트 세팅 및 SceneData 모델 ID 필드 저장
        const defaultVideoModelId = videoGenerationTask.ai_model_config?.videoModelId || "fal-ai/kling-video/v1.5/pro/image-to-video";
        const videoModelIdToUse = selectedI2VModelId || defaultVideoModelId;

        const videoModelData = await aiModelDataServerAPI.getAIModelDataById(videoModelIdToUse);

        if (!videoModelData) {
            throw new Error(`AI Model data not found for ID: ${videoModelIdToUse}`);
        }

        targetSceneData.selectedI2VAIModelId = videoModelData.id;

        // 5. DB scene_breakdown_list 상태 및 모델 ID 갱신 (IN_PROGRESS)
        targetSceneData.status = SceneGenerationStatus.IN_PROGRESS;
        currentSceneBreakdownList[targetSceneIndex] = targetSceneData;

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: currentSceneBreakdownList,
        });

        // 7. videoServerAPI.postVideo 호출 (isRegenerate: true 인자를 전달하여 웹훅에 isRegenerate=true 자동 부착)
        console.log(`[Regenerate Video] Submitting single scene video generation queue for Scene #${sceneNumber}...`);
        const requestId = await videoServerAPI.postVideo(
            targetSceneData,
            taskId,
            userId,
            videoModelData,
            user.fal_ai_api_key,
            videoGenerationTask.aspect_ratio || "9:16",
            videoGenerationTask.resolution || "1080p",
            false,
            true,
        );

        // 8. Supabase RPC update_scene_request_id 로 씬의 requestId 등록
        const { error: rpcError } = await supabase.rpc("update_scene_request_id", {
            target_task_id: taskId,
            target_scene_number: sceneNumber,
            new_request_id: requestId,
        });

        if (rpcError) {
            console.error(`Updating requestId of Scene #${sceneNumber} failed:`, rpcError);
            throw new Error(`Updating requestId of Scene #${sceneNumber} failed.`);
        }

        console.log(`[Regenerate Video] Successfully submitted queue. Request ID: ${requestId}`);

        // 9. 즉시 200 OK 비동기 성공 응답 (타임아웃 0%)
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                sceneNumber: sceneNumber,
                requestId: requestId,
            },
            message: `Single scene video generation submitted successfully for Scene #${sceneNumber}`,
        });
    } catch (error) {
        console.error("Error in POST /api/video/regenerate:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown internal server error",
        });
    }
}
