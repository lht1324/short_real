import {NextRequest} from "next/server";
import {Prediction} from "replicate";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {SceneGenerationStatus, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {getErrorMessage} from "@/utils/ErrorUtils";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

/**
 * 이 엔드포인트는 웹훅이 들어오는 엔드포인트
 * 웹훅을 쏘는 서비스인 Replicate는 200 이외의 status가 들어올 때 재시도를 한 뒤 기존 id로 웹훅을 다시 쏜다
 * 항상 유념할 것.
 */
export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

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
        // 1. Replicate Prediction 객체와 URL Param(taskId) 받기
        const prediction: Prediction = await request.json();

        // 2. Supabase에서 해당 row(Task) 데이터 갖고 오기
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "Task not found",
            });
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkResultInitialResult) {
            return checkResultInitialResult;
        }

        // 3. Prediction ID와 일치하는 Scene 찾기
        const originalSceneDataList = videoGenerationTask.scene_breakdown_list
        const sceneToProcess = originalSceneDataList.find(
            (scene) => scene.requestId === prediction.id
        );

        if (!sceneToProcess) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: `Scene with requestId '${prediction.id}' not found in task.`
            });
        }

        // 4. 실패한 요청인지 확인
        if (prediction.status === 'failed') {
            console.error(`Replicate prediction ${prediction.id} failed:`, prediction.error);

            // ▼▼▼ 여기가 이렇게 바뀝니다 ▼▼▼

            // 1. 에러 내용 확인 및 CUDA 에러 여부 판단
            let isCudaError = false;
            let isHttpxReadError = false;

            const errorMessage = getErrorMessage(prediction.error);

            if (errorMessage) {
                // 에러 메시지에 'CUDA'가 포함되어 있는지 대소문자 구분 없이 확인
                isCudaError = errorMessage.toUpperCase().includes('CUDA');
                isHttpxReadError = errorMessage.toUpperCase().includes('READERROR');
            }

            // 2. CUDA 에러인 경우에만 재시도
            if (isCudaError || isHttpxReadError) {
                console.log(`[Retry] CUDA error detected for prediction ${prediction.id}. Retrying immediately...`);
                // 즉시 재시도 요청
                // 테스트 금지, 이미지 생성 시 Supabase Storage에 저장하는 로직 추가 후 다시 해야 함. 현재 sceneToProcess에는 imageBase64가 없음.
                const { data, error } = await supabase.storage
                    .from('scene_image_temp_storage')
                    .createSignedUrl(`${taskId}/${sceneToProcess.sceneNumber}.jpeg`, 3600);

                if (!data || !data?.signedUrl || error) {
                    throw new Error(error?.message || `Scene ${sceneToProcess.sceneNumber}: 이미지 데이터가 없습니다.`);
                }

                const newRequestId = await videoServerAPI.postVideo(
                    sceneToProcess,
                    taskId,
                );

                const patchVideoGenerationTaskResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                    taskId,
                    {
                        scene_breakdown_list: originalSceneDataList.map((sceneData) => {
                            return sceneData.requestId === sceneToProcess.requestId
                                ? {
                                    ...sceneData,
                                    requestId: newRequestId,
                                }
                                : sceneData;
                        })
                    }
                )

                if (!patchVideoGenerationTaskResult) {
                    throw new Error(`Patching video generation task is failed.`);
                }

                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "CUDA error detected. Retrying job."
                });

            } else {
                // 3. CUDA가 아닌 다른 에러인 경우 (영구 실패 처리)
                console.log(`[Permanent Failure] Non-CUDA error for prediction ${prediction.id}. Not retrying.`);

                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                    taskId,
                    {
                        scene_breakdown_list: originalSceneDataList.map((sceneData) => {
                            return sceneData.sceneNumber === sceneToProcess?.sceneNumber
                                ? {
                                    ...sceneData,
                                    status: SceneGenerationStatus.FAILED,
                                }
                                : sceneData;
                        })
                    }
                )

                // Replicate에는 성공으로 응답하여 더 이상 웹훅을 받지 않도록 합니다.
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Non-CUDA failure acknowledged. No retry."
                });
            }
        }

        // Replicate 영상 URL 확인
        if (!prediction.output || typeof prediction.output !== 'string') {
            throw new Error(`Invalid video output URL from Replicate for prediction ${prediction.id}`);
        }
        const replicateVideoUrl = prediction.output;

        // ==================================================================
        //  ▼▼▼ 영상 속도 조절 및 업로드 처리 부분 ▼▼▼
        // ==================================================================

        // 5. 목표 음성 길이 계산
        const subtitles = sceneToProcess.sceneSubtitleSegments;
        if (!subtitles || subtitles.length === 0) {
            throw new Error(`Subtitle segments not found for scene ${sceneToProcess.sceneNumber}`);
        }
        const isLastScene = sceneToProcess.sceneNumber === originalSceneDataList.length;
        const nextSceneSubtitles = isLastScene
            ? []
            : originalSceneDataList[sceneToProcess.sceneNumber].sceneSubtitleSegments ?? [];

        if (!isLastScene && nextSceneSubtitles.length === 0) {
            throw new Error(`Subtitle segments not found for scene ${sceneToProcess.sceneNumber + 1}`);
        }

        const targetDuration = isLastScene
            ? subtitles[subtitles.length - 1].endSec - subtitles[0].startSec + 0.75
            : nextSceneSubtitles[0].startSec - subtitles[0].startSec;

        // 6. FFmpeg를 사용해 영상 처리 및 Storage에 업로드 (로직 예시)
        const postProcessedVideoResult = await videoServerAPI.postProcessedVideo(
            replicateVideoUrl,
            targetDuration,
            taskId,
            prediction.id
        );

        if (!postProcessedVideoResult.success) {
            throw new Error(`Video processing request failed.`);
        }

        // 8. Replicate에 성공 응답 전달
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Webhook received and scene processing initiated."
        });

    } catch (error) {
        console.error("Webhook processing error:", error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: true,
            status: 200,
            error: "Webhook processing error"
        });
    }
}