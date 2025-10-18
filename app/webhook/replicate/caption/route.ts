import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('generationTaskId');

        console.log(`[Webhook Subtitle] Status: ${body.status}`);
        console.log(`[Webhook Subtitle] Task ID: ${generationTaskId}`);

        if (body.status === 'succeeded') {
            const subtitledVideoUrl = body.output; // 자막이 burn-in된 영상 URL

            console.log(`[Webhook Subtitle] Result URL: ${subtitledVideoUrl}`);

            // Supabase Storage에 다운로드 및 저장
            const supabase = createSupabaseServiceRoleClient();

            const videoResponse = await fetch(subtitledVideoUrl);
            if (!videoResponse.ok) {
                throw new Error(`영상 다운로드 실패: ${videoResponse.statusText}`);
            }

            const videoBuffer = await videoResponse.arrayBuffer();
            const filePath = `${generationTaskId}/${generationTaskId}_caption_added.mp4`;

            const { error: uploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(filePath, videoBuffer, {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Storage 업로드 실패: ${uploadError.message}`);
            }

            // Public URL 생성
            const { data: { publicUrl } } = supabase.storage
                .from('processed_video_storage')
                .getPublicUrl(filePath);

            console.log(`[Webhook Subtitle] Saved to: ${publicUrl}`);

            // TODO: DB에 최종 URL 업데이트
            // await updateTaskSubtitledVideo(generationTaskId, publicUrl);

        } else if (body.status === 'failed') {
            console.error(`[Webhook Subtitle] Failed:`, body.error);

            // TODO: 에러 상태 DB 업데이트
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('[Webhook Subtitle] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
