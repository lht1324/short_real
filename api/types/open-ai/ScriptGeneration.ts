// OpenAI Chat Completions API 응답 타입 정의

export interface ScriptGenerationRequest {
    prompt: string;
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

export interface OpenAIMessage {
    role: OpenAIRole;
    content: string;
}

export interface OpenAIChoice {
    index: number;
    message: OpenAIMessage;
    finish_reason: OpenAIFinishReason | null;
}

export interface OpenAIUsage {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
}

export interface OpenAIChatOriginalResponse {
    id: string;
    object: 'chat.completion';
    created: number; // Unix timestamp
    model: string;
    choices: OpenAIChoice[];
    usage: OpenAIUsage;
    system_fingerprint?: string;
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

export enum OpenAIRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant'
}

export enum OpenAIFinishReason {
    Length = 'length',
    ContentFilter = 'content_filter',
    Stop = 'stop'
}