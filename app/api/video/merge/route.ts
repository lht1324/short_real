import { NextRequest, NextResponse } from "next/server";
import { videoServerAPI } from "@/api/server/videoServerAPI";

export async function POST(request: NextRequest) {
    try {
        // 1. 요청 Body에서 generationTaskId 추출
        const { generationTaskId } = await request.json();
        if (!generationTaskId) {
            return NextResponse.json({ error: "generationTaskId is required" }, { status: 400 });
        }

        console.log(`최종 영상 병합 요청 수신: ${generationTaskId}`);

        // 2. videoServerAPI의 postFinalVideo 함수 호출
        // 이 함수는 내부적으로 videoUtils의 로직을 사용하여 모든 처리를 수행합니다.
        const finalVideoUrl = await videoServerAPI.postFinalVideo(generationTaskId);

        console.log(`최종 영상 병합 완료. Public URL: ${finalVideoUrl}`);

        // 3. 성공 응답 반환
        return NextResponse.json({
            success: true,
            message: "Final video merged and uploaded successfully.",
            data: {
                finalVideoUrl: finalVideoUrl,
            }
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