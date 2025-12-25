import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {getIsValidRequestS2S} from "@/utils/getIsValidRequest";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {getErrorMessage} from "@/utils/ErrorUtils";
import {FalAiErrorDetail} from "@/api/types/fal-ai/FalAIResponse";

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
            // 중복 처리 여부 검증
            const fileName = `${taskId}/${requestId}.mp4`;
            const { data: existingFiles, error: listError } = await supabase.storage
                .from('processed_video_storage')
                .list(taskId, {
                    search: requestId // requestId가 포함된 파일이 있는지 검색
                });

            if (existingFiles && existingFiles.length > 0) {
                console.log(`[Safety Guard] 파일이 이미 존재함. 중복 요청 스킵: ${fileName}`);
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Already processed (File exists)"
                });
            }

            // 3. fal-ai의 requestId와 일치하는 Scene 찾기
            const originalSceneDataList = videoGenerationTask.scene_breakdown_list.sort((a, b) => {
                return a.sceneNumber - b.sceneNumber;
            });

            // 5. fal-ai 영상 URL 확인
            // 모델마다 다르지만 보통 payload.video.url 또는 payload.output.video.url에 위치함
            const videoUrl = payload?.video?.url || payload?.output?.video?.url || payload?.url;

            if (!videoUrl || typeof videoUrl !== 'string') {
                console.error("fal-ai Payload Structure:", JSON.stringify(payload));
                throw new Error(`Invalid video output URL from fal-ai for request ${requestId}`);
            }

            // ==================================================================
            //  ▼▼▼ 영상 속도 조절 및 업로드 처리 부분 (기존 로직 유지) ▼▼▼
            // ==================================================================

            const currentIndex = originalSceneDataList.findIndex((sceneData) => {
                return sceneData.requestId === requestId;
            })

            if (currentIndex === -1) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    error: `Scene requestId '${requestId}' not found in task.`
                });
            }

            const sceneToProcess = originalSceneDataList[currentIndex];

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
                taskId,
                requestId
            );

            if (!postProcessedVideoResult.success) {
                throw new Error(`Video processing request failed.`);
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
                            const newRequestId = await videoServerAPI.postVideo(
                                currentSceneData,
                                taskId,
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