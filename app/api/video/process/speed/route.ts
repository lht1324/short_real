import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {videoServerAPI} from "@/lib/api/server/videoServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {getErrorMessage} from "@/lib/utils/ErrorUtils";
import {FalAiErrorDetail} from "@/lib/api/types/fal-ai/FalAIResponse";
import {VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";
import {aiModelDataServerAPI} from "@/lib/api/server/aiModelDataServerAPI";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }
    const supabase = createSupabaseServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const isRetriedByViolence = searchParams.get('isRetriedByViolence') === 'true';

    if (!taskId) {
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "taskId is required"
        });
    }

    try {
        // 1. fal-ai Payload 받기
        // fal-ai의 구조: { request_id: string, status: "COMPLETED" | "ERROR", payload: any, error: any }
        const {
            falPayload: { request_id: requestId, status, error: falError, payload }
        } = await request.json();

        // 2. Supabase에서 해당 row(Task) 데이터 갖고 오기
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return getNextBaseResponse({ success: true, status: 200, error: "Task not found" });
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
        if (checkResultInitialResult) return checkResultInitialResult;

        // safety 걸렸을 때 1.0 Pro Fast 재요청 추가

        if (status === 'OK' || status === 'COMPLETED' || status === 'completed' || status === 'Completed') {
            // 3. fal-ai의 requestId와 일치하는 Scene 찾기
            const originalSceneDataList = videoGenerationTask.scene_breakdown_list.sort((a, b) => {
                return a.sceneNumber - b.sceneNumber;
            });

            const currentIndex = originalSceneDataList.findIndex((sceneData) => {
                return sceneData.requestId === requestId;
            });

            if (currentIndex === -1) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    error: `Scene requestId '${requestId}' not found in task.`
                });
            }

            const sceneToProcess = originalSceneDataList[currentIndex];
            const userId = videoGenerationTask.user_id;

            // 중복 처리 여부 검증 (신규 파일명 규칙 기준)
            const processedFileName = `${userId}/${taskId}/video_processed_${sceneToProcess.sceneNumber}.mp4`;
            const { data: existingFiles } = await supabase.storage
                .from('processed_video_storage')
                .list(`${userId}/${taskId}`, {
                    search: `video_processed_${sceneToProcess.sceneNumber}.mp4`
                });

            if (existingFiles && existingFiles.length > 0) {
                console.log(`[Safety Guard] 파일이 이미 존재함. 중복 요청 스킵: ${processedFileName}`);
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Already processed (File exists)"
                });
            }

            // 5. fal-ai 영상 URL 확인
            const videoUrl = payload?.video?.url || payload?.output?.video?.url || payload?.url;

            if (!videoUrl || typeof videoUrl !== 'string') {
                console.error("fal-ai Payload Structure:", JSON.stringify(payload));
                throw new Error(`Invalid video output URL from fal-ai for request ${requestId}`);
            }

            // ==================================================================
            //  ▼▼▼ 영상 속도 조절 및 업로드 처리 부분 ▼▼▼
            // ==================================================================

            const subtitles = sceneToProcess.sceneSubtitleSegments;

            if (!subtitles || subtitles.length === 0) {
                throw new Error(`Subtitle segments not found for scene ${sceneToProcess.sceneNumber}`);
            }

            const isLastScene = currentIndex === originalSceneDataList.length - 1;
            const nextSceneSubtitles = isLastScene
                ? []
                : originalSceneDataList[currentIndex + 1].sceneSubtitleSegments ?? [];

            const targetDuration = isLastScene
                ? subtitles[subtitles.length - 1].endSec - subtitles[0].startSec + 0.75 // 여운
                : nextSceneSubtitles[0].startSec - subtitles[0].startSec;

            const postProcessedVideoResult = await videoServerAPI.postProcessedVideo(
                videoUrl,
                targetDuration,
            );

            if (!postProcessedVideoResult.success || !postProcessedVideoResult.processedVideoUrl) {
                throw new Error(`Video processing request failed.`);
            }

            const processedVideoUrl = postProcessedVideoResult.processedVideoUrl;

            // 6. 결과 영상 다운로드
            const videoResponse = await fetch(processedVideoUrl);
            if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.statusText}`);
            const videoBuffer = await videoResponse.arrayBuffer();

            // 7. Supabase Storage 업로드

            // 7-1. 원본 비디오(Raw) 다운로드 및 업로드
            console.log(`[Speed Process] 원본 비디오 다운로드 및 업로드 시작: scene ${sceneToProcess.sceneNumber}`);
            const rawVideoResponse = await fetch(videoUrl);
            if (!rawVideoResponse.ok) throw new Error(`Raw video download failed: ${rawVideoResponse.statusText}`);
            const rawVideoBuffer = await rawVideoResponse.arrayBuffer();

            const rawFileName = `${userId}/${taskId}/video_raw_${sceneToProcess.sceneNumber}.mp4`;
            const { error: rawUploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(rawFileName, Buffer.from(rawVideoBuffer), {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (rawUploadError) {
                throw new Error(`Raw video storage upload failed: ${rawUploadError.message}`);
            }
            console.log(`[Speed Process] 원본 비디오 업로드 완료: ${rawFileName}`);

            // 7-2. 가공 비디오(Processed) 업로드
            const { error: uploadError } = await supabase.storage
                .from('processed_video_storage')
                .upload(processedFileName, Buffer.from(videoBuffer), {
                    contentType: 'video/mp4',
                    upsert: true
                });

            if (uploadError) {
                throw new Error(`Processed video storage upload failed: ${uploadError.message}`);
            }
            console.log(`[Speed Process] 가공 비디오 업로드 완료: ${processedFileName}`);

            // =========================================================
            // [병합 트리거] "내가 마지막인가?" 확인 로직
            // =========================================================

            // 9. RPC 호출 (Atomic하게 카운트 증가 및 조회)
            const { data: countResult, error: rpcError } = await supabase.rpc(
                "increment_and_get_scene_count",
                {
                    task_id: videoGenerationTask.id,
                    target_request_id: requestId,
                }
            );

            if (rpcError) {
                console.error("RPC Error:", rpcError);
                // RPC 실패 시 로직 중단해야 안전함
                throw new Error("RPC Execution Failed");
            }
            const {
                processed_count: processedCount,
                total_count: totalCount,
            } = countResult;

            console.log(`Speed Webhook: Scene ${requestId} finished. Progress: ${processedCount}/${totalCount}`);

            // 10. 모든 씬 완료 시 음악 생성(Music) 엔드포인트 호출
            if (processedCount === totalCount) {
                console.log(`모든 Scene 처리 완료. 음악 생성을 시작합니다: ${taskId}`);

                // 상태 변경: COMPOSING_MUSIC
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(
                    taskId,
                    VideoGenerationTaskStatus.COMPOSING_MUSIC
                );

                // 음악 생성 엔드포인트 호출 (Fire and Forget)
                internalFireAndForgetFetch(`${process.env.BASE_URL}/api/music?taskId=${taskId}`, {
                    method: 'POST',
                });
            }

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "fal-ai Webhook processed successfully."
            });
        } else {
            const errorMessage = getErrorMessage(falError);
            console.error(`fal-ai request ${requestId} failed:`, errorMessage);

            if (payload.detail && payload.detail.length != 0) {
                const isPolicyViolation = payload.detail.some((payloadErrorDetail: FalAiErrorDetail) => {
                    return payloadErrorDetail.type === "content_policy_violation";
                });

                if (isPolicyViolation) {
                    if (!isRetriedByViolence) {
                        const sceneDataList = videoGenerationTask.scene_breakdown_list;
                        const currentSceneData = sceneDataList.find((sceneData) => {
                            return sceneData.requestId === requestId;
                        });

                        if (currentSceneData) {
                            const userId = videoGenerationTask.user_id;
                            const user = await usersServerAPI.getUserByUserId(userId);
                            const videoModelDataId = videoGenerationTask.ai_model_config?.videoModelId;
                            if (!user || !user.fal_ai_api_key || !videoModelDataId || !videoGenerationTask.aspect_ratio || !videoGenerationTask.resolution) {
                                throw new Error("Missing required task data for video generation retry.");
                            }
                            const videoAIModelData = await aiModelDataServerAPI.getAIModelDataById(videoModelDataId);
                            if (!videoAIModelData) throw new Error("AI Model Data not found.");

                            const newRequestId = await videoServerAPI.postVideo(
                                currentSceneData,
                                taskId,
                                userId,
                                videoAIModelData,
                                user.fal_ai_api_key,
                                videoGenerationTask.aspect_ratio,
                                videoGenerationTask.resolution,
                                true,
                            );

                            const { error } = await supabase.rpc('update_scene_request_id', {
                                target_task_id: taskId,
                                target_scene_number: currentSceneData.sceneNumber,
                                new_request_id: newRequestId,
                            })

                            if (!error) {
                                return getNextBaseResponse({
                                    success: true,
                                    status: 200,
                                    message: "Requested video generation again by violation policy."
                                });
                            }
                        }
                    }
                }
            }

            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Retryable error detected."
            });
        }

    } catch (error) {
        console.error("fal-ai Webhook processing error:", error);
        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error"
        });
    }
}