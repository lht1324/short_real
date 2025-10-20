import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('generationTaskId');

        console.log(`[Webhook Audio] Status: ${body.status}`);
        console.log(`[Webhook Audio] Task ID: ${generationTaskId}`);

        if (body.status === 'succeeded') {
            const processedAudioUrl = body.output; // 처리된 오디오 URL
            console.log(`[Webhook Audio] Result URL: ${processedAudioUrl}`);

            // Supabase Storage에 다운로드 및 저장
            const supabase = createSupabaseServiceRoleClient();
            const audioResponse = await fetch(processedAudioUrl);

            if (!audioResponse.ok) {
                throw new Error(`오디오 다운로드 실패: ${audioResponse.statusText}`);
            }

            const audioBuffer = await audioResponse.arrayBuffer();
            const filePath = `${generationTaskId}/${generationTaskId}_processed_audio.mp3`; // 어차피 하나만 선택해 처리하니 index 불필요

            const { error: uploadError } = await supabase.storage
                .from('video_music_temp_storage')
                .upload(filePath, audioBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Storage 업로드 실패: ${uploadError.message}`);
            }

            // Public URL 생성
            const { data: { publicUrl } } = supabase.storage
                .from('video_music_temp_storage')
                .getPublicUrl(filePath);

            console.log(`[Webhook Audio] Saved to: ${publicUrl}`);

            // DB에 처리된 오디오 URL 업데이트
            // TODO

            console.log(`[Webhook Audio] DB updated successfully`);

        } else if (body.status === 'failed') {
            console.error(`[Webhook Audio] Failed:`, body.error);

            // 에러 상태 DB 업데이트
            // TODO
        }

        return NextResponse.json({ received: true });

    } catch (error) {
        console.error('[Webhook Audio] Error:', error);
        return NextResponse.json(
            { error: 'Webhook processing failed' },
            { status: 500 }
        );
    }
}
