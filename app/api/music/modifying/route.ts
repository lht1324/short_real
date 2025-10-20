import { NextRequest, NextResponse } from 'next/server';
import { musicServerAPI } from '@/api/server/musicServerAPI';
import {PostMusicModifyingRequest} from "@/api/types/api/music/modifying/PostMusicModifyingRequest";

export async function POST(request: NextRequest) {
    try {
        const {
            audioUrl,
            cuttingAreaStartSec,
            cuttingAreaEndSec,
            volumePercentage,
            videoGenerationTaskId
        }: PostMusicModifyingRequest = await request.json();

        // 입력 검증
        if (!audioUrl || !videoGenerationTaskId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'audioUrl and videoGenerationTaskId are required'
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

        // Replicate API 호출 (비동기)
        const predictionId = await musicServerAPI.postMusicModifying(
            audioUrl,
            cuttingAreaStartSec,
            cuttingAreaEndSec,
            volumePercentage,
            videoGenerationTaskId
        );

        return NextResponse.json({
            success: true,
            predictionId
        });

    } catch (error) {
        console.error('[API Music Modify] Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}
