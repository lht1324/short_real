import {logger, task } from "@trigger.dev/sdk/v3";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { taskCheckAndCleanupIfCancelled } from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import { VideoGenerationTaskStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { llmServerAPI } from "@/lib/api/server/llmServerAPI";
import { STYLE_DATA_LIST } from "@/lib/styles";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import {imageServerAPI} from "@/lib/api/server/imageServerAPI";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";

export const postMasterStyle = task({
    id: "post-master-style",
    // 1시간까지 실행 허용 (DeepSeek가 아무리 늦어도 충분함)
    maxDuration: 3600,
    retry: {
        maxAttempts: 3,      // 최대 3번까지 처음부터 다시 시도
        minTimeoutInMs: 2000, // 실패 후 2초 뒤 재시도
        maxTimeoutInMs: 30000, // 최대 30초까지 대기 시간 늘어남 (지수 백오프)
        factor: 2,
        randomize: true,
    },
    run: async (payload: { taskId: string }, { ctx }) => {
        const { taskId } = payload;
        console.log(`Starting master style generation for task: ${taskId}`);

        try {
            // 1. Task 정보 가져오기
            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

            if (!videoGenerationTask) {
                throw new Error('Video Generation Task not found.');
            }

            const user = await usersServerAPI.getUserByUserId(videoGenerationTask.user_id);
            if (!user || !user.fal_ai_api_key) {
                throw new Error('User or fal_ai_api_key not found.');
            }
            const falAiApiKey = user.fal_ai_api_key;

            // 취소 체크
            const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
            if (checkResultInitialResult) return { status: 'cancelled' };

            // 상태 업데이트: 생성 시작
            const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT);

            const checkInitialResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);
            if (checkInitialResult) return { status: 'cancelled' };

            // 데이터 준비
            const selectedStyleId = videoGenerationTask.selected_style_id;
            const selectedStyle = STYLE_DATA_LIST.find((styleData) => styleData.uiMetadata.id == selectedStyleId);
            const sceneDataList = videoGenerationTask.scene_breakdown_list;
            const lastSceneSubtitleSegmentList = sceneDataList.length !== 0
                ? sceneDataList[sceneDataList.length - 1].sceneSubtitleSegments ?? []
                : [];

            const videoTitle = videoGenerationTask.video_title;
            const videoDescription = videoGenerationTask.video_description;
            const videoDuration = lastSceneSubtitleSegmentList.length !== 0
                ? lastSceneSubtitleSegmentList[lastSceneSubtitleSegmentList.length - 1].endSec
                : undefined;

            const aiModelConfig = videoGenerationTask.ai_model_config;

            if (!selectedStyle || !videoTitle || !videoDescription || !videoDuration || !aiModelConfig) {
                throw new Error('Task data is invalid (missing required fields).');
            }

            // --- DeepSeek 호출 1: SceneCastingDataList ---
            // (여기서 시간이 오래 걸려도 안전함)
            const postSceneCastingListResult = await llmServerAPI.postSceneCastingDataList(
                sceneDataList.map((sceneData) => ({
                    sceneNumber: sceneData.sceneNumber,
                    sceneNarration: sceneData.narration,
                })),
                videoTitle,
                videoDescription,
                videoDuration,
            );

            if (!postSceneCastingListResult.success || !postSceneCastingListResult.sceneCastingDataList) {
                throw new Error(postSceneCastingListResult?.error?.message || 'Failed to generate sceneCastingDataList with OpenRouter');
            }

            // --- DeepSeek 호출 2: EntityManifestList ---
            const postEntityManifestListResult = await llmServerAPI.postEntityManifestList(
                sceneDataList.map((sceneData) => ({
                    sceneNumber: sceneData.sceneNumber,
                    sceneNarration: sceneData.narration,
                })),
                videoTitle,
                videoDescription,
                videoDuration,
                postSceneCastingListResult.sceneCastingDataList,
            );

            if (!postEntityManifestListResult.success || !postEntityManifestListResult.entityManifestList) {
                throw new Error(postEntityManifestListResult?.error?.message || 'Failed to generate entityManifestList with OpenRouter');
            }

            // // TEST!!
            // await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            //
            // return {
            //     success: true,
            //     message: "Generating EntityManifestList Test finished."
            // };

            const entityReferenceImagePromptList: {
                id: string;
                prompt: string;
            }[] = []
            const isSubjectExisting = postEntityManifestListResult.entityManifestList.some((entity) => {
                return entity.role === 'main_hero' || entity.role === 'sub_character';
            })

            if (isSubjectExisting) {
                const aiModelConfig = videoGenerationTask.ai_model_config;

                if (!aiModelConfig) {
                    throw new Error(`Task's AI Model config is invalid.`);
                }

                // --- DeepSeek 호출 3: EntityCharacterSheetPromptList ---
                const postEntityCharacterSheetPromptListResult = await llmServerAPI.postEntityReferenceImagePromptList(
                    postEntityManifestListResult.entityManifestList.filter((entity) => {
                        return entity.role === 'main_hero' || entity.role === 'sub_character';
                    }),
                    selectedStyle.uiMetadata.label,
                );

                if (!postEntityCharacterSheetPromptListResult.success || !postEntityCharacterSheetPromptListResult.entityReferenceImagePromptList) {
                    throw new Error(postEntityCharacterSheetPromptListResult?.error?.message || 'Failed to generate entityReferenceImagePromptList with OpenRouter');
                }

                entityReferenceImagePromptList.push(...postEntityCharacterSheetPromptListResult.entityReferenceImagePromptList);

                const referenceImageAIModelEndpointId = aiModelConfig.referenceImageModelId;
                const postReferenceImagePromiseList = entityReferenceImagePromptList.map(async (referenceImageData) => {
                    const {
                        id: entityId,
                        prompt: referenceImagePrompt,
                    } = referenceImageData;

                    return await imageServerAPI.postReferenceImage(
                        referenceImagePrompt,
                        taskId,
                        entityId,
                        falAiApiKey,
                        referenceImageAIModelEndpointId,
                        user.id
                    );
                });

                const referenceImageResults = await Promise.all(postReferenceImagePromiseList);

                const failedResults = referenceImageResults.filter((r) => !r.success);
                if (failedResults.length > 0) {
                    throw new Error(`Character sheet image generation failed for some entities.`);
                }
            }

            // // TEST!!
            // await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            //
            // return {
            //     success: true,
            //     message: "Generating EntityCharacterSheetPromptList Test finished."
            // };

            // --- DeepSeek 호출 4: MasterStyleInfo ---
            const postMasterStyleInfoResult = await llmServerAPI.postMasterStyleInfo(
                selectedStyle.generationParams,
                sceneDataList.map((sceneData) => ({
                    sceneNumber: sceneData.sceneNumber,
                    sceneNarration: sceneData.narration,
                })),
                videoTitle,
                videoDescription,
                videoDuration,
                postEntityManifestListResult.entityManifestList
            );

            if (!postMasterStyleInfoResult.success || !postMasterStyleInfoResult.masterStyleInfo) {
                throw new Error(postMasterStyleInfoResult?.error?.message || 'Failed to generate masterStyleInfo with OpenRouter');
            }

            // // TEST!!
            // await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            //
            // return {
            //     success: true,
            //     message: "Generating MasterStyleInfo Test finished."
            // };

            // 결과 저장 및 상태 업데이트
            const sceneCastingDataList = postSceneCastingListResult.sceneCastingDataList;
            const entityManifestList = postEntityManifestListResult.entityManifestList;
            const masterStylePositivePromptInfo = postMasterStyleInfoResult.masterStyleInfo;

            const patchVideoGenerationTaskStatusFinalResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                status: VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT,
                master_style_info: masterStylePositivePromptInfo,
                entity_manifest_list: entityManifestList.map((entity) => {
                    const referenceImageData = entityReferenceImagePromptList.find((referenceImagePromptData) => {
                        return referenceImagePromptData.id === entity.id;
                    });

                    return {
                        ...entity,
                        reference_image_prompt: referenceImageData?.prompt,
                    }
                }),
                scene_breakdown_list: sceneDataList.map((sceneData) => {
                    const sceneCastingData = sceneCastingDataList?.find((cd) => cd.sceneNumber === sceneData.sceneNumber);
                    return {
                        ...sceneData,
                        sceneVisualDescription: sceneCastingData?.sceneVisualDescription,
                        sceneCastingEntityIdList: sceneCastingData?.castIdList,
                    };
                })
            });

            const checkFinalResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusFinalResult);
            if (checkFinalResult) return { status: 'cancelled' };

            // 다음 단계 실행 (이미지 생성) - 기존처럼 Fire and Forget 호출
            // 주의: 로컬 환경에서는 localhost URL이 필요할 수 있음
            const baseUrl = process.env.BASE_URL;
            internalFireAndForgetFetch(`${baseUrl}/api/video/process/image?taskId=${taskId}`, {
                method: 'POST',
            });

            return {
                success: true,
                message: "Master Style Prompt generated successfully"
            };
        } catch (error) {
            logger.error("Task failed:", {
                error: error
            });

            // [핵심 로직] 마지막 시도인지 확인
            // ctx.attempt.number: 현재 시도 횟수 (1, 2, 3...)
            // ctx.task.retry.maxAttempts: 설정된 최대 횟수 (여기서는 3)
            // 주의: ctx 구조는 버전에 따라 다를 수 있으므로 안전하게 접근하거나 하드코딩된 값(3)과 비교해도 됩니다.

            const currentAttempt = ctx.attempt.number;
            const maxAttempts = 3; // 위 retry 설정과 동일하게 맞춤

            if (currentAttempt >= maxAttempts) {
                // [마지막 시도] 이제 진짜 망했음 -> DB에 실패 상태 기록
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                logger.error(`Task permanently failed after ${maxAttempts} attempts.`);
            } else {
                // [재시도 예정] DB 업데이트 안 함 (사용자는 여전히 '생성 중'으로 봄)
                // Trigger 대시보드에는 에러가 찍히지만, 재시도 스케줄링됨
                logger.warn(`Attempt ${currentAttempt} failed. Retrying...`);
            }

            // Trigger 시스템에게 "이 시도는 실패했다"고 알려줌 -> 재시도 트리거
            throw error;
        }
    },
});