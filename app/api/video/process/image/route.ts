import {NextRequest, NextResponse} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {SceneData, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";
import {imageServerAPI} from "@/api/server/imageServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";
import {getIsValidRequestS2S} from "@/utils/getIsValidRequest";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    // URL에서 파라미터 추출
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
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video Generation Task not found.'
            });
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkResultInitialResult) {
            return checkResultInitialResult;
        }

        const sceneDataList = videoGenerationTask.scene_breakdown_list;
        const videoTitle = videoGenerationTask.video_title;
        const videoDescription = videoGenerationTask.video_description;
        const masterStylePositivePromptInfo = videoGenerationTask.master_style_info;
        const masterStyleNegativePrompt = videoGenerationTask.master_style_negative_prompt;
        const entityManifestList = videoGenerationTask.entity_manifest_list;

        if (!sceneDataList || !videoTitle || !videoDescription || !masterStylePositivePromptInfo || !masterStyleNegativePrompt || !entityManifestList) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Scene data is invalid.'
            });
        }

        const sceneDataWithImageGenPromptPromiseList: Promise<SceneData>[] = sceneDataList.map(async (sceneData) => {
            console.log(`Scene[${sceneData.sceneNumber}] postImageGenPrompt() is executed.`);
            const postImageGenPromptResult = await openAIServerAPI.postImageGenPrompt(
                sceneData.imageGenPromptDirective,
                masterStylePositivePromptInfo,
                sceneData.narration,
                videoTitle,
                videoDescription,
                entityManifestList,
            );

            if (!postImageGenPromptResult.success || !postImageGenPromptResult.imageGenPrompt) {
                throw new Error(`Scene[${sceneData.sceneNumber}]: ${postImageGenPromptResult.error?.message ?? "Failed to generate image gen prompt"}`);
            }

            return {
                ...sceneData,
                imageGenPrompt: postImageGenPromptResult.imageGenPrompt,
                sceneEntityManifestList: postImageGenPromptResult.entityManifestList,
            };
        });
        const sceneDataWithImageGenPromptList = await Promise.all(sceneDataWithImageGenPromptPromiseList);

        for (let index = 0; index < sceneDataWithImageGenPromptList.length; index++) {
            const sceneData = sceneDataWithImageGenPromptList[index];
            const combinedMasterNegativeKeywords = `${masterStyleNegativePrompt}`.split(/\s*,\s*/);
            const uniqueMasterNegativeKeywordSet = new Set(combinedMasterNegativeKeywords);
            const uniqueMasterNegativePrompt = Array.from(uniqueMasterNegativeKeywordSet).join(", ");

            console.log(`Scene[${sceneData.sceneNumber}] postImage() is executed.`);
            const postImageResult = await imageServerAPI.postImage(
                sceneData.imageGenPrompt as string,
                taskId,
                sceneData.sceneNumber,
                uniqueMasterNegativePrompt,
            );

            if (!postImageResult.success) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

                return getNextBaseResponse({
                    success: false,
                    status: 500,
                    error: 'Failed to generate image with Imagen 4.'
                });
            }
        }

        const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
            scene_breakdown_list: sceneDataWithImageGenPromptList,
        });

        const checkFinalResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);

        if (checkFinalResult) {
            return checkFinalResult;
        }

        // fire and forget
        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/process/video?taskId=${taskId}`, {
            method: 'POST',
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Video base images are successfully generated."
        })
    } catch (error) {
        console.error(error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to generate video base image.",
        })
    }
}