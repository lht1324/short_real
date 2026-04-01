import { logger, schedules } from "@trigger.dev/sdk/v3";
import { internalFireAndForgetFetch } from "@/utils/internalFetch";

/**
 * Autopilot Orchestrator Task
 * This task is triggered by a schedule.
 * It triggers the video generation pipeline by calling the video-metadata endpoint.
 */
export const autopilotGenerationOrchestrator = schedules.task({
    id: "autopilot-generation-orchestrator",
    run: async (payload) => {
        logger.info(`[Autopilot] Generation Task triggered`, {
            scheduleId: payload.scheduleId,
            externalId: payload.externalId, // This will be our seriesId
            timestamp: payload.timestamp,
        });

        const seriesId = payload.externalId?.replace('-generation', '');
        if (!seriesId) {
            logger.error("[Autopilot] Missing seriesId (externalId) in payload");
            return;
        }

        // 1. Construct the internal API URL
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            logger.error("[Autopilot] BASE_URL environment variable is missing");
            throw new Error("BASE_URL is missing");
        }
        
        const url = `${baseUrl}/api/autopilot/video-metadata?seriesId=${seriesId}`;
        
        logger.info(`[Autopilot] Triggering video-metadata generation for Series: ${seriesId}`, { url });

        // 2. Trigger the API (Fire and Forget)
        internalFireAndForgetFetch(url, {
            method: 'POST',
        });

        // 3. Short delay (2 seconds) to ensure the network request is sent before the task exits
        // This acts as a "poor man's waitUntil" in the Trigger.dev worker environment.
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        logger.info(`[Autopilot] Successfully dispatched generation signal for Series: ${seriesId}`);

        return {
            success: true,
            seriesId,
            action: "video-metadata-triggered",
        }
    },
});
