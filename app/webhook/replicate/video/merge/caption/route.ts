import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/app/api/video/process/taskCheckAndCleaupIfCancelled";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    try {
        const body = await request.json();
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('videoGenerationTaskId');

        if (!generationTaskId) {
            return NextResponse.json({ error: "generationTaskId is required" }, { status: 400 });
        }

        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(generationTaskId);

        if (!videoGenerationTask) {
            throw new Error("Task not found.");
        }

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        console.log(`[Webhook Subtitle] Status: ${body.status}`);
        console.log(`[Webhook Subtitle] Task ID: ${generationTaskId}`);

        if (body.status === 'succeeded') {
            const subtitledVideoUrl = body.output; // 자막이 burn-in된 영상 URL

            console.log(`[Webhook Subtitle] Result URL: ${subtitledVideoUrl}`);

            // Supabase Storage에 다운로드 및 저장
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

            // DB에 caption_completed = true 업데이트
            const { error: updateError } = await supabase
                .from('video_generation_tasks')
                .update({
                    caption_completed: true
                })
                .eq('id', generationTaskId);

            if (updateError) {
                throw new Error(`DB 업데이트 실패: ${updateError.message}`);
            }

            console.log(`[Webhook Subtitle] DB updated for task: ${generationTaskId}`);

            // RPC 호출: 병합 시작 가능 여부 확인
            console.log(`[Webhook Subtitle] RPC 호출 시작 - task_id: ${generationTaskId}, merge_type: caption`);
            const { data: canStartMerge, error: rpcError } = await supabase.rpc(
                'try_start_final_merge',
                {
                    task_id: generationTaskId,
                    merge_type: 'caption'
                }
            );

            console.log(`[Webhook Subtitle] RPC 응답 - canStartMerge: ${canStartMerge}, error:`, rpcError);

            if (rpcError) {
                console.error(`[Webhook Subtitle] RPC 호출 실패:`, rpcError);
            } else if (canStartMerge) {
                console.log(`[Webhook Subtitle] 최종 병합 시작 조건 충족: ${generationTaskId}`);

                // 최종 병합 API 호출 (fire-and-forget)
                const baseUrl = process.env.BASE_URL;
                console.log(`[Webhook Subtitle] BASE_URL: ${baseUrl}`);

                if (baseUrl) {
                    const apiUrl = `${baseUrl}/api/video/merge/music`;
                    console.log(`[Webhook Subtitle] 최종 병합 API 호출: ${apiUrl}`);

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
                        console.log(`[Webhook Subtitle] API 응답 상태: ${res.status}`);
                        return res.json();
                    })
                    .then(data => {
                        console.log(`[Webhook Subtitle] API 응답 데이터:`, data);
                    })
                    .catch(err => {
                        console.error(`[Webhook Subtitle] 최종 병합 API 호출 실패:`, err);
                    });
                } else {
                    console.error(`[Webhook Subtitle] BASE_URL이 설정되지 않았습니다.`);
                }
            } else {
                console.log(`[Webhook Subtitle] 음악 처리 대기 중 (canStartMerge = false): ${generationTaskId}`);
            }

        } else if (body.status === 'failed') {
            console.error(`[Webhook Subtitle] Failed:`, body.error);

            // 에러 상태 DB 업데이트
            await supabase
                .from('video_generation_tasks')
                .update({
                    caption_completed: false,
                    // 필요시 에러 메시지 저장 필드 추가 가능
                })
                .eq('id', generationTaskId);
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
