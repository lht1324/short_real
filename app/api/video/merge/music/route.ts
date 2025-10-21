import { NextRequest, NextResponse } from 'next/server';
import { videoServerAPI } from '@/api/server/videoServerAPI';

export async function POST(request: NextRequest) {
    try {
        const { videoGenerationTaskId } = await request.json();

        // 필수 값 검증
        if (!videoGenerationTaskId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'videoGenerationTaskId is required'
                },
                { status: 400 }
            );
        }

        console.log(`[API Video-Music Merge] 병합 요청 시작: ${videoGenerationTaskId}`);

        // postVideoMergeMusic() 호출 - Replicate prediction 생성
        const predictionId = await videoServerAPI.postVideoMergeMusic(videoGenerationTaskId);

        console.log(`[API Video-Music Merge] Prediction 생성 완료: ${predictionId}`);

        return NextResponse.json({
            success: true,
            predictionId
        });

    } catch (error) {
        console.error('[API Video-Music Merge] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}