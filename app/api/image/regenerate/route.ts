import {NextRequest} from "next/server";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";
import {aiModelDataServerAPI} from "@/lib/api/server/aiModelDataServerAPI";
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
            status: 403,
            error: "Forbidden. You can only write your own data."
        });
    }

    try {
        const requestBody = await request.json();
        const {
            taskId,
            sceneNumber,
            selectedI2IAIModelId,
            selectedI2VAIModelId,
            isAlsoRegenerateVideo,
        }: {
            taskId: string;
            sceneNumber: number;
            selectedI2IAIModelId?: string;
            selectedI2VAIModelId?: string;
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

        if (!user) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "User not found.",
            });
        }

        const currentSceneBreakdownList = videoGenerationTask.scene_breakdown_list || [];

        // 2. 해당 sceneNumber의 SceneData 추출
        const targetSceneIndex = sceneNumber - 1;

        // 3. 모델 데이터 조회 및 ID 추출
        if (!selectedI2IAIModelId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Selected Image generation model is invalid.",
            });
        }

        const selectedI2IAIModelData = await aiModelDataServerAPI.getAIModelDataById(selectedI2IAIModelId);

        if (!selectedI2IAIModelData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Image generation model data not found.",
            });
        }

        const selectedT2IAIModelData = await aiModelDataServerAPI.getAIModelDataByDisplayNameAndCategory(
            selectedI2IAIModelData.display_name,
            "text-to-image"
        );

        if (!selectedT2IAIModelData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Image generation model data not found.",
            });
        }

        // 4. DB scene_breakdown_list 1차 갱신 (선택한 모델 ID 저장 & status = GENERATING_IMAGE)
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: currentSceneBreakdownList.map((sceneData, index) => {
                return targetSceneIndex === index
                    ? {
                        ...sceneData,
                        selectedT2IAIModelId: selectedT2IAIModelData.id,
                        selectedI2IAIModelId: selectedI2IAIModelId,
                        ...(selectedI2VAIModelId ? { selectedI2VAIModelId: selectedI2VAIModelId } : {}),
                        status: SceneGenerationStatus.GENERATING_IMAGE,
                    } : sceneData;
            }),
        });

        // 5. internalFireAndForgetFetch로 백그라운드 이미지 재생성 프로세스 비동기 호출
        const baseUrl = process.env.BASE_URL || "";
        const internalImageRegenerateProcessUrl = `${baseUrl}/api/image/regenerate/process?userId=${userId}`;

        console.log(`[Regenerate Image Trigger] Fire-and-forget image regeneration for Scene #${sceneNumber}...`);
        internalFireAndForgetFetch(
            internalImageRegenerateProcessUrl,
            { method: "POST" },
            {
                taskId: taskId,
                sceneNumber: sceneNumber,
                isAlsoRegenerateVideo: isAlsoRegenerateVideo,
            }
        );

        // 6. 클라이언트에 즉시 200 OK 비동기 성공 응답
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Successfully started image regeneration for Scene #${sceneNumber}`,
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

