import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('videoGenerationTaskId');

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

            // DB에 music_completed = true 업데이트
            const { error: updateError } = await supabase
                .from('video_generation_tasks')
                .update({
                    music_completed: true
                })
                .eq('id', generationTaskId);

            if (updateError) {
                throw new Error(`DB 업데이트 실패: ${updateError.message}`);
            }

            console.log(`[Webhook Audio] DB updated for task: ${generationTaskId}`);

            // RPC 호출: 병합 시작 가능 여부 확인
            console.log(`[Webhook Audio] RPC 호출 시작 - task_id: ${generationTaskId}, merge_type: music`);
            const { data: canStartMerge, error: rpcError } = await supabase.rpc(
                'try_start_final_merge',
                {
                    task_id: generationTaskId,
                    merge_type: 'music'
                }
            );

            console.log(`[Webhook Audio] RPC 응답 - canStartMerge: ${canStartMerge}, error:`, rpcError);

            if (rpcError) {
                console.error(`[Webhook Audio] RPC 호출 실패:`, rpcError);
            } else if (canStartMerge) {
                console.log(`[Webhook Audio] 최종 병합 시작 조건 충족: ${generationTaskId}`);

                // 최종 병합 API 호출 (fire-and-forget)
                const baseUrl = process.env.BASE_URL;
                console.log(`[Webhook Audio] BASE_URL: ${baseUrl}`);

                if (baseUrl) {
                    const apiUrl = `${baseUrl}/api/video/merge/music`;
                    console.log(`[Webhook Audio] 최종 병합 API 호출: ${apiUrl}`);

                    fetch(apiUrl, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            videoGenerationTaskId: generationTaskId
                        }),
                    })
                    .then(res => {
                        console.log(`[Webhook Audio] API 응답 상태: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log(`[Webhook Audio] API 응답 데이터:`, data);
                    })
                    .catch(err => {
                        console.error(`[Webhook Audio] 최종 병합 API 호출 실패:`, err);
                    });
                } else {
                    console.error(`[Webhook Audio] BASE_URL이 설정되지 않았습니다.`);
                }
            } else {
                console.log(`[Webhook Audio] 자막 처리 대기 중 (canStartMerge = false): ${generationTaskId}`);
            }

        } else if (body.status === 'failed') {
            console.error(`[Webhook Audio] Failed:`, body.error);

            // 에러 상태 DB 업데이트
            const supabase = createSupabaseServiceRoleClient();
            await supabase
                .from('video_generation_tasks')
                .update({
                    music_completed: false,
                    // 필요시 에러 메시지 저장 필드 추가 가능
                })
                .eq('id', generationTaskId);
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
