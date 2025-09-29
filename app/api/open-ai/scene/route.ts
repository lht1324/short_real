import { NextRequest, NextResponse } from 'next/server';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { PostSceneRequest } from './PostSceneRequest';
import { PostSceneResponse } from './PostSceneResponse';
import {voiceServerAPI} from "@/api/server/voiceServerAPI";

export async function POST(request: NextRequest): Promise<NextResponse<PostSceneResponse>> {
    try {
        const body: PostSceneRequest = await request.json();
        const { narrationScript, voiceId } = body;

        // 필수 필드 검증
        if (!narrationScript) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'narrationScript is required.',
                    code: 'MISSING_REQUIRED_FIELDS'
                }
            }, { status: 400 });
        }

        const voiceGenerationResult = await voiceServerAPI.postVoice(
            narrationScript,
            voiceId,
        )

            // OpenAI API를 통해 Scene 분리 처리
        const sceneSegmentationResult = await openAIServerAPI.postSceneSegmentation(
            narrationScript,
            voiceGenerationResult.subtitleSegmentList
        );

        if (!sceneSegmentationResult.success) {
            return NextResponse.json({
                success: false,
                error: {
                    message: sceneSegmentationResult.error?.message || 'Failed to generate scene segmentation',
                    code: sceneSegmentationResult.error?.code || 'SCENE_SEGMENTATION_FAILED'
                }
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                sceneDataList: sceneSegmentationResult.sceneDataList || [],
                videoMainSubject: sceneSegmentationResult.videoMainSubject || ''
            }
        });

    } catch (error) {
        console.error('Scene segmentation API error:', error);

        return NextResponse.json({
            success: false,
            error: {
                message: 'An error occurred during scene segmentation processing.',
                code: 'INTERNAL_SERVER_ERROR'
            }
        }, { status: 500 });
    }
}