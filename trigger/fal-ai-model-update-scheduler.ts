import { logger, schedules } from "@trigger.dev/sdk/v3";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

/**
 * Fal AI Model Update Scheduler Task
 * This task is triggered by a schedule (e.g., every 48 hours).
 * It delegates the actual fetching and DB upserting to a Next.js API route
 * to save on Trigger.dev execution duration costs.
 */
export const falAiModelUpdateScheduler = schedules.task({
    id: "fal-ai-model-update-scheduler",
    run: async (payload) => {
        logger.info(`[AI Model Sync] Scheduler Task triggered`, {
            scheduleId: payload.scheduleId,
            timestamp: payload.timestamp,
        });

        // 내부 API 엔드포인트 URL 구성
        const appUrl = process.env.BASE_URL || "http://localhost:3000";
        const internalApiUrl = `${appUrl}/api/admin/ai-model`;
        const falApiUrl = "https://api.fal.ai/v1/models";

        // Vercel(Next.js) 엔드포인트에 동기화 작업 위임 (Fire and Forget)
        // Trigger.dev는 API 호출 직후 즉시 종료되어 비용을 최소화함.
        internalFireAndForgetFetch(
            internalApiUrl,
            { method: "POST" },
            { 
                source: "fal-ai-model-update-scheduler",
                target_url: falApiUrl
            }
        );

        logger.info(`[AI Model Sync] Successfully delegated to internal API: ${internalApiUrl}`);
    },
});
