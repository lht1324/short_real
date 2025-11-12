// OpenAI Chat Completions API 응답 타입 정의

import {BaseResponse} from "@/api/types/api/BaseResponse";

export interface ScriptGenerationRequest {
    userPrompt: string;
}

// 우리 앱에서 사용할 스크립트 응답 타입
export interface ScriptGenerationResponse extends BaseResponse {
    data?: {
        script: string; // 생성된 스크립트
        wordCount: number; // 단어 수
        estimatedDuration: number; // 예상 소요 시간 (초)
        prompt: string; // 원본 프롬프트
    };
}