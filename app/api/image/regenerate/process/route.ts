import {NextRequest} from "next/server";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";
import {imageServerAPI} from "@/lib/api/server/imageServerAPI";
import {aiModelDataServerAPI} from "@/lib/api/server/aiModelDataServerAPI";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {SceneGenerationStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";

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
            isAlsoRegenerateVideo,
        }: {
            taskId: string;
            sceneNumber: number;
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
        const targetSceneIndex = sceneNumber - 1;
        const targetSceneData = currentSceneBreakdownList[targetSceneIndex];

        const selectedT2IAIModelId = targetSceneData.selectedT2IAIModelId;
        const selectedI2IAIModelId = targetSceneData.selectedI2IAIModelId;

        if (!selectedT2IAIModelId || !selectedI2IAIModelId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Image generation AI model id is invalid.",
            });
        }

        const selectedI2IAIModelData = await aiModelDataServerAPI.getAIModelDataById(selectedI2IAIModelId);
        const selectedT2IAIModelData = await aiModelDataServerAPI.getAIModelDataById(selectedT2IAIModelId);

        if (!selectedT2IAIModelData || !selectedI2IAIModelData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Image generation model data not found.",
            });
        }

        // 3. 캐스팅된 캐릭터 Entity 추출 (LLM 프롬프트용 1차 추출)
        const entityManifestList = videoGenerationTask.entity_manifest_list ?? [];
        const sceneCastingEntityIdList = targetSceneData.sceneCastingEntityIdList ?? [];
        const initialCastedEntityManifestList = entityManifestList.filter((entity) => {
            return sceneCastingEntityIdList.includes(entity.id);
        });

        // 4. LLM을 통해 해당 씬 전용 신규 이미지 프롬프트 생성 (Regenerate Prompt)
        if (!videoGenerationTask.master_style_info) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Master style info is missing in video generation task",
            });
        }

        console.log(`[Regenerate Image Prompt] Generating new image prompt for Scene #${sceneNumber}...`);
        const postImageGenPromptResult = await llmServerAPI.postImageGenPrompt(
            targetSceneData.imageGenPromptDirective,
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

        if (!postImageGenPromptResult.success || !postImageGenPromptResult.imageGenPrompt || !postImageGenPromptResult.imageGenPromptSentence) {
            throw Error(postImageGenPromptResult.error?.message || "Failed to generate new image prompt");
        }

        const imageGenPrompt = postImageGenPromptResult.imageGenPrompt;
        const imageGenPromptSentence = postImageGenPromptResult.imageGenPromptSentence;

        // 5. 정규 파이프라인과 동일하게 reference_image용 subjectEntityManifestList 필터링 및 정렬
        const entityOrder = postImageGenPromptResult.entityOrder || [];

        const subjectEntityManifestList = initialCastedEntityManifestList
            .filter((entityItem) => entityItem.role === "main_hero" || entityItem.role === "sub_character")
            .sort((entityA, entityB) => {
                const indexA = entityOrder.indexOf(entityA.id);
                const indexB = entityOrder.indexOf(entityB.id);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
            });

        // 6. Fal AI 단건 이미지 재생성 및 Storage 업로드
        const imageResult = await imageServerAPI.postImage(
            imageGenPrompt,
            imageGenPromptSentence,
            subjectEntityManifestList,
            taskId,
            sceneNumber,
            encryptedFalAiApiKey,
            userId,
            selectedT2IAIModelData.endpoint_id,
            selectedI2IAIModelData.endpoint_id,
            videoGenerationTask.resolution || "1080p",
            videoGenerationTask.aspect_ratio || "9:16"
        );

        if (!imageResult.success) {
            throw Error(imageResult.error?.message || "Failed to regenerate scene image");
        }

        // 7. 이미지 생성 성공 후 DB scene_breakdown_list 상태(COMPLETED 또는 GENERATING_VIDEO), 모델 ID, 신규 프롬프트 일괄 갱신
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: currentSceneBreakdownList.map((sceneData, index) => {
                return targetSceneIndex === index
                    ? {
                        ...sceneData,
                        selectedT2IAIModelId: selectedT2IAIModelData.id,
                        selectedI2IAIModelId: selectedI2IAIModelId,
                        imageGenPrompt: imageGenPrompt,
                        imageGenPromptSentence: imageGenPromptSentence,
                        status: isAlsoRegenerateVideo ? SceneGenerationStatus.GENERATING_VIDEO : SceneGenerationStatus.COMPLETED,
                    } : sceneData;
            }),
        });

        // 8. 연쇄 비디오 재생성 옵션이 true일 경우 internalFireAndForgetFetch로 비동기 연쇄 호출
        if (isAlsoRegenerateVideo) {
            const baseUrl = process.env.BASE_URL || "";
            const internalVideoRegenerateProcessUrl = `${baseUrl}/api/video/regenerate/process?userId=${userId}`;

            console.log(`[Chained Video Trigger] Fire-and-forget video regeneration for Scene #${sceneNumber}...`);
            internalFireAndForgetFetch(
                internalVideoRegenerateProcessUrl,
                { method: "POST" },
                {
                    taskId: taskId,
                    sceneNumber: sceneNumber,
                }
            );
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Successfully regenerated image for Scene #${sceneNumber}`,
        });
    } catch (error) {
        console.error("Error in POST /api/image/regenerate/process:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown internal server error",
        });
    }
}
