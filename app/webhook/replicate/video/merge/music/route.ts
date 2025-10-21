import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { videoGenerationTasksServerAPI } from '@/api/server/videoGenerationTasksServerAPI';
import { VideoGenerationTaskStatus } from '@/api/types/supabase/VideoGenerationTasks';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('videoGenerationTaskId');

        console.log(`[Webhook Video-Music Merge] Status: ${body.status}`);
        console.log(`[Webhook Video-Music Merge] Task ID: ${generationTaskId}`);

        if (body.status === 'succeeded') {
            const finalVideoUrl = body.output;

            console.log(`[Webhook Video-Music Merge] Result URL: ${finalVideoUrl}`);

            const supabase = createSupabaseServiceRoleClient();

            const videoResponse = await fetch(finalVideoUrl);
            if (!videoResponse.ok) {
                throw new Error(`Failed to download final video: ${videoResponse.statusText}`);
            }

            const videoBuffer = await videoResponse.arrayBuffer();
            const filePath = `${generationTaskId}/${generationTaskId}_final.mp4`;

            const { error: uploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(filePath, videoBuffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('processed_video_storage')
                .getPublicUrl(filePath);

            console.log(`[Webhook Video-Music Merge] Saved to: ${publicUrl}`);

            await videoGenerationTasksServerAPI.updateTaskStatus(
                generationTaskId!,
                VideoGenerationTaskStatus.COMPLETED
            );

            console.log(`[Webhook Video-Music Merge] Task status updated: ${generationTaskId}`);

        } else if (body.status === 'failed') {
            console.error(`[Webhook Video-Music Merge] Failed:`, body.error);

            if (generationTaskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(
                    generationTaskId,
                    VideoGenerationTaskStatus.FAILED
                );
            }
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('[Webhook Video-Music Merge] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}