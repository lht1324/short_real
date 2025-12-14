import { NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { SceneGenerationStatus, VideoGenerationTaskStatus } from "@/api/types/supabase/VideoGenerationTasks";
import { taskCheckAndCleanupIfCancelled } from "@/utils/taskCheckAndCleanupIfCancelled";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    // 1. URL 쿼리 파라미터에서 문맥(Context) 정보 복구
    // startSpeedAdjustment에서 보낸 taskId와 requestId를 여기서 받습니다.
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const requestId = searchParams.get('requestId');

    if (!taskId || !requestId) {
        return getNextBaseResponse({
            success: true, // Replicate가 재시도하지 않도록 200 OK 처리하되 에러 로그 남김
            status: 200,
            error: "Missing metadata (taskId or requestId)"
        });
    }

    try {
        // 2. Replicate 웹훅 바디 파싱
        const body = await request.json();
        const { status, output, error } = body;

        // 3. Task 데이터 조회 (최신 상태 확인)
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                error: "Task not found"
            });
        }

        // 4. 취소 여부 확인 (중요: 사용자가 작업을 취소했으면 중단)
        const checkResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);
        if (checkResult) return checkResult;

        // 5. Replicate 작업 실패 처리
        if (status === 'failed') {
            console.error(`Speed adjustment failed for scene ${requestId}:`, error);

            // 해당 씬을 FAILED로 업데이트
            const failedSceneList = videoGenerationTask.scene_breakdown_list.map((scene) => {
                if (scene.requestId === requestId) {
                    return { ...scene, status: SceneGenerationStatus.FAILED };
                }
                return scene;
            });

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                scene_breakdown_list: failedSceneList
            });

            // 전체 Task 실패 처리 (정책에 따라 부분 성공 허용 시 변경 가능)
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Marked as failed due to Replicate error"
            });
        }

        // 성공했지만 결과 URL이 없는 경우 방어
        if (!output) {
            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "No output received, but status is not failed. Ignoring."
            });
        }

        // =========================================================
        // [이전] postProcessedVideo 내부 및 이후에 있던 로직 시작
        // =========================================================

        // 6. 결과 영상 다운로드
        // Replicate output은 URL 문자열입니다.
        const videoResponse = await fetch(output);
        if (!videoResponse.ok) throw new Error(`Download failed: ${videoResponse.statusText}`);
        const videoBuffer = await videoResponse.arrayBuffer();

        // 7. Supabase Storage 업로드
        // 파일명 규칙: [taskId]/[requestId].mp4
        const fileName = `${taskId}/${requestId}.mp4`;
        const { error: uploadError } = await supabase.storage
            .from('processed_video_storage')
            .upload(fileName, videoBuffer, {
                contentType: 'video/mp4',
                upsert: true
            });

        if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`);
        }

        // 8. DB 업데이트 (Scene Status -> PROCESSED)
        const updatedSceneList = videoGenerationTask.scene_breakdown_list.map((sceneData) => {
            return sceneData.requestId === requestId
                ? {
                    ...sceneData,
                    status: SceneGenerationStatus.PROCESSED
                }
                : sceneData;
        });

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: updatedSceneList,
        });

        // =========================================================
        // [병합 트리거] "내가 마지막인가?" 확인 로직
        // =========================================================

        // 9. RPC 호출 (Atomic하게 카운트 증가 및 조회)
        const { data: countResult, error: rpcError } = await supabase.rpc(
            "increment_and_get_scene_count",
            { task_id: videoGenerationTask.id }
        );

        if (rpcError) {
            console.error("RPC Error:", rpcError);
            // RPC 실패 시 로직 중단해야 안전함
            throw new Error("RPC Execution Failed");
        }

        const processedCount = countResult.processed_count;
        const totalCount = updatedSceneList.length; // 혹은 countResult.total_count

        console.log(`Speed Webhook: Scene ${requestId} finished. Progress: ${processedCount}/${totalCount}`);

        // 10. 모든 씬 완료 시 병합(Merge) 엔드포인트 호출
        if (processedCount === totalCount) {
            console.log(`모든 Scene 처리 완료. 최종 병합을 시작합니다: ${taskId}`);

            // 상태 변경: STITCHING_VIDEOS
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(
                taskId,
                VideoGenerationTaskStatus.STITCHING_VIDEOS
            );

            // 병합 엔드포인트 호출 (Fire and Forget)
            // 주의: 서버 사이드 fetch이므로 process.env.BASE_URL(절대 경로) 필수

            internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/merge?taskId=${taskId}`, {
                method: 'POST',
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Speed adjustment processed successfully"
        });

    } catch (error) {
        console.error("Speed Webhook Logic Error:", error);

        // 에러 발생 시에도 Replicate가 무한 재시도하지 않도록 200을 반환하되,
        // 내부적으로는 Task를 Failed로 돌리는 것이 안전합니다.
        // 단, 일시적 네트워크 오류일 수 있으므로 상황에 따라 다릅니다.
        // 여기서는 안전하게 로깅만 하고 종료하거나, 심각한 경우 Task Failed 처리합니다.

        return getNextBaseResponse({
            success: true, // Replicate 재시도 방지
            status: 200,
            error: "Internal Server Error in Speed Webhook"
        });
    }
}