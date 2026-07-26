import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { imageServerAPI } from "@/lib/api/server/imageServerAPI";
import { aiModelDataServerAPI } from "@/lib/api/server/aiModelDataServerAPI";
import { llmServerAPI } from "@/lib/api/server/llmServerAPI";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
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
            selectedImageModelId,
            selectedI2IModelId,
            selectedI2VModelId,
            isAlsoRegenerateVideo,
        }: {
            taskId: string;
            sceneNumber: number;
            selectedImageModelId?: string;
            selectedI2IModelId?: string;
            selectedI2VModelId?: string;
            isAlsoRegenerateVideo?: boolean;
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

        // 3. 캐스팅된 캐릭터 Entity 추출 (LLM 프롬프트용 1차 추출)
        const initialCastedEntityManifestList = (videoGenerationTask.entity_manifest_list || []).filter(
            (entityItem) => targetSceneData.sceneCastingEntityIdList?.includes(entityItem.id)
        );

        // 4. LLM을 통해 해당 씬 전용 신규 이미지 프롬프트 생성 (Regenerate Prompt)
        if (!videoGenerationTask.master_style_info) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Master style info is missing in video generation task",
            });
        }

        console.log(`[Regenerate Image Prompt] Generating new image prompt for Scene #${sceneNumber}...`);
        const promptGenerationResult = await llmServerAPI.postImageGenPrompt(
            targetSceneData.imageGenPromptDirective || targetSceneData.narration,
            videoGenerationTask.master_style_info,
            targetSceneData.narration,
            sceneNumber,
            videoGenerationTask.video_title || "",
            videoGenerationTask.video_description || "",
            initialCastedEntityManifestList,
            targetSceneData.sceneVisualDescription || "",
            videoGenerationTask.selected_style_id || "realistic",
            videoGenerationTask.aspect_ratio || "9:16"
        );

        if (!promptGenerationResult.success || !promptGenerationResult.imageGenPrompt) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: promptGenerationResult.error?.message || "Failed to generate new image prompt",
            });
        }

        targetSceneData.imageGenPrompt = promptGenerationResult.imageGenPrompt;
        targetSceneData.imageGenPromptSentence = promptGenerationResult.imageGenPromptSentence || targetSceneData.narration;

        // 6. 선택한 AI Model Endpoint 매칭 및 SceneData 모델 ID 필드 저장
        let finalT2IEndpoint = videoGenerationTask.ai_model_config?.sceneImageT2IModelId || "fal-ai/flux-2";
        let finalI2IEndpoint = videoGenerationTask.ai_model_config?.sceneImageI2IModelId || "fal-ai/flux-2/edit";

        const targetModelId = selectedImageModelId || selectedI2IModelId;

        if (targetModelId) {
            const selectedI2IModelData = await aiModelDataServerAPI.getAIModelDataById(targetModelId);

            if (selectedI2IModelData) {
                targetSceneData.selectedI2IAIModelId = selectedI2IModelData.id;
                if (selectedI2IModelData.endpoint_id) {
                    finalI2IEndpoint = selectedI2IModelData.endpoint_id;
                }

                const selectedT2IModelData = await aiModelDataServerAPI.getAIModelDataByDisplayNameAndCategory(
                    selectedI2IModelData.display_name,
                    "text-to-image"
                );

                if (selectedT2IModelData) {
                    targetSceneData.selectedT2IAIModelId = selectedT2IModelData.id;
                    if (selectedT2IModelData.endpoint_id) {
                        finalT2IEndpoint = selectedT2IModelData.endpoint_id;
                    }
                }
            }
        }

        // 5. DB scene_breakdown_list 상태 및 모델 ID 갱신
        targetSceneData.status = SceneGenerationStatus.COMPLETED;
        currentSceneBreakdownList[targetSceneIndex] = targetSceneData;

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: currentSceneBreakdownList,
        });

        // 7. 정규 파이프라인(trigger/post-image.ts)과 100% 동일하게 reference_image용 subjectEntityManifestList 정밀 필터링 및 entityOrder 정렬
        const entityOrder = promptGenerationResult.entityOrder || [];

        const subjectEntityManifestList = initialCastedEntityManifestList
            .filter((entityItem) => entityItem.role === "main_hero" || entityItem.role === "sub_character")
            .sort((entityA, entityB) => {
                const indexA = entityOrder.indexOf(entityA.id);
                const indexB = entityOrder.indexOf(entityB.id);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });

        // 8. Fal AI 단건 이미지 재생성 및 Storage 업로드
        const imageResult = await imageServerAPI.postImage(
            targetSceneData.imageGenPrompt,
            targetSceneData.imageGenPromptSentence || targetSceneData.narration || "",
            subjectEntityManifestList,
            taskId,
            sceneNumber,
            encryptedFalAiApiKey,
            userId,
            finalT2IEndpoint,
            finalI2IEndpoint,
            videoGenerationTask.resolution || "1080p",
            videoGenerationTask.aspect_ratio || "9:16"
        );

        if (!imageResult.success) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: imageResult.error?.message || "Failed to regenerate scene image",
            });
        }

        // 9. 갱신된 이미지 Signed URL 생성
        const rawSignedUrl = await imageServerAPI.getImageSignedUrl(`${taskId}/${sceneNumber}.jpeg`);
        const updatedImageUrl = `${rawSignedUrl}${rawSignedUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;

        // 10. 연쇄 비디오 재생성 옵션이 true일 경우 internalFireAndForgetFetch로 비동기 연쇄 호출
        if (isAlsoRegenerateVideo) {
            const baseUrl = process.env.BASE_URL || "";
            const internalVideoRegenerateUrl = `${baseUrl}/api/video/regenerate?userId=${userId}`;

            console.log(`[Chained Video Trigger] Fire-and-forget video regeneration for Scene #${sceneNumber}...`);
            internalFireAndForgetFetch(
                internalVideoRegenerateUrl,
                { method: "POST" },
                {
                    taskId: taskId,
                    sceneNumber: sceneNumber,
                    selectedI2VModelId: selectedI2VModelId,
                }
            );
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                sceneNumber: sceneNumber,
                imageUrl: updatedImageUrl,
                isAlsoRegenerateVideo: !!isAlsoRegenerateVideo,
            },
            message: `Successfully regenerated image for Scene #${sceneNumber}`,
        });
    } catch (error) {
        console.error("Error in POST /api/image/regenerate:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown internal server error",
        });
    }
}
