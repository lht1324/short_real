// OpenAI Chat Completions API 응답 타입 정의

export interface ScriptGenerationRequest {
    userPrompt: string;
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

export interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}