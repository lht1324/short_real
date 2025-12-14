import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";

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

        console.log(`[Webhook Subtitle] Status: ${body.status}`);
        console.log(`[Webhook Subtitle] Task ID: ${taskId}`);

        if (body.status === 'succeeded') {
            const subtitledVideoUrl = body.output; // 자막이 burn-in된 영상 URL

            console.log(`[Webhook Subtitle] Result URL: ${subtitledVideoUrl}`);

            // Supabase Storage에 다운로드 및 저장
            const videoResponse = await fetch(subtitledVideoUrl);
            if (!videoResponse.ok) {
                throw new Error(`영상 다운로드 실패: ${videoResponse.statusText}`);
            }

            const videoBuffer = await videoResponse.arrayBuffer();
            const filePath = `${taskId}/${taskId}_caption_added.mp4`;

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
                .eq('id', taskId);

            if (updateError) {
                throw new Error(`DB 업데이트 실패: ${updateError.message}`);
            }

            console.log(`[Webhook Subtitle] DB updated for task: ${taskId}`);

            // RPC 호출: 병합 시작 가능 여부 확인
            console.log(`[Webhook Subtitle] RPC 호출 시작 - task_id: ${taskId}, merge_type: caption`);
            const { data: canStartMerge, error: rpcError } = await supabase.rpc(
                'try_start_final_merge',
                {
                    task_id: taskId,
                    merge_type: 'caption'
                }
            );

            console.log(`[Webhook Subtitle] RPC 응답 - canStartMerge: ${canStartMerge}, error:`, rpcError);

            if (rpcError) {
                console.error(`[Webhook Subtitle] RPC 호출 실패:`, rpcError);
            } else if (canStartMerge) {
                console.log(`[Webhook Subtitle] 최종 병합 시작 조건 충족: ${taskId}`);

                // 최종 병합 API 호출 (fire-and-forget)
                internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/merge/music?taskId=${taskId}`, {
                    method: 'POST',
                })
            } else {
                console.log(`[Webhook Subtitle] 음악 처리 대기 중 (canStartMerge = false): ${taskId}`);
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
                .eq('id', taskId);
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: 'Merged caption onto video successfully.'
        });

    } catch (error) {
        console.error('[Webhook Subtitle] Error:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Webhook processing failed'
        });
    }
}
