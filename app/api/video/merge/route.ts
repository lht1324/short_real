import {NextRequest, NextResponse} from "next/server";
import {videoServerAPI} from "@/api/server/videoServerAPI";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {taskCheckAndCleanupIfCancelled} from "@/app/api/video/process/taskCheckAndCleaupIfCancelled";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. 요청 Body에서 generationTaskId 추출
        const { generationTaskId } = await request.json();
        if (!generationTaskId) {
            return NextResponse.json({ error: "generationTaskId is required" }, { status: 400 });
        }

        console.log(`[Merge Service] Task 데이터 조회: ${generationTaskId}`);
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(generationTaskId);
        if (!videoGenerationTask) {
            throw new Error("Task not found.");
        }

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        console.log(`최종 영상 병합 요청 수신: ${generationTaskId}`);

        // 취소 여부 확인

        // 2. videoServerAPI의 postFinalVideo 함수 호출
        // 이 함수는 내부적으로 videoUtils의 로직을 사용하여 모든 처리를 수행합니다.
        const isMergingVideoSuccess = await videoServerAPI.postFinalVideo(generationTaskId, videoGenerationTask);

        if (!isMergingVideoSuccess) {
            throw new Error("Merging processed videos failed.")
        }

        console.log(`최종 영상 병합 완료.`);

        const patchStatusComposingMusicResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(generationTaskId, VideoGenerationTaskStatus.COMPOSING_MUSIC);

        const checkingFinalResult = await taskCheckAndCleanupIfCancelled(patchStatusComposingMusicResult);

        if (checkingFinalResult) {
            return checkingFinalResult;
        }

        if (!patchStatusComposingMusicResult.master_style_positive_prompt) {
            throw new Error("Master style prompt is invalid.");
        }

        const postMusicGenerationDataResult = await openAIServerAPI.postMusicGenerationData(
            patchStatusComposingMusicResult.video_main_subject as string,
            patchStatusComposingMusicResult.narration_script,
            patchStatusComposingMusicResult.master_style_positive_prompt,
            patchStatusComposingMusicResult.scene_breakdown_list,
        )

        fetch(new URL(`${process.env.BASE_URL}/api/music?generationTaskId=${generationTaskId}`, request.url).toString(), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // 필요하다면 내부 인증을 위한 시크릿 키 등을 추가할 수 있습니다.
                // 'Authorization': `Bearer ${process.env.INTERNAL_SECRET_KEY}`
            },
            body: JSON.stringify(postMusicGenerationDataResult.data),
        });

        // 3. 성공 응답 반환
        return NextResponse.json({
            success: true,
            message: "Final video merged and uploaded successfully.",
        });

    } catch (error) {
        console.error("영상 병합 엔드포인트 에러:", error);

        // 500 상태 코드와 함께 에러 응답 반환
        return NextResponse.json(
            {
                success: false,
                error: "Failed to merge the final video.",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}