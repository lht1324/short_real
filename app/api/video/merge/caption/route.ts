import { NextRequest, NextResponse } from 'next/server';
import { videoServerAPI } from '@/api/server/videoServerAPI';
import {generateASSContent} from "@/utils/captionUtils";
import {PostVideoMergeCaptionRequest} from "@/api/types/api/video/merge/caption/PostVideoMergeCaptionRequest";

export async function POST(request: NextRequest) {
    try {
        const {
            videoUrl,
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
            videoGenerationTaskId
        }: PostVideoMergeCaptionRequest = await request.json();

        // 서버에서 ASS 문자열 생성
        const assContent = generateASSContent(
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
        );

        // Replicate API 호출 (비동기)
        const predictionId = await videoServerAPI.postVideoMergeCaption(
            videoUrl,
            assContent,
            videoGenerationTaskId
        );

        return NextResponse.json({
            success: true,
            predictionId
        });

    } catch (error) {
        console.error('[API Subtitle] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
