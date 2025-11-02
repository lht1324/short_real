import {NextRequest, NextResponse} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {SceneData, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";
import {imageServerAPI} from "@/api/server/imageServerAPI";

export async function POST(request: NextRequest) {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return NextResponse.json({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return NextResponse.json({
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
        const videoMainSubject = videoGenerationTask.video_main_subject;
        const masterStylePositivePromptInfo = videoGenerationTask.master_style_positive_prompt;
        const masterStyleNegativePrompt = videoGenerationTask.master_style_negative_prompt;

        if (!sceneDataList || !videoMainSubject || !masterStylePositivePromptInfo || !masterStyleNegativePrompt) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return NextResponse.json({
                success: false,
                status: 500,
                error: 'Scene data is invalid.'
            });
        }

        const sceneDataWithImageGenPromptPromiseList: Promise<SceneData>[] = sceneDataList.map(async (sceneData) => {
            const postImageGenPromptResult = await openAIServerAPI.postImageGenPrompt(
                sceneData.imageGenPromptDirective,
                // masterStylePositivePrompt,
                masterStylePositivePromptInfo,
                sceneData.narration,
                videoMainSubject,
            );

            if (!postImageGenPromptResult.success || !postImageGenPromptResult.imageGenPrompt) {
                throw new Error("Failed to generate image gen prompt");
            }

            return {
                ...sceneData,
                imageGenPrompt: postImageGenPromptResult.imageGenPrompt,
            };
        });
        const sceneDataWithImageGenPromptList = await Promise.all(sceneDataWithImageGenPromptPromiseList);

        for (let index = 0; index < sceneDataWithImageGenPromptList.length; index++) {
            const sceneData = sceneDataWithImageGenPromptList[index];
            const combinedMasterNegativeKeywords = `${masterStyleNegativePrompt}`.split(/\s*,\s*/);
            const uniqueMasterNegativeKeywordSet = new Set(combinedMasterNegativeKeywords);
            const uniqueMasterNegativePrompt = Array.from(uniqueMasterNegativeKeywordSet).join(", ");

            const postImageResult = await imageServerAPI.postImage(
                sceneData.imageGenPrompt as string,
                taskId,
                sceneData.sceneNumber,
                uniqueMasterNegativePrompt,
            );

            if (!postImageResult.success) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

                return NextResponse.json({
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
        fetch(`${process.env.BASE_URL}/api/video/process/video?taskId=${taskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch(error => {
            console.error('[/api/video/process/image] Fire and forget fetch error:', error);
        });

        return NextResponse.json({
            success: true,
            status: 200,
            message: "Video base images are successfully generated."
        })
    } catch (error) {
        console.error(error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return NextResponse.json({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to generate video base image.",
        })
    }
}