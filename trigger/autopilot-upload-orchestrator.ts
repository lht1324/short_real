import { logger, schedules } from "@trigger.dev/sdk/v3";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

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
            const finalFilePath = `${taskId}/${taskId}_final.mp4`;
            // This will throw or return an error if the file doesn't exist
            const videoUrl = await videoServerAPI.getVideoSignedUrl(finalFilePath, 3600);
            
            logger.info(`[Autopilot] Video found and ready for upload: ${taskId}`, { videoUrl });
            
            // 3. Trigger actual upload/publish tasks for each platform (Fire and Forget)
            const baseUrl = process.env.BASE_URL;
            let triggeredCount = 0;

            // YouTube Upload
            if (autopilotData.platforms?.youtube) {
                const privacySetting = autopilotData.platforms?.youtube_privacy || 'unlisted';
                const youtubeUrl = `${baseUrl}/api/video/export/youtube/upload?taskId=${taskId}&privacySetting=${privacySetting}`;
                
                logger.info(`[Autopilot] Triggering YouTube upload for taskId: ${taskId}`);
                internalFireAndForgetFetch(youtubeUrl, { method: 'POST' }, { userId: autopilotData.user_id });
                triggeredCount++;
            }

            // TikTok Upload
            if (autopilotData.platforms?.tiktok) {
                const tiktokUrl = `${baseUrl}/api/video/export/tiktok/upload?taskId=${taskId}`;
                
                logger.info(`[Autopilot] Triggering TikTok upload for taskId: ${taskId}`);
                internalFireAndForgetFetch(tiktokUrl, { method: 'POST' }, { userId: autopilotData.user_id });
                triggeredCount++;
            }

            if (triggeredCount > 0) {
                // 4. Delay to ensure network requests are dispatched
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                logger.info(`[Autopilot] No platforms enabled for auto-upload for series: ${seriesId}.`);
            }
            
            // TODO: Reset current_generating_task_id? 
            // 사장님 지시에 따라 이 부분은 업로드 상태 확인 후 결정하기 위해 미뤄둡니다.
            
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
