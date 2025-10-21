import { NextRequest, NextResponse } from 'next/server';
import { videoServerAPI } from '@/api/server/videoServerAPI';
import { musicServerAPI } from '@/api/server/musicServerAPI';
import { generateASSContent } from "@/utils/captionUtils";
import { PostVideoMergeFinalRequest } from "@/api/types/api/video/merge/final/PostVideoMergeFinalRequest";

export async function POST(request: NextRequest) {
    try {
        const {
            videoGenerationTaskId,
            // Caption 관련
            videoUrl,
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
            // Music 관련
            audioUrl,
            cuttingAreaStartSec,
            cuttingAreaEndSec,
            volumePercentage,
        }: PostVideoMergeFinalRequest = await request.json();

        // 필수 값 검증
        if (!videoGenerationTaskId || !videoUrl || !audioUrl) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'videoGenerationTaskId, videoUrl, and audioUrl are required'
                },
                { status: 400 }
            );
        }

        if (cuttingAreaEndSec <= cuttingAreaStartSec) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'cuttingAreaEndSec must be greater than cuttingAreaStartSec'
                },
                { status: 400 }
            );
        }

        if (volumePercentage < 0 || volumePercentage > 100) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'volumePercentage must be between 0 and 100'
                },
                { status: 400 }
            );
        }

        // ASS 콘텐츠 생성
        const assContent = generateASSContent(
            captionDataList,
            captionConfigState,
            videoWidth,
            videoHeight,
            captionAreaTop,
            captionAreaVerticalPadding,
            captionOneLineHeight,
        );

        // TODO: DB에 작업 상태 저장
        // await db.update({
        //     videoGenerationTaskId,
        //     caption_started: true,
        //     music_cut_started: true,
        //     caption_completed: false,
        //     music_cut_completed: false,
        //     merge_started: false
        // });

        // 1. Caption 번인 2. Music 편집을 병렬 실행
        const [captionPredictionId, musicPredictionId] = await Promise.all([
            videoServerAPI.postVideoMergeCaption(
                videoUrl,
                assContent,
                videoGenerationTaskId
            ),
            musicServerAPI.postMusicModifying(
                audioUrl,
                cuttingAreaStartSec,
                cuttingAreaEndSec,
                volumePercentage,
                videoGenerationTaskId
            )
        ]);

        console.log(`[API Final] Caption prediction: ${captionPredictionId}`);
        console.log(`[API Final] Music prediction: ${musicPredictionId}`);

        return NextResponse.json({
            success: true,
            captionPredictionId,
            musicPredictionId
        });

    } catch (error) {
        console.error('[API Final] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}