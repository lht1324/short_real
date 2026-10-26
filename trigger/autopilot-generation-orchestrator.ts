import { logger, schedules } from "@trigger.dev/sdk/v3";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIntendedUploadTime, isSameDayInTimezone } from "@/lib/utils/dateUtils";
import { getNeonDb } from "@/lib/db/neon";
import { autopilotData } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

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
            externalId: payload.externalId, // This will be our seriesId-generation
            timestamp: payload.timestamp,
        });

        const seriesId = payload.externalId?.replace('-generation', '');
        if (!seriesId) {
            logger.error("[Autopilot] Missing seriesId (externalId) in payload");
            return;
        }

        // 1. Fetch Autopilot Data from Neon
        const db = getNeonDb();
        const [series] = await db
            .select()
            .from(autopilotData)
            .where(eq(autopilotData.id, seriesId))
            .limit(1);

        if (!series) {
            logger.error(`[Autopilot] Failed to fetch autopilot data for series: ${seriesId}`);
            return { success: false, error: "Series not found" };
        }

        const seriesData = series as unknown as AutopilotData;

        // 2. Activation Check
        if (!seriesData.is_active) {
            logger.info(`[Autopilot] Skipping generation: Series is not active`, { seriesId });
            return {
                success: true,
                seriesId,
                action: "skipped-inactive",
            };
        }

        // 3. Idempotency Check (Only run once per target upload day)
        // Note: payload.timestamp is the scheduled trigger time (generation start)
        const targetUploadTime = getIntendedUploadTime(payload.timestamp, 2);
        const userTimezone = seriesData.user_timezone || 'UTC';

        if (process.env.NODE_ENV === "production" && seriesData.last_run_at) {
            const lastRunAt = new Date(seriesData.last_run_at);
            const isSameDay = isSameDayInTimezone(lastRunAt, targetUploadTime, userTimezone);

            if (isSameDay) {
                logger.info(`[Autopilot] Skipping generation: Already run today for target upload date`, {
                    seriesId,
                    lastRunAt: seriesData.last_run_at,
                    targetUploadTime: targetUploadTime.toISOString(),
                    userTimezone
                });
                return {
                    success: true,
                    seriesId,
                    action: "skipped-already-run-today",
                };
            }
        }

        // 3. Update last_run_at (Mark as started for this target upload time)
        // We save the 'targetUploadTime' (not execution time) to represent the business day.
        try {
            await db
                .update(autopilotData)
                .set({ last_run_at: targetUploadTime.toISOString() })
                .where(eq(autopilotData.id, seriesId));
        } catch (updateError) {
            logger.warn(`[Autopilot] Failed to update last_run_at for series: ${seriesId}`, { updateError });
            // We continue anyway, but log the warning.
        }

        // 4. Construct the internal API URL
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            logger.error("[Autopilot] BASE_URL environment variable is missing");
            throw new Error("BASE_URL is missing");
        }
        
        const url = `${baseUrl}/api/autopilot/video-metadata?seriesId=${seriesId}`;
        
        logger.info(`[Autopilot] Triggering video-metadata generation for Series: ${seriesId}`, { url });

        // 5. Trigger the API (Fire and Forget)
        internalFireAndForgetFetch(url, {
            method: 'POST',
        });

        // 6. Short delay (2 seconds) to ensure the network request is sent before the task exits
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        logger.info(`[Autopilot] Successfully dispatched generation signal for Series: ${seriesId}`);

        return {
            success: true,
            seriesId,
            action: "video-metadata-triggered",
        }
    },
});
