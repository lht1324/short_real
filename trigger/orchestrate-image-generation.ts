import { task, tasks } from "@trigger.dev/sdk/v3";
import { logger } from "@trigger.dev/sdk";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { postImage } from "@/trigger/post-image";
import {
    SceneData,
    SceneGenerationStatus,
    VideoGenerationTaskStatus
} from "@/lib/api/types/supabase/VideoGenerationTasks";
import { MasterStyleInfo } from "@/lib/api/types/supabase/MasterStyleInfo";
import { InitialEntityManifestItem } from "@/lib/api/types/open-ai/Entity";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { aiModelDataServerAPI } from "@/lib/api/server/aiModelDataServerAPI";
import { FalAIEndpointID } from "@/lib/falAIInputMapper";

export const orchestrateImageGeneration = task({
    id: "orchestrate-image-generation",
    maxDuration: 7200, // 2시간 (자식들의 재시도 시간을 충분히 기다려줌)
    run: async (payload: {
        taskId: string;
        videoTitle: string;
        videoDescription: string;
        masterStyleInfo: MasterStyleInfo;
        entityManifestList: InitialEntityManifestItem[];
        sceneDataList: SceneData[];
        styleId: string;
    }) => {
        const {
            taskId,
            videoTitle,
            videoDescription,
            masterStyleInfo,
            entityManifestList,
            sceneDataList,
            styleId,
        } = payload;

        try {
            logger.info(`[Orchestrator] Starting orchestration for Task: ${taskId} (${sceneDataList.length} scenes)`);

            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

            if (!videoGenerationTask || !videoGenerationTask.user_id || !videoGenerationTask.ai_model_config || !videoGenerationTask.resolution || !videoGenerationTask.aspect_ratio) {
                logger.error(`[Orchestrator] Task '${taskId}' not found`);

                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error(`Task '${taskId}' not found`);
            }

            const user = await usersServerAPI.getUserByUserId(videoGenerationTask.user_id);

            // 암호화된 값. 사용하는 시점에만 복호화해서 넣어주고 들고 다닐 땐 암호화 상태인 걸로.
            if (!user || !user.fal_ai_api_key) {
                logger.error(`[Orchestrator] User not found`);

                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error(`User not found`);
            }

            const falAiApiKey = user.fal_ai_api_key;
            const {
                ai_model_config: aiModelConfig,
                resolution,
                aspect_ratio: aspectRatio,
            } = videoGenerationTask;

            const sceneImageT2IAIModelData = await aiModelDataServerAPI.getAIModelDataById(aiModelConfig?.sceneImageT2IModelId);
            const sceneImageI2IAIModelData = sceneImageT2IAIModelData?.endpoint_id === FalAIEndpointID.KLING_IMAGE_V3_T2I
                ? sceneImageT2IAIModelData
                : await aiModelDataServerAPI.getAIModelDataById(aiModelConfig?.sceneImageI2IModelId);

            if (!sceneImageT2IAIModelData || !sceneImageI2IAIModelData) {
                logger.error(`[Orchestrator] AI model data not found`);

                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error(`AI model data are not found.`);
            }

            // 1. 이미지가 아직 생성되지 않은 대상 씬만 선별 (GENERATING_IMAGE 또는 FAILED 인 씬)
            const targetScenes = sceneDataList.filter((sceneData) => {
                return sceneData.status !== SceneGenerationStatus.GENERATING_VIDEO &&
                       sceneData.status !== SceneGenerationStatus.COMPLETED;
            });

            logger.info(`[Orchestrator] Target scenes for image generation: ${targetScenes.length}/${sceneDataList.length}`);

            let newSuccessfulRuns: Array<{
                output: {
                    sceneNumber: number;
                    imageGenPrompt: any;
                    imageGenPromptSentence: string;
                }
            }> = [];

            if (targetScenes.length > 0) {
                // Trigger 시스템이 각 자식 태스크의 재시도(Retry)를 알아서 관리함.
                const batchResults = await tasks.batchTriggerAndWait<typeof postImage>(
                    "post-image",
                    targetScenes.map(sceneData => ({
                        payload: {
                            taskId,
                            videoTitle,
                            videoDescription,
                            masterStyleInfo,
                            entityManifestList,
                            sceneData,
                            styleId,
                            falAiApiKey,
                            userId: videoGenerationTask.user_id,
                            sceneImageT2IAIModelEndpointId: sceneImageT2IAIModelData.endpoint_id,
                            sceneImageI2IAIModelEndpointId: sceneImageI2IAIModelData.endpoint_id,
                            resolution,
                            aspectRatio,
                        }
                    }))
                );

                // 결과 확인 (Fan-in)
                const failedRuns = batchResults.runs.filter(run => !run.ok);

                if (failedRuns.length > 0) {
                    logger.error(`[Orchestrator] ${failedRuns.length} scenes failed permanently after retries.`, {
                        failedRunIds: failedRuns.map(r => r.id),
                        errors: failedRuns.map(r => r.error)
                    });

                    // 실패한 씬은 status: FAILED로 DB에 기록하고 성공한 씬은 데이터 보존
                    const updatedSceneBreakdownList = sceneDataList.map((sceneData) => {
                        const isTarget = targetScenes.some(ts => ts.sceneNumber === sceneData.sceneNumber);
                        if (!isTarget) return sceneData;

                        const successRun = batchResults.runs.find(r => r.ok && r.output.sceneNumber === sceneData.sceneNumber);
                        if (successRun && successRun.ok) {
                            return {
                                ...sceneData,
                                imageGenPrompt: successRun.output.imageGenPrompt,
                                imageGenPromptSentence: successRun.output.imageGenPromptSentence,
                                status: SceneGenerationStatus.GENERATING_VIDEO,
                            };
                        } else {
                            return {
                                ...sceneData,
                                status: SceneGenerationStatus.FAILED,
                            };
                        }
                    });

                    await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                        scene_breakdown_list: updatedSceneBreakdownList,
                        is_generation_failed: true,
                    });

                    throw new Error(`${failedRuns.length} scenes failed permanently.`);
                }

                newSuccessfulRuns = batchResults.runs.filter((run): run is typeof run & { ok: true } => run.ok);
            }

            // 2. 새로 성공한 씬들의 프롬프트 데이터 맵 생성
            const newPromptMap = new Map(
                newSuccessfulRuns.map(run => [
                    run.output.sceneNumber,
                    {
                        imageGenPrompt: run.output.imageGenPrompt,
                        imageGenPromptSentence: run.output.imageGenPromptSentence,
                    }
                ])
            );

            // 3. 전체 씬 breakdown list 업데이트 (모든 씬 status: GENERATING_VIDEO로 전환)
            const finalSceneBreakdownList = sceneDataList.map((sceneData) => {
                const newPrompt = newPromptMap.get(sceneData.sceneNumber);
                return {
                    ...sceneData,
                    imageGenPrompt: newPrompt?.imageGenPrompt ?? sceneData.imageGenPrompt,
                    imageGenPromptSentence: newPrompt?.imageGenPromptSentence ?? sceneData.imageGenPromptSentence,
                    status: SceneGenerationStatus.GENERATING_VIDEO,
                };
            });

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                status: VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
                scene_breakdown_list: finalSceneBreakdownList,
                is_generation_failed: false,
            });

            // 4. 다음 단계(비디오 프롬프트 생성) 호출 (Fire-and-Forget)
            const baseUrl = process.env.BASE_URL;
            logger.info(`[Orchestrator] Triggering next step: ${baseUrl}/api/video/process/video`);

            internalFireAndForgetFetch(`${baseUrl}/api/video/process/video?taskId=${taskId}`, {
                method: 'POST',
            });

            return {
                success: true,
                message: "Image generation completed and next step triggered.",
                completedScenes: sceneDataList.length
            };
        } catch (error) {
            logger.error("[Orchestrator] Fatal error:", {
                error
            });
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            throw error;
        }
    }
});
