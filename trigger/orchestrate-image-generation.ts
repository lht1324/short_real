import { task, tasks } from "@trigger.dev/sdk/v3";
import { logger } from "@trigger.dev/sdk";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { postImage } from "@/trigger/post-image";
import { SceneData, VideoGenerationTaskStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { MasterStyleInfo } from "@/lib/api/types/supabase/MasterStyleInfo";
import { InitialEntityManifestItem } from "@/lib/api/types/open-ai/Entity";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

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

            // 1. N개의 자식 태스크 병렬 실행 및 대기 (Fan-out & Wait)
            // Trigger 시스템이 각 자식 태스크의 재시도(Retry)를 알아서 관리함.
            // 여기서는 모든 자식이 '최종 성공'하거나 '최종 실패'할 때까지 기다림.
            const batchResults = await tasks.batchTriggerAndWait<typeof postImage>(
                "post-image", // 1. 태스크 ID (문자열)
                sceneDataList.map(sceneData => ({ // 2. 아이템 배열
                    payload: {
                        taskId,
                        videoTitle,
                        videoDescription,
                        masterStyleInfo,
                        entityManifestList,
                        sceneData,
                        styleId,
                    }
                }))
            );

            // 2. 결과 확인 (Fan-in)
            const successfulRuns = batchResults.runs.filter(run => run.ok);
            const failedRuns = batchResults.runs.filter(run => !run.ok);

            if (failedRuns.length > 0) {
                // 3-1. 하나라도 최종 실패 시 (재시도 횟수 초과) -> 전체 실패 처리
                const failedSceneNumbers = failedRuns.map(run => {
                    // 에러 메시지나 페이로드에서 씬 번호 추적 가능하면 좋음
                    return run.id;
                });

                logger.error(`[Orchestrator] ${failedRuns.length} scenes failed permanently after retries.`, {
                    failedRunIds: failedSceneNumbers,
                    errors: failedRuns.map(r => r.error)
                });

                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error(`${failedRuns.length} scenes failed permanently.`);
            }

            // 3-2. 전부 성공 시 -> 다음 단계 진행
            logger.info(`[Orchestrator] All ${successfulRuns.length} scenes completed successfully.`);

            // // TEST !!
            // await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            // return {
            //     success: true,
            //     message: "Image generation test completed and next step triggered.",
            //     completedScenes: successfulRuns.length
            // };

            const imageGenPromptDataList = successfulRuns.map((run) => {
                const {
                    sceneNumber,
                    imageGenPrompt,
                    imageGenPromptSentence,
                } = run.output;

                return {
                    sceneNumber,
                    imageGenPrompt,
                    imageGenPromptSentence,
                };
            })
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                status: VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT,
                scene_breakdown_list: sceneDataList.map((sceneData) => {
                    const imageGenPromptData = imageGenPromptDataList.find((imageGenPromptData) => {
                        return imageGenPromptData.sceneNumber === sceneData.sceneNumber;
                    });

                    if (!imageGenPromptData) {
                        throw Error("ImageGenPromptDataList is invalid.");
                    }

                    const {
                        imageGenPrompt,
                        imageGenPromptSentence,
                    } = imageGenPromptData;

                    return {
                        ...sceneData,
                        imageGenPrompt: imageGenPrompt,
                        imageGenPromptSentence: imageGenPromptSentence,
                    };
                })
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
                completedScenes: successfulRuns.length
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
