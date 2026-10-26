import {logger, schedules} from "@trigger.dev/sdk/v3";
import {videoServerAPI} from "@/lib/api/server/videoServerAPI";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {ExportPrivacySetting} from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";
import {getNeonDb} from "@/lib/db/neon";
import {autopilotData} from "@/lib/db/schema";
import {eq} from "drizzle-orm";

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

        const seriesData = series as unknown as AutopilotData & { current_generating_task_id?: string };
        const taskId = seriesData.current_generating_task_id;

        if (!taskId) {
            logger.info(`[Autopilot] No current_generating_task_id found for series: ${seriesId}. Skipping.`);
            return { success: true, action: "skipped-no-task-id" };
        }

        // 2. Check if the video file exists in storage
        try {
            const finalFilePath = `${seriesData.user_id}/${taskId}/${taskId}_final.mp4`;
            // This will throw or return an error if the file doesn't exist
            const videoUrl = await videoServerAPI.getVideoSignedUrl(finalFilePath, 3600);
            
            logger.info(`[Autopilot] Video found and ready for upload: ${taskId}`, { videoUrl });
            
            // 3. Trigger actual upload/publish tasks for each platform-connection (Fire and Forget)
            const baseUrl = process.env.BASE_URL;
            let triggeredCount = 0;

            // YouTube Upload
            if (seriesData.platforms?.youtube) {
                // 기존 수동 파이프라인에선 선택한 뒤 param으로 바로 보내고 잊는 거라 저장이 없음
                // UI에 선택창 추가하고 AutopilotData에 optional string으로 넣어야 하나?
                const privacySetting = seriesData.youtube_privacy || ExportPrivacySetting.UNLISTED;
                const youtubeUrl = `${baseUrl}/api/video/export/youtube/upload?taskId=${taskId}&privacySetting=${privacySetting}`;
                
                logger.info(`[Autopilot] Triggering YouTube upload for taskId: ${taskId}`);
                internalFireAndForgetFetch(youtubeUrl, { method: 'POST' });
                triggeredCount++;
            }

            // TikTok Upload
            if (seriesData.platforms?.tiktok) {
                const tiktokUrl = `${baseUrl}/api/video/export/tiktok/upload?taskId=${taskId}`;
                
                logger.info(`[Autopilot] Triggering TikTok upload for taskId: ${taskId}`);
                internalFireAndForgetFetch(tiktokUrl, { method: 'POST' }, { userId: seriesData.user_id });
                triggeredCount++;
            }

            if (triggeredCount > 0) {
                // 4. Delay to ensure network requests are dispatched
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                logger.info(`[Autopilot] No platforms enabled for auto-upload for series: ${seriesId}.`);
            }

            await db
                .update(autopilotData)
                .set({ current_generating_task_id: null })
                .where(eq(autopilotData.id, seriesId));
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
