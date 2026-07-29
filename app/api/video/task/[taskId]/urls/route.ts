import { NextRequest } from "next/server";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import { voiceServerAPI } from "@/lib/api/server/voiceServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { taskId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        const task = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!task) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Task not found."
            });
        }

        if (task.user_id !== sessionUserId) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: "Forbidden. You do not have permission to access this task."
            });
        }

        const scenesUrlData: any[] = [];

        if (task.scene_breakdown_list && task.scene_breakdown_list.length > 0) {
            // 씬 목록 순서대로 정렬
            const sortedSceneList = [...task.scene_breakdown_list].sort((a, b) => a.sceneNumber - b.sceneNumber);

            const urlsPromises = sortedSceneList.map(async (scene) => {
                const { sceneNumber } = scene;
                const rawVideoPath = `${sessionUserId}/${taskId}/video_raw_${sceneNumber}.mp4`;
                const processedVideoPath = `${sessionUserId}/${taskId}/video_processed_${sceneNumber}.mp4`;

                const [videoRawUrl, videoProcessedUrl, voiceUrl] = await Promise.all([
                    videoServerAPI.getVideoSignedUrl(rawVideoPath, 60 * 60).catch(() => null),
                    videoServerAPI.getVideoSignedUrl(processedVideoPath, 60 * 60).catch(() => null),
                    voiceServerAPI.getSceneVoiceSignedUrl(taskId, sessionUserId, sceneNumber).catch(() => null)
                ]);

                return {
                    sceneNumber,
                    videoRawUrl,
                    videoProcessedUrl,
                    voiceUrl,
                };
            });

            scenesUrlData.push(...(await Promise.all(urlsPromises)));
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                scenes: scenesUrlData,
            },
            message: "Fetched scene URLs successfully."
        });
    } catch (error) {
        console.error("Error in GET /api/video/task/[taskId]/urls:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get scene URLs"
        });
    }
}
