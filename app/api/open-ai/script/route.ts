import { NextRequest } from 'next/server';
import { llmServerAPI } from '@/lib/api/server/llmServerAPI';
import { ScriptGenerationRequest } from '@/lib/api/types/open-ai/ScriptGeneration';
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";

export async function POST(request: NextRequest) {
    try {
        // 요청 본문 파싱
        const {
            userPrompt,
        }: ScriptGenerationRequest = await request.json();

        // 필수 필드 검증
        if (!userPrompt) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Prompt is required'
            });
        }

        // OpenAI API를 통해 스크립트 생성
        const result = await llmServerAPI.postScript(userPrompt);

        if (!result) {
            throw new Error("Script generation failed.");
        }

        // 결과 반환
        return getNextBaseResponse(result);
    } catch (error) {
        console.error('Error in script generation route:', error);
        
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Failed to generate script.'
        });
    }
}