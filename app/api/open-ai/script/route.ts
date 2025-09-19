import { NextRequest, NextResponse } from 'next/server';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { ScriptGenerationRequest } from '@/api/types/open-ai/ScriptGeneration';

export async function POST(request: NextRequest) {
    try {
        // 요청 본문 파싱
        const {
            userPrompt,
            duration,
        }: {
            userPrompt: string;
            duration: number;
        } = await request.json();

        // 필수 필드 검증
        if (!userPrompt) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Prompt is required',
                    code: 'MISSING_PROMPT'
                }
            }, { status: 400 });
        }

        if (!duration || (duration !== 15 && duration !== 30)) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Duration must be 15 or 30 seconds',
                    code: 'INVALID_DURATION'
                }
            }, { status: 400 });
        }

        // OpenAI API를 통해 스크립트 생성
        const result = await openAIServerAPI.postScript(userPrompt, duration);

        // 결과 반환
        return NextResponse.json(result);

    } catch (error) {
        console.error('Error in script generation route:', error);
        
        return NextResponse.json({
            success: false,
            error: {
                message: 'Internal server error',
                code: 'INTERNAL_ERROR'
            }
        }, { status: 500 });
    }
}