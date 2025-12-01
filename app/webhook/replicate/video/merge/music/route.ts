import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { videoGenerationTasksServerAPI } from '@/api/server/videoGenerationTasksServerAPI';
import { VideoGenerationTaskStatus } from '@/api/types/supabase/VideoGenerationTasks';
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    try {
        const body = await request.json();

        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Task not found'
            });
        }

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        console.log(`[Webhook Video-Music Merge] Status: ${body.status}`);
        console.log(`[Webhook Video-Music Merge] Task ID: ${taskId}`);

        if (body.status === 'succeeded') {
            const finalVideoUrl = body.output;

            console.log(`[Webhook Video-Music Merge] Result URL: ${finalVideoUrl}`);

            const videoResponse = await fetch(finalVideoUrl, {
                cache: 'no-store',
            });
            if (!videoResponse.ok) {
                throw new Error(`Failed to download final video: ${videoResponse.statusText}`);
            }

            // const videoBlob = await videoResponse.blob();
            const videoArrayBuffer = await videoResponse.arrayBuffer();
            const videoNodeBuffer = Buffer.from(videoArrayBuffer);
            const filePath = `${taskId}/${taskId}_final.mp4`;

            const { error: uploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(filePath, videoNodeBuffer, {
                // .upload(filePath, videoBlob, {
                // .upload(`temp/${taskId}_final.mp4`, videoBlob, {
                    contentType: 'video/mp4',
                    upsert: true,
                    // duplex: 'half',
                });

            if (uploadError) {
                throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('processed_video_storage')
                .getPublicUrl(filePath);

            console.log(`[Webhook Video-Music Merge] Saved to: ${publicUrl}`);

            await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.COMPLETED);

            console.log(`[Webhook Video-Music Merge] Task status updated: ${taskId}`);

        } else if (body.status === 'failed') {
            console.error(`[Webhook Video-Music Merge] Failed:`, body.error);

            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: 'Merging music webhook received successfully.',
        });

    } catch (error) {
        console.error('[Webhook Video-Music Merge] Error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Webhook processing failed'
        });
    }
}