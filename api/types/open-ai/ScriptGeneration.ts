// OpenAI Chat Completions API 응답 타입 정의

import {OpenAIUsage} from "@/api/types/open-ai/OpenAIResponse";

export interface ScriptGenerationRequest {
    userPrompt: string;
    duration: number; // 초 단위 (15 또는 30)
    style?: {
        id: string;
        name: string;
        description: string;
    };
    voice?: {
        id: string;
        name: string;
        characteristics: string;
    };
    music?: {
        id: string;
        title: string;
        artist: string;
    };
}

// 우리 앱에서 사용할 스크립트 응답 타입
export interface ScriptGenerationResponse {
    success: boolean;
    data?: {
        script: string; // 생성된 스크립트
        wordCount: number; // 단어 수
        estimatedDuration: number; // 예상 소요 시간 (초)
        prompt: string; // 원본 프롬프트
    };
    error?: {
        message: string;
        code?: string;
    };
    usage?: OpenAIUsage; // API 사용량 정보
}

// API 에러 응답 타입
export interface APIError {
    error: {
        message: string;
        type: string;
        param?: string;
        code?: string;
    };
}