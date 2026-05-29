import {NextRequest} from "next/server";
import {videoServerAPI} from "@/lib/api/server/videoServerAPI";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {taskCheckAndCleanupIfCancelled} from "@/lib/utils/taskCheckAndCleanupIfCancelled";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "taskId is required"
        });
    }

    try {
        console.log(`[Merge Service] Task 데이터 조회: ${taskId}`);
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Task not found",
            });
        }

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        console.log(`최종 영상 병합 요청 수신: ${taskId}`);

        // 취소 여부 확인

        // 2. videoServerAPI의 postFinalVideo 함수 호출
        // 이 함수는 내부적으로 videoUtils의 로직을 사용하여 모든 처리를 수행합니다.
        const isMergingVideoSuccess = await videoServerAPI.postFinalVideo(taskId, videoGenerationTask);

        if (!isMergingVideoSuccess) {
            throw new Error("Merging processed videos failed.")
        }

        console.log(`최종 영상 병합 완료.`);

        const patchStatusComposingMusicResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.COMPOSING_MUSIC);

        const checkingFinalResult = await taskCheckAndCleanupIfCancelled(patchStatusComposingMusicResult);

        if (checkingFinalResult) {
            return checkingFinalResult;
        }

        // /api/music 엔드포인트 호출 (Fire and Forget)
        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/music?taskId=${taskId}`, {
            method: 'POST',
        });

        // 3. 성공 응답 반환
        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Final video merged and uploaded successfully.",
        });

    } catch (error) {
        console.error("영상 병합 엔드포인트 에러:", error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to merge the final video.",
        });
    }
}