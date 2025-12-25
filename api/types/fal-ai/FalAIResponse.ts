import {FalFile, Metadata} from "@/api/types/fal-ai/FalAIPublicType";

export interface MergeVideosResponse {
    video: FalFile;
    metadata: Metadata;
}

export interface MergeAudioVideoResponse {
    video: FalFile;
}

// API 응답 공통 인터페이스
export interface FalApiResult<T> {
    data: T;
    requestId: string;
}

export interface QueueSubmitResult {
    request_id: string;
}

export interface FalAiErrorDetail {
    loc: string[];
    msg: string;
    type: string;
    url: string;
    input: unknown;
}