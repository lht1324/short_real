import {NextRequest, NextResponse} from "next/server";
import {Prediction} from "replicate";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {SceneGenerationStatus, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {getErrorMessage} from "@/utils/ErrorUtils";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/app/api/video/process/taskCheckAndCleaupIfCancelled";

// import { adjustVideoSpeedAndUpload } from "@/lib/services/videoService"; // (추천) 실제 로직은 이렇게 분리

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. Replicate Prediction 객체와 URL Param(generationTaskId) 받기
        const prediction: Prediction = await request.json();
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('generationTaskId');

        if (!generationTaskId) {
            return NextResponse.json({ error: "generationTaskId is required" }, { status: 400 });
        }

        // 2. Supabase에서 해당 row(Task) 데이터 갖고 오기
        const generationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(generationTaskId);

        if (!generationTask) {
            console.log("Task not found: ", generationTaskId);
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(generationTask);

        if (checkResultInitialResult) {
            return checkResultInitialResult;
        }

        // 3. Prediction ID와 일치하는 Scene 찾기
        const originalSceneDataList = generationTask.scene_breakdown_list
        const sceneToProcess = originalSceneDataList.find(
            (scene) => scene.requestId === prediction.id
        );

        if (!sceneToProcess) {
            console.log(`Scene with requestId ${prediction.id} not found in task`);
            return NextResponse.json({ error: `Scene with requestId ${prediction.id} not found in task` }, { status: 404 });
        }

        // 4. 실패한 요청인지 확인
        if (prediction.status === 'failed') {
            console.error(`Replicate prediction ${prediction.id} failed:`, prediction.error);

            // ▼▼▼ 여기가 이렇게 바뀝니다 ▼▼▼

            // 1. 에러 내용 확인 및 CUDA 에러 여부 판단
            let isCudaError = false;
            const errorMessage = getErrorMessage(prediction.error);

            if (errorMessage) {
                // 에러 메시지에 'CUDA'가 포함되어 있는지 대소문자 구분 없이 확인
                isCudaError = errorMessage.toUpperCase().includes('CUDA');
            }

            // 2. CUDA 에러인 경우에만 재시도
            if (isCudaError) {
                console.log(`[Retry] CUDA error detected for prediction ${prediction.id}. Retrying immediately...`);
                // 즉시 재시도 요청
                // 테스트 금지, 이미지 생성 시 Supabase Storage에 저장하는 로직 추가 후 다시 해야 함. 현재 sceneToProcess에는 imageBase64가 없음.
                const { data, error } = await supabase.storage
                    .from('scene_image_temp_storage')
                    .createSignedUrl(`${generationTaskId}/${sceneToProcess.sceneNumber}.jpeg`, 3600);

                if (!data || !data?.signedUrl || error) {
                    throw new Error(error?.message || `Scene ${sceneToProcess.sceneNumber}: 이미지 데이터가 없습니다.`);
                }

                const newRequestId = await videoServerAPI.postVideo(
                    sceneToProcess,
                    generationTaskId,
                );

                const patchVideoGenerationTaskResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                    generationTaskId,
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

                return NextResponse.json({ success: true, message: "CUDA error detected. Retrying job." });

            } else {
                // 3. CUDA가 아닌 다른 에러인 경우 (영구 실패 처리)
                console.log(`[Permanent Failure] Non-CUDA error for prediction ${prediction.id}. Not retrying.`);

                await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                    generationTaskId,
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
                return NextResponse.json({ success: true, message: "Non-CUDA failure acknowledged. No retry." });
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
            `${generationTaskId}/${prediction.id}.mp4`,
        );

        if (!postProcessedVideoResult.success) {
            throw new Error(`Video processing failed: ${postProcessedVideoResult.error}`);
        }

        // 7. DB 업데이트: 처리된 영상 URL과 상태를 Scene 데이터에 반영
        const updatedSceneList = generationTask.scene_breakdown_list.map((sceneData) => {
            if (sceneData.requestId && prediction.id && sceneData.requestId === prediction.id) {
                return {
                    ...sceneData,
                    status: SceneGenerationStatus.PROCESSED// 'processed' // Scene 처리 완료 상태 추가
                };
            }
            return sceneData;
        });

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(
            generationTaskId,
            {
                scene_breakdown_list: updatedSceneList,
            }
        );

        // ==================================================================
        //  ▲▲▲ 여기까지 영상 처리 로직 ▲▲▲
        // ==================================================================
        const { data: countResult, error: rpcError } = await supabase.rpc(
            "increment_and_get_scene_count",
            { task_id: generationTask.id }
        )

        const processedCountFromDB = countResult.processed_count;
        const totalCountFromDB = countResult.total_count;
        const totalCountFromList = updatedSceneList.length;

        // (안전장치) DB에 기록된 total_count가 실제 리스트 길이와 일치하는지 확인
        if (totalCountFromDB !== totalCountFromList) {
            // 이 경우, 데이터가 잘못 기록된 것이므로 심각한 에러로 로깅
            console.error(`CRITICAL: Data inconsistency for task ${generationTaskId}. DB total: ${totalCountFromDB}, DB processed: ${processedCountFromDB} List length: ${totalCountFromList}`);
        }

        // 모든 조건이 만족할 때만 병합 실행
        const isAllScenesProcessed =
            totalCountFromList > 0 && // 0 === 0 방지
            processedCountFromDB === totalCountFromList && // 처리된 개수 === 실제 총 개수
            totalCountFromDB === totalCountFromList; // (안전장치) DB에 기록된 총 개수 === 실제 총 개수

        // 8. 모든 Scene 처리가 완료되었으면, 병합 엔드포인트 호출
        if (isAllScenesProcessed) {
            const patchVideoGenerationTaskStatusStitchingVideosResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(generationTaskId, VideoGenerationTaskStatus.STITCHING_VIDEOS);

            const checkStitchingVideosResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusStitchingVideosResult);

            if (checkStitchingVideosResult) {
                return checkStitchingVideosResult;
            }

            console.log(`모든 Scene 처리 완료. 최종 병합을 시작합니다: ${generationTask.id}`);

            // 현재 요청의 기본 URL을 사용하여 병합 엔드포인트의 전체 URL을 생성
            const mergeEndpointUrl = new URL(`${process.env.BASE_URL}/api/video/merge`, request.url);

            // ★★★ 서버 사이드에서 직접 POST 요청을 보냄 ★★★
            // 이 fetch의 응답을 기다릴 필요 없으므로 await를 사용하지 않음 ("Fire and Forget")
            fetch(mergeEndpointUrl.toString(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 필요하다면 내부 인증을 위한 시크릿 키 등을 추가할 수 있습니다.
                    // 'Authorization': `Bearer ${process.env.INTERNAL_SECRET_KEY}`
                },
                body: JSON.stringify({
                    generationTaskId: generationTask.id
                }),
            });
        }

        // 8. Replicate에 성공 응답 전달
        return NextResponse.json({ success: true, message: "Webhook received and scene processing initiated." });

    } catch (error) {
        console.error("Webhook processing error:", error);
        // 에러 발생 시 500 상태 코드와 함께 응답
        return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
    }
}