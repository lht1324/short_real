export interface OpenAIChatOriginalResponse {
    id: string;
    object: 'chat.completion';
    created: number; // Unix timestamp
    model: string;
    choices: OpenAIChoice[];
    usage: OpenAIUsage;
    system_fingerprint?: string;
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

export interface OpenAIMessage {
    role: OpenAIRole;
    content: string;
}

export enum OpenAIFinishReason {
    Length = 'length',
    ContentFilter = 'content_filter',
    Stop = 'stop'
}

export enum OpenAIRole {
    System = 'system',
    User = 'user',
    Assistant = 'assistant'
}