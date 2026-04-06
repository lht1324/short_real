import { logger, schedules } from "@trigger.dev/sdk/v3";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";

/**
 * Autopilot Orchestrator Task
 * This task is triggered by a schedule.
 */
export const autopilotUploadOrchestrator = schedules.task({
    id: "autopilot-upload-orchestrator",
    run: async (payload) => {
        logger.info(`[Autopilot] Upload Task triggered`, {
            scheduleId: payload.scheduleId,
            externalId: payload.externalId, // This will be our seriesId-upload
            timestamp: payload.timestamp,
        });

        const seriesId = payload.externalId?.replace('-upload', '');
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

        const autopilotData = series as AutopilotData & { current_generating_task_id?: string };
        const taskId = autopilotData.current_generating_task_id;

        if (!taskId) {
            logger.info(`[Autopilot] No current_generating_task_id found for series: ${seriesId}. Skipping.`);
            return { success: true, action: "skipped-no-task-id" };
        }

        // 2. Check if the video file exists in storage
        try {
            const finalFilePath = `${taskId}/${taskId}.mp4`;
            // This will throw or return an error if the file doesn't exist
            const videoUrl = await videoServerAPI.getVideoSignedUrl(finalFilePath, 3600);
            
            logger.info(`[Autopilot] Video found and ready for upload: ${taskId}`, { videoUrl });
            
            // TODO: Authenticate with platforms (YouTube, TikTok, Instagram)
            // TODO: Trigger actual upload/publish tasks for each platform
            // TODO: Update video task status to 'COMPLETED' or 'PUBLISHED'
            // TODO: [Optional] Clear current_generating_task_id after successful upload?
            
        } catch (error) {
            logger.warn(`[Autopilot] Video file not found or generation not finished for taskId: ${taskId}. Skipping.`, { error });
            return { success: true, action: "skipped-video-not-found" };
        }
        
        logger.info(`[Autopilot] Successfully finished upload orchestration for Series: ${seriesId}`);
        
        return {
            success: true,
            seriesId,
            taskId,
            action: "upload-orchestration-finished",
        };
    },
});
