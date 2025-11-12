import {NextRequest, NextResponse} from "next/server";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {SceneData, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {findOptimalVideoParameters} from "@/utils/videoUtils";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function POST(request: NextRequest) {
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

            const {
                num_frames: numFrames,
                frames_per_second: framesPerSeconds,
                resulting_duration: videoActualDuration,
            } = findOptimalVideoParameters(sceneData.sceneDuration);

            const postVideoGenPromptResult = await openAIServerAPI.postVideoGenPrompt(
                sceneData.imageGenPrompt as string,
                sceneData.narration,
                imageBase64,
                numFrames,
                framesPerSeconds,
                videoActualDuration,
                sceneData.sceneDuration,
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


        const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.GENERATING_VIDEO);

        const checkResultFirst = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);

        if (checkResultFirst) {
            return checkResultFirst;
        }


        const finalSceneDataList: SceneData[] = await Promise.all(
            sceneDataWithVideoGenPromptList.map(async (sceneData): Promise<SceneData> => {
                const requestId = await videoServerAPI.postVideo(
                    sceneData,
                    taskId,
                );

                return {
                    ...sceneData,
                    requestId: requestId,
                }
            })
        );

        const patchVideoGenerationTaskResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: finalSceneDataList,
        });

        const checkResultSecond = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskResult);

        if (checkResultSecond) {
            return checkResultSecond;
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `${finalSceneDataList.length} scene's video generation requests completed. Task ID: ${patchVideoGenerationTaskResult.id}`
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