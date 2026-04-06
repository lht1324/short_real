import { logger, schedules } from "@trigger.dev/sdk/v3";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIntendedUploadTime, isSameDayInTimezone } from "@/lib/utils/dateUtils";

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

        // 1. Fetch Autopilot Data from Supabase
        const supabase = createSupabaseServiceRoleClient();
        const { data: series, error: fetchError } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (fetchError || !series) {
            logger.error(`[Autopilot] Failed to fetch autopilot data for series: ${seriesId}`, { fetchError });
            return { success: false, error: "Series not found" };
        }

        const autopilotData = series as AutopilotData;

        // 2. Idempotency Check (Only run once per target upload day)
        // Note: payload.timestamp is the scheduled trigger time (generation start)
        const targetUploadTime = getIntendedUploadTime(payload.timestamp, 2);
        const userTimezone = autopilotData.user_timezone || 'UTC';

        if (autopilotData.last_run_at) {
            const lastRunAt = new Date(autopilotData.last_run_at);
            const isSameDay = isSameDayInTimezone(lastRunAt, targetUploadTime, userTimezone);

            if (isSameDay) {
                logger.info(`[Autopilot] Skipping generation: Already run today for target upload date`, {
                    seriesId,
                    lastRunAt: autopilotData.last_run_at,
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
        const { error: updateError } = await supabase
            .from('autopilot_data')
            .update({ last_run_at: targetUploadTime.toISOString() })
            .eq('id', seriesId);

        if (updateError) {
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
