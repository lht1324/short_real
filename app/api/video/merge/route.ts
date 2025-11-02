import {NextRequest, NextResponse} from "next/server";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";

export async function POST(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return NextResponse.json({
            success: false,
            status: 400,
            error: "taskId is required"
        });
    }

    try {
        console.log(`[Merge Service] Task 데이터 조회: ${taskId}`);
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return NextResponse.json({
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
        fetch(new URL(`${process.env.BASE_URL}/api/music?taskId=${taskId}`, request.url).toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch(error => {
            console.error('Fire and forget /api//music call failed:', error);
        });

        // 3. 성공 응답 반환
        return NextResponse.json({
            success: true,
            status: 200,
            message: "Final video merged and uploaded successfully.",
        });

    } catch (error) {
        console.error("영상 병합 엔드포인트 에러:", error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return NextResponse.json({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to merge the final video.",
        });
    }
}