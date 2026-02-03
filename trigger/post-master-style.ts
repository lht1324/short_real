import { task } from "@trigger.dev/sdk/v3";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { taskCheckAndCleanupIfCancelled } from "@/utils/taskCheckAndCleanupIfCancelled";
import { VideoGenerationTaskStatus } from "@/api/types/supabase/VideoGenerationTasks";
import { llmServerAPI } from "@/api/server/llmServerAPI";
import { STYLE_DATA_LIST } from "@/lib/styles";
import { usersServerAPI } from "@/api/server/usersServerAPI";
import { internalFireAndForgetFetch } from "@/utils/internalFetch";

export const postMasterStyle = task({
    id: "post-master-style",
    // 1시간까지 실행 허용 (DeepSeek가 아무리 늦어도 충분함)
    maxDuration: 3600,
    run: async (payload: { taskId: string }, { ctx }) => {
        const { taskId } = payload;
        console.log(`Starting master style generation for task: ${taskId}`);

        try {
            // 1. Task 정보 가져오기
            const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

            if (!videoGenerationTask) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error('Video Generation Task not found.');
            }

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

            if (!selectedStyle || !videoTitle || !videoDescription || !videoDuration) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error('Task data is invalid (missing required fields).');
            }

            // --- DeepSeek 호출 1: Entity Casting ---
            // (여기서 시간이 오래 걸려도 안전함)
            const postEntityCastingResult = await llmServerAPI.postEntityCasting(
                sceneDataList.map((sceneData) => ({
                    sceneNumber: sceneData.sceneNumber,
                    sceneNarration: sceneData.narration,
                })),
                videoTitle,
                videoDescription,
                videoDuration,
            );

            if (!postEntityCastingResult.success || !postEntityCastingResult.sceneCastingDataList || !postEntityCastingResult.entityManifestList) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error(postEntityCastingResult?.error?.message || 'Failed to generate casting data with OpenAI');
            }

            // --- DeepSeek 호출 2: Master Style Info ---
            const postMasterStyleInfoResult = await llmServerAPI.postMasterStyleInfo(
                selectedStyle.generationParams,
                sceneDataList.map((sceneData) => ({
                    sceneNumber: sceneData.sceneNumber,
                    sceneNarration: sceneData.narration,
                })),
                videoTitle,
                videoDescription,
                videoDuration,
                postEntityCastingResult.entityManifestList
            );

            if (!postMasterStyleInfoResult.success || !postMasterStyleInfoResult.masterStyleInfo) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                throw new Error(postMasterStyleInfoResult?.error?.message || 'Failed to generate master style with OpenAI');
            }

            // TEST!!
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return {
                success: true,
                message: "Generating MasterStyle Test finished."
            };

            // // 결과 저장 및 상태 업데이트
            // const masterStylePositivePromptInfo = postMasterStyleInfoResult.masterStyleInfo;
            // const entityManifestList = postEntityCastingResult.entityManifestList;
            // const sceneCastingDataList = postEntityCastingResult.sceneCastingDataList;
            //
            // const patchVideoGenerationTaskStatusFinalResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            //     status: VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT,
            //     master_style_info: masterStylePositivePromptInfo,
            //     entity_manifest_list: entityManifestList,
            //     scene_breakdown_list: sceneDataList.map((sceneData) => {
            //         const sceneCastingData = sceneCastingDataList?.find((cd) => cd.sceneNumber === sceneData.sceneNumber);
            //         return {
            //             ...sceneData,
            //             sceneVisualDescription: sceneCastingData?.sceneVisualDescription,
            //             sceneCastingEntityIdList: sceneCastingData?.castIdList,
            //         };
            //     })
            // });
            //
            // // 크레딧 차감 로직
            // const sceneCount = sceneDataList.length;
            // const totalDuration = sceneDataList.reduce((acc, sceneData) => acc + sceneData.sceneDuration, 0);
            // const additionalTotalDurationUsage = totalDuration > 30 ? Math.ceil((totalDuration - 30) / 2) * 5 : 0;
            // const additionalSceneCountUsage = sceneCount > 6 ? (sceneCount - 6) * 5 : 0;
            // const creditUsage = 100 + additionalTotalDurationUsage + additionalSceneCountUsage;
            //
            // const patchUserCreditCountResult = await usersServerAPI.patchUserCreditCountByUserId(videoGenerationTask.user_id, -creditUsage);
            //
            // if (!patchUserCreditCountResult) {
            //     // 크레딧 차감 실패 시에도 일단 진행? 혹은 에러? (기존 로직 따름)
            //     throw new Error('Failed to patch user credit count.');
            // }
            //
            // const checkFinalResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusFinalResult);
            // if (checkFinalResult) return { status: 'cancelled' };
            //
            // // 다음 단계 실행 (이미지 생성) - 기존처럼 Fire and Forget 호출
            // // 주의: 로컬 환경에서는 localhost URL이 필요할 수 있음
            // const baseUrl = process.env.BASE_URL || "http://localhost:3000";
            // internalFireAndForgetFetch(`${baseUrl}/api/video/process/image?taskId=${taskId}`, {
            //     method: 'POST',
            // });
            //
            // return {
            //     success: true,
            //     message: "Master Style Prompt generated successfully"
            // };
        } catch (error) {
            console.error("Task failed:", error);
            // 에러 발생 시 DB에 실패 상태 기록 (중복 호출 방지 위해 catch 블록에서도 처리)
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            throw error; // Trigger 대시보드에 실패로 표시되게 던짐
        }
    },
});