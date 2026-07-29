import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { SceneGenerationStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

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
            selectedI2VAIModelId,
        }: {
            taskId: string;
            sceneNumber: number;
            selectedI2VAIModelId?: string;
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
                error: "User not found",
            });
        }

        const currentSceneBreakdownList = videoGenerationTask.scene_breakdown_list || [];

        // 2. 해당 sceneNumber의 SceneData 추출
        const targetSceneIndex = sceneNumber - 1;

        if (!selectedI2VAIModelId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Selected Video generation model is invalid.",
            });
        }

        // 3. DB scene_breakdown_list 1차 갱신 (선택한 비디오 모델 ID 저장 & status = GENERATING_VIDEO)
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: currentSceneBreakdownList.map((sceneData, index) => {
                return targetSceneIndex === index
                    ? {
                        ...sceneData,
                        selectedI2VAIModelId: selectedI2VAIModelId,
                        status: SceneGenerationStatus.GENERATING_VIDEO,
                    } : sceneData;
            }),
        });

        // 4. internalFireAndForgetFetch로 백그라운드 비디오 재생성 프로세스 비동기 호출
        const baseUrl = process.env.BASE_URL || "";
        const internalVideoRegenerateProcessUrl = `${baseUrl}/api/video/regenerate/process?userId=${userId}`;

        console.log(`[Regenerate Video Trigger] Fire-and-forget video regeneration for Scene #${sceneNumber}...`);
        internalFireAndForgetFetch(
            internalVideoRegenerateProcessUrl,
            { method: "POST" },
            {
                taskId: taskId,
                sceneNumber: sceneNumber,
            }
        );

        // 5. 클라이언트에 즉시 200 OK 비동기 성공 응답
        return getNextBaseResponse({
            success: true,
            status: 200,
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
