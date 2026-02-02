import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {SceneData, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {llmServerAPI} from "@/api/server/llmServerAPI";
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
        const masterStyleInfo = videoGenerationTask.master_style_info;
        const entityManifestList = videoGenerationTask.entity_manifest_list;
        const styleId = videoGenerationTask.selected_style_id;

        if (!sceneDataList || !videoTitle || !videoDescription || !masterStyleInfo || !entityManifestList || !styleId) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Scene data is invalid.'
            });
        }

        const sceneDataWithImageGenPromptPromiseList: Promise<SceneData>[] = sceneDataList.map(async (sceneData) => {
            console.log(`Scene #${sceneData.sceneNumber} postImageGenPrompt() is executed.`);
            const postImageGenPromptResult = await llmServerAPI.postImageGenPrompt(
                sceneData.imageGenPromptDirective,
                masterStyleInfo,
                sceneData.narration,
                sceneData.sceneNumber,
                videoTitle,
                videoDescription,
                entityManifestList.filter((entity) => {
                    return sceneData.sceneCastingEntityIdList?.includes(entity.id) === true;
                }),
                sceneData.sceneVisualDescription ?? sceneData.imageGenPromptDirective,
                styleId,
            );

            if (!postImageGenPromptResult.success || !postImageGenPromptResult.imageGenPrompt || !postImageGenPromptResult.imageGenPromptSentence) {
                throw new Error(`Scene #${sceneData.sceneNumber} error: ${postImageGenPromptResult.error?.message ?? "Failed to generate image gen prompt"}`);
            }

            return {
                ...sceneData,
                imageGenPrompt: postImageGenPromptResult.imageGenPrompt,
                imageGenPromptSentence: postImageGenPromptResult.imageGenPromptSentence,
                sceneEntityManifestList: postImageGenPromptResult.sceneEntityManifestList,
            };
        });
        const sceneDataWithImageGenPromptList = await Promise.all(sceneDataWithImageGenPromptPromiseList);

        // TEST!!
        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Generating ImageGenPrompt Test finished."
        });

        // for (const sceneData of sceneDataWithImageGenPromptList) {
        //     console.log(`Scene #${sceneData.sceneNumber} postImage() is executed.`);
        //
        //     if (!sceneData.imageGenPrompt || !sceneData.imageGenPromptSentence) {
        //         await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        //
        //         return getNextBaseResponse({
        //             success: false,
        //             status: 404,
        //             error: `Scene #${sceneData.sceneNumber} imageGenPrompt is not exist.`
        //         });
        //     }
        //
        //     const postImageResult = await imageServerAPI.postImage(
        //         sceneData.imageGenPrompt,
        //         sceneData.imageGenPromptSentence,
        //         taskId,
        //         sceneData.sceneNumber,
        //     );
        //
        //     if (!postImageResult.success) {
        //         await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        //
        //         return getNextBaseResponse({
        //             success: false,
        //             status: 500,
        //             error: 'Failed to generate image with Imagen 4.'
        //         });
        //     }
        // }
        //
        // const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
        //     status: VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
        //     scene_breakdown_list: sceneDataWithImageGenPromptList,
        // });
        //
        // const checkFinalResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);
        //
        // if (checkFinalResult) {
        //     return checkFinalResult;
        // }
        //
        // // fire and forget
        // internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/process/video?taskId=${taskId}`, {
        //     method: 'POST',
        // });
        //
        // return getNextBaseResponse({
        //     success: true,
        //     status: 200,
        //     message: "Video base images are successfully generated."
        // });
    } catch (error) {
        console.error(error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to generate video base image.",
        });
    }
}