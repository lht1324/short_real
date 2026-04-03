import { NextRequest } from "next/server";
import { tasks } from "@trigger.dev/sdk/v3";
import { orchestrateImageGeneration } from "@/trigger/orchestrate-image-generation";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { taskCheckAndCleanupIfCancelled } from "@/lib/utils/taskCheckAndCleanupIfCancelled";

export async function POST(request: NextRequest) {
    // 1. 보안 검사
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    // 2. 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        // Task 정보 가져오기 및 유효성 검사
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            throw new Error('Video Generation Task not found.');
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
        if (checkResultInitialResult) {
            return getNextBaseResponse({ success: false, status: 400, error: 'Task was cancelled' });
        }

        const sceneDataList = videoGenerationTask.scene_breakdown_list;
        const videoTitle = videoGenerationTask.video_title;
        const videoDescription = videoGenerationTask.video_description;
        const masterStyleInfo = videoGenerationTask.master_style_info;
        const entityManifestList = videoGenerationTask.entity_manifest_list;
        const styleId = videoGenerationTask.selected_style_id;

        if (!sceneDataList || !videoTitle || !videoDescription || !masterStyleInfo || !entityManifestList || !styleId) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            throw new Error('Scene data is invalid.');
        }

        // 3. 감독관(Orchestrator) 태스크 호출 (Fire-and-Forget)
        const handle = await tasks.trigger<typeof orchestrateImageGeneration>(
            "orchestrate-image-generation",
            {
                taskId,
                videoTitle,
                videoDescription,
                masterStyleInfo,
                entityManifestList,
                sceneDataList,
                styleId,
            }
        );

        // 4. 즉시 응답 반환
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Image generation orchestration has been queued.",
            data: {
                orchestrationHandleId: handle.id,
                taskId: taskId
            }
        });

    } catch (error) {
        console.error("Failed to trigger image generation orchestration:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to queue image generation.",
        });
    }
}