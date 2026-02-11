import { task } from "@trigger.dev/sdk/v3";
import { llmServerAPI } from "@/api/server/llmServerAPI";
import { imageServerAPI } from "@/api/server/imageServerAPI";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { logger } from "@trigger.dev/sdk";
import { MasterStyleInfo } from "@/api/types/supabase/MasterStyleInfo";
import { InitialEntityManifestItem } from "@/api/types/open-ai/Entity";
import { SceneData } from "@/api/types/supabase/VideoGenerationTasks";

export const postImage = task({
    id: "post-image",
    maxDuration: 1800, // 30분 (LLM + 이미지 생성까지 고려하여 넉넉히)

    // [핵심] 자동 재시도 정책
    // 네트워크 오류나 일시적 장애 시 Trigger가 알아서 재시도함
    retry: {
        maxAttempts: 3,        // 최대 3번 시도 (처음 + 재시도 2회)
        minTimeoutInMs: 2000,  // 2초 대기
        maxTimeoutInMs: 30000, // 최대 30초 대기
        factor: 2,             // 2초 -> 4초 -> 8초 (지수 백오프)
        randomize: true,       // 랜덤 딜레이 (동시 재시도 방지)
    },

    // 동시성 제어 (과부하 방지)
    queue: {
        concurrencyLimit: 10, // 동시에 10개 장면까지만 처리
    },

    run: async (payload: {
        taskId: string; // 이미지 생성 시 필요하므로 추가
        videoTitle: string;
        videoDescription: string;
        masterStyleInfo: MasterStyleInfo;
        entityManifestList: InitialEntityManifestItem[];
        sceneData: SceneData;
        styleId: string;
    }) => {
        const {
            taskId,
            videoTitle,
            videoDescription,
            masterStyleInfo,
            entityManifestList,
            sceneData,
            styleId,
        } = payload;

        try {
            logger.info(`[Scene #${sceneData.sceneNumber}] Starting process (LLM + Image Gen)...`);

            // ----------------------------------------------------------------
            // 1. LLM 이미지 프롬프트 생성 (기존 로직)
            // ----------------------------------------------------------------
            logger.info(`[Scene #${sceneData.sceneNumber}] Generating prompt with LLM...`);

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
                // 에러 메시지를 명확히 해서 던짐 (Trigger 대시보드에서 확인 용이)
                throw new Error(`LLM Prompt Generation Failed: ${postImageGenPromptResult.error?.message ?? "Unknown error"}`);
            }

            logger.info(`[Scene #${sceneData.sceneNumber}] Prompt generated successfully.`);

            // TEST !!
            return {
                success: true,
                sceneNumber: sceneData.sceneNumber,
                // LLM 결과
                imageGenPrompt: postImageGenPromptResult.imageGenPrompt,
                imageGenPromptSentence: postImageGenPromptResult.imageGenPromptSentence,
                sceneEntityManifestList: postImageGenPromptResult.sceneEntityManifestList,
            };
            // // ----------------------------------------------------------------
            // // 2. 실제 이미지 생성 (기존 테스트 코드 복원 및 적용)
            // // ----------------------------------------------------------------
            // logger.info(`[Scene #${sceneData.sceneNumber}] Generating actual image...`);
            //
            // const postImageResult = await imageServerAPI.postImage(
            //     postImageGenPromptResult.imageGenPrompt,
            //     postImageGenPromptResult.imageGenPromptSentence,
            //     taskId,
            //     sceneData.sceneNumber,
            // );
            //
            // if (!postImageResult.success) {
            //     // 이미지 생성 실패 시 에러 던짐 -> 재시도 트리거
            //     throw new Error(`Image Generation Failed: ${postImageResult.error?.message ?? "Unknown error"}`);
            // }
            //
            // logger.info(`[Scene #${sceneData.sceneNumber}] All steps completed successfully.`);
            //
            // // Orchestrator에게 반환할 최종 결과
            // return {
            //     success: true,
            //     sceneNumber: sceneData.sceneNumber,
            //     // LLM 결과
            //     imageGenPrompt: postImageGenPromptResult.imageGenPrompt,
            //     imageGenPromptSentence: postImageGenPromptResult.imageGenPromptSentence,
            //     sceneEntityManifestList: postImageGenPromptResult.sceneEntityManifestList,
            // };
        } catch (error) {
            logger.error(`[Scene #${sceneData.sceneNumber}] Process Failed:`, {
                error
            });
            // 여기서 에러를 다시 던져야 Trigger 시스템이 "아, 실패했구나" 하고 재시도를 스케줄링함
            throw error;
        }
    }
});
