import { NextRequest, NextResponse } from 'next/server';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { VideoDataGenerationRequest } from '@/api/types/open-ai/VideoDataGeneration';

export async function POST(request: NextRequest) {
    try {
        // 요청 본문 파싱
        const body: VideoDataGenerationRequest = await request.json();

        // 데이터 유효성 검사
        if (!body.script || !body.script.trim()) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Script is required',
                    code: 'MISSING_SCRIPT'
                }
            }, { status: 400 });
        }

        if (!body.duration || (body.duration !== 15 && body.duration !== 30)) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Duration must be 15 or 30 seconds',
                    code: 'INVALID_DURATION'
                }
            }, { status: 400 });
        }

        // OpenAI API 호출하여 비디오 데이터 생성
        const result = await openAIServerAPI.postOpenAIVideoData(body);

        // 결과 반환
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in video data generation route:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: 'Internal server error',
                code: 'INTERNAL_ERROR'
            }
        }, { status: 500 });
    }
}