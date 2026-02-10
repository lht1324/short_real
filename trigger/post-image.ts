import { task } from "@trigger.dev/sdk/v3";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { taskCheckAndCleanupIfCancelled } from "@/utils/taskCheckAndCleanupIfCancelled";
import { SceneData, VideoGenerationTaskStatus } from "@/api/types/supabase/VideoGenerationTasks";
import { llmServerAPI } from "@/api/server/llmServerAPI";
import { internalFireAndForgetFetch } from "@/utils/internalFetch";
import { imageServerAPI } from "@/api/server/imageServerAPI";
import { logger } from "@trigger.dev/sdk";

export const postImage = task({
    id: "post-image",
    maxDuration: 3600,
    run: async (payload: { taskId: string }, { ctx }) => {
        const { taskId } = payload;
        logger.info(`Starting image generation for task: ${taskId}`);

        try {
            // 1. Task 정보 가져오기
            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
            if (!videoGenerationTask) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error('Video Generation Task not found.');
            }

            const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
            if (checkResultInitialResult) return { status: 'cancelled' };

            // 2. 데이터 추출
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

            // 3. 이미지 프롬프트 생성 (LLM) - 병렬 처리
            logger.info("Generating image prompts with LLM...");
            const sceneDataWithImageGenPromptPromiseList = sceneDataList.map(async (sceneData) => {
                logger.info(`Scene #${sceneData.sceneNumber} postImageGenPrompt() is executed.`);

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

            return {
              success: true,
              message: "Generating ImageGenPrompt Test finished."
            };

            // // 4. 실제 이미지 생성
            // logger.info("Generating images...");
            // for (const sceneData of sceneDataWithImageGenPromptList) {
            //     logger.info(`Scene #${sceneData.sceneNumber} postImage() is executed.`);
            //
            //     if (!sceneData.imageGenPrompt || !sceneData.imageGenPromptSentence) {
            //         await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            //         throw new Error(`Scene #${sceneData.sceneNumber} imageGenPrompt is not exist.`);
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
            //         throw new Error('Failed to generate image.');
            //     }
            // }
            //
            // // 5. 상태 업데이트
            // const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            //     status: VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
            //     scene_breakdown_list: sceneDataWithImageGenPromptList as SceneData[],
            // });
            //
            // const checkFinalResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);
            // if (checkFinalResult) return { status: 'cancelled' };
            //
            // // 6. 다음 단계 실행 (Video Prompt 생성) - Fire and Forget
            // const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            // internalFireAndForgetFetch(`${baseUrl}/api/video/process/video?taskId=${taskId}`, {
            //     method: 'POST',
            // });
            //
            // return {
            //     success: true,
            //     message: "Video base images are successfully generated."
            // };
        } catch (error) {
            console.error(error);
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            throw error;
        }
    },
});