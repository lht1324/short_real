import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {SceneGenerationStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {getErrorMessage} from "@/utils/ErrorUtils";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

/**
 * fal-ai Webhook 엔드포인트
 * fal-ai는 작업 완료 시 설정된 webhook URL로 POST 요청을 보냅니다.
 */
export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

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
        const falPayload = await request.json();
        const { request_id: requestId, status, payload, error: falError } = falPayload;

        // 2. Supabase에서 해당 row(Task) 데이터 갖고 오기
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return getNextBaseResponse({ success: true, status: 200, error: "Task not found" });
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
        if (checkResultInitialResult) return checkResultInitialResult;

        // 3. fal-ai의 requestId와 일치하는 Scene 찾기
        const originalSceneDataList = videoGenerationTask.scene_breakdown_list;
        const sceneToProcess = originalSceneDataList.find(
            (scene) => scene.requestId === requestId
        );

        if (!sceneToProcess) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: `Scene requestId '${requestId}' not found in task.`
            });
        }

        // 4. 실패한 요청인지 확인 (fal-ai status: 'ERROR')
        if (status === 'ERROR' || falError) {
            const errorMessage = getErrorMessage(falError);
            console.error(`fal-ai request ${requestId} failed:`, errorMessage);

            // fal-ai의 경우 에러 메시지 패턴이 다를 수 있으므로 확인 필요
            const isRetryable = errorMessage && (
                errorMessage.toUpperCase().includes('TIMEOUT') ||
                errorMessage.toUpperCase().includes('QUEUE_FULL') ||
                errorMessage.toUpperCase().includes('CUDA')
            );

            if (isRetryable) {
                console.log(`[Retry] Retryable error detected for ${requestId}.`);
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Retryable error detected."
                });
            } else {
                console.log(`[Permanent Failure] Non-retryable error for ${requestId}.`);
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                    taskId,
                    {
                        scene_breakdown_list: originalSceneDataList.map((sceneData) => {
                            return sceneData.sceneNumber === sceneToProcess?.sceneNumber
                                ? { ...sceneData, status: SceneGenerationStatus.FAILED }
                                : sceneData;
                        }),
                        is_generation_failed: true
                    }
                );
                return getNextBaseResponse({ success: true, status: 200, message: "Permanent failure logged." });
            }
        }

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

        const subtitles = sceneToProcess.sceneSubtitleSegments;
        if (!subtitles || subtitles.length === 0) {
            throw new Error(`Subtitle segments not found for scene ${sceneToProcess.sceneNumber}`);
        }

        const isLastScene = sceneToProcess.sceneNumber === originalSceneDataList.length;
        const nextSceneSubtitles = isLastScene
            ? []
            : originalSceneDataList[sceneToProcess.sceneNumber].sceneSubtitleSegments ?? [];

        const targetDuration = isLastScene
            ? subtitles[subtitles.length - 1].endSec - subtitles[0].startSec + 0.75
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