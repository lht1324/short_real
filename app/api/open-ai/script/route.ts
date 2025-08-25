import { NextRequest, NextResponse } from 'next/server';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { ScriptGenerationRequest } from '@/api/types/open-ai/ScriptGeneration';

export async function POST(request: NextRequest) {
    try {
        // î≠ ¯8 Ò
        const body: ScriptGenerationRequest = await request.json();

        // D D‹ Äù
        if (!body.prompt) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'Prompt is required',
                    code: 'MISSING_PROMPT'
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

        // OpenAI API| µt §lΩ∏ ›1
        const result = await openAIServerAPI.postOpenAIScript(body);

        // ∞¸ X
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