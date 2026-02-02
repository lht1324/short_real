import {NextRequest} from "next/server";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {SceneData, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {llmServerAPI} from "@/api/server/llmServerAPI";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {delay} from "@/utils/asyncUtils";
import {getIsValidRequestS2S} from "@/utils/getIsValidRequest";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const supabase = createSupabaseServiceRoleClient();

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
        const masterStyleInfo = videoGenerationTask.master_style_info;
        const videoTitle = videoGenerationTask.video_title;
        const videoDescription = videoGenerationTask.video_description;

        if (!masterStyleInfo) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video visual data not found.'
            });
        }

        if (!videoTitle || !videoDescription) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video metadata not found.'
            });
        }

        const sceneDataWithVideoGenPromptPromiseList: Promise<SceneData>[] = sceneDataList.map(async (sceneData) => {
            const { data: imageData, error: imageError } = await supabase.storage
                .from("scene_image_temp_storage")
                .download(`${taskId}/${sceneData.sceneNumber}.jpeg`)

            if (imageError) {
                throw new Error(`Supabase download error: ${imageError.message}`);
            }

            if (!imageData) {
                throw new Error('No data received from Supabase');
            }

            // Blob을 ArrayBuffer로 변환
            const imageArrayBuffer = await imageData.arrayBuffer();

            // ArrayBuffer를 Base64로 인코딩
            const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');

            const imageGenPrompt = sceneData.imageGenPrompt;
            const sceneEntityManifestList = sceneData.sceneEntityManifestList ?? [];

            if (!imageGenPrompt) {
                throw new Error('Image metadata is invalid.');
            }

            const postVideoGenPromptResult = await llmServerAPI.postVideoGenPrompt(
                sceneData.narration,
                sceneData.sceneNumber,
                imageBase64,
                sceneData.sceneDuration,
                masterStyleInfo,
                videoTitle,
                videoDescription,
                imageGenPrompt,
                sceneEntityManifestList.filter((entity) => {
                    return sceneData.sceneCastingEntityIdList?.includes(entity.id) === true;
                }),
            );

            if (!postVideoGenPromptResult.success || !postVideoGenPromptResult.videoGenPrompt) {
                throw new Error("Failed to generate video gen prompt");
            }

            return {
                ...sceneData,
                videoGenPrompt: postVideoGenPromptResult.videoGenPrompt,
            }
        });
        const sceneDataWithVideoGenPromptList = await Promise.all(sceneDataWithVideoGenPromptPromiseList);

        // // TEST!!
        // await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        //
        // return getNextBaseResponse({
        //     success: true,
        //     status: 200,
        //     message: "Generating VideoGenPrompt Test finished."
        // })

        const patchVideoGenerationTaskResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.GENERATING_VIDEO,
            scene_breakdown_list: sceneDataWithVideoGenPromptList,
        })

        const checkResultFirst = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskResult);

        if (checkResultFirst) {
            return checkResultFirst;
        }

        const finalSceneDataList: SceneData[] = [];

        for (const sceneData of sceneDataWithVideoGenPromptList) {
            const requestId = await videoServerAPI.postVideo(
                sceneData,
                taskId,
            );

            const { error } = await supabase.rpc('update_scene_request_id', {
                target_task_id: taskId,
                target_scene_number: sceneData.sceneNumber,
                new_request_id: requestId,
            })

            if (error) {
                console.error(`Scene #${sceneData.sceneNumber} requestId update error: `, error);
                throw Error(`Updating requestId of Scene #${sceneData.sceneNumber} is failed.`)
            }

            finalSceneDataList.push({
                ...sceneData,
                requestId: requestId,
            })

            await delay(200);
            // Replicate 잔고 부족으로 오는 429니 의미가 없음 (분 당 6회 제한)
            // await delay(1000);
        }

        // const patchVideoGenerationTaskResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
        //     scene_breakdown_list: finalSceneDataList,
        // });

        const patchedVideoGenerationTaskResult = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!patchedVideoGenerationTaskResult) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video Generation Task not found.'
            });
        }

        const checkResultSecond = await taskCheckAndCleanupIfCancelled(patchedVideoGenerationTaskResult);

        if (checkResultSecond) {
            return checkResultSecond;
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `${finalSceneDataList.length} scene's video generation requests completed. Task ID: ${patchedVideoGenerationTaskResult.id}`
        });
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