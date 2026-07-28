import {NextRequest} from "next/server";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import {SceneData, SceneGenerationStatus, VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";
import {videoServerAPI} from "@/lib/api/server/videoServerAPI";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {delay} from "@/lib/utils/asyncUtils";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";
import {aiModelDataServerAPI} from "@/lib/api/server/aiModelDataServerAPI";

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

        if (!videoGenerationTask || !videoGenerationTask.ai_model_config || !videoGenerationTask.resolution || !videoGenerationTask.aspect_ratio) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video Generation Task not found.'
            });
        }

        const {
            ai_model_config: aiModelConfig,
            resolution,
            user_id: userId,
            aspect_ratio: aspectRatio,
        } = videoGenerationTask;

        if (!videoGenerationTask || !videoGenerationTask.ai_model_config || !videoGenerationTask.resolution || !videoGenerationTask.aspect_ratio) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video Generation Task not found.'
            });
        }

        const videoAIModelData = await aiModelDataServerAPI.getAIModelDataById(aiModelConfig.videoModelId);

        if (!videoAIModelData) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'There is no AI model selected by user.'
            });
        }

        const user = await usersServerAPI.getUserByUserId(userId);

        if (!user || !user.fal_ai_api_key) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video Generation Task not found.'
            });
        }

        const falAiApiKey = user.fal_ai_api_key;

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkResultInitialResult) {
            return checkResultInitialResult;
        }


        const sceneDataList = videoGenerationTask.scene_breakdown_list;

        // 이미 COMPLETED 상태인 씬은 비디오 생성에서 제외하고, 미완성/실패 씬만 선별
        const targetScenes = sceneDataList.filter((sceneData) => {
            return sceneData.status !== SceneGenerationStatus.COMPLETED;
        });

        console.log(`[Process Video] Target scenes to generate video: ${targetScenes.length}/${sceneDataList.length}`);

        // 미완성 씬들에 대해서만 LLM 비디오 프롬프트 생성 (이미 프롬프트가 존재하면 재활용)
        const targetSceneDataWithPromptPromiseList: Promise<SceneData>[] = targetScenes.map(async (sceneData) => {
            if (sceneData.videoGenPrompt) {
                return {
                    ...sceneData,
                    status: SceneGenerationStatus.GENERATING_VIDEO,
                };
            }

            const { data: imageData, error: imageError } = await supabase.storage
                .from("scene_image_temp_storage")
                .download(`${taskId}/${sceneData.sceneNumber}.jpeg`);

            if (imageError || !imageData) {
                throw new Error(`Supabase image download error for scene #${sceneData.sceneNumber}: ${imageError?.message}`);
            }

            const imageArrayBuffer = await imageData.arrayBuffer();
            const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');

            const postVideoGenPromptResult = await llmServerAPI.postVideoGenPrompt(
                sceneData.sceneNumber,
                imageBase64,
                sceneData.narration,
            );

            if (!postVideoGenPromptResult.success || !postVideoGenPromptResult.videoGenPrompt) {
                throw new Error(`Failed to generate video gen prompt for scene #${sceneData.sceneNumber}`);
            }

            return {
                ...sceneData,
                videoGenPrompt: postVideoGenPromptResult.videoGenPrompt,
                status: SceneGenerationStatus.GENERATING_VIDEO,
            };
        });

        const targetSceneDataWithPromptList = await Promise.all(targetSceneDataWithPromptPromiseList);

        // 프롬프트가 추가된 target 씬 데이터를 전체 sceneDataList와 병합
        const updatedSceneBreakdownList = sceneDataList.map((sceneData) => {
            const target = targetSceneDataWithPromptList.find(t => t.sceneNumber === sceneData.sceneNumber);
            return target ? target : sceneData;
        });

        const patchVideoGenerationTaskResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.GENERATING_VIDEO,
            scene_breakdown_list: updatedSceneBreakdownList,
            is_generation_failed: false,
        });

        const checkResultFirst = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskResult);
        if (checkResultFirst) {
            return checkResultFirst;
        }

        // target 씬들에 대해서만 Fal AI 비디오 생성 비동기 요청 (postVideo)
        const finalSceneDataList: SceneData[] = [];
        for (const sceneData of targetSceneDataWithPromptList) {
            const requestId = await videoServerAPI.postVideo(
                sceneData,
                taskId,
                userId,
                videoAIModelData,
                falAiApiKey,
                aspectRatio,
                resolution,
            );

            const { error } = await supabase.rpc('update_scene_request_id', {
                target_task_id: taskId,
                target_scene_number: sceneData.sceneNumber,
                new_request_id: requestId,
            });

            if (error) {
                console.error(`Scene #${sceneData.sceneNumber} requestId update error: `, error);
                throw Error(`Updating requestId of Scene #${sceneData.sceneNumber} is failed.`);
            }

            finalSceneDataList.push({
                ...sceneData,
                requestId: requestId,
            });

            await delay(200);
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