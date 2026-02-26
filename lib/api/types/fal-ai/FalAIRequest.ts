// 서비스별 Request/Response 타입 정의
import {QueueStatus} from "@/lib/api/types/fal-ai/FalAIPublicType";

export interface MergeVideosRequest {
    video_urls: string[];
    target_fps?: number;
    image_size?: 'square_hd' | 'square' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9' | {
        width: number;
        height: number;
    };
}

export interface MergeAudioVideoRequest {
    video_url: string;
    audio_url: string;
    start_offset?: number;
}

export interface SubscribeOptions<T> {
    input: T;
    logs?: boolean;
    onQueueUpdate?: (update: QueueStatus) => void;
}

export interface QueueOptions {
    webhookUrl?: string;
}

export interface StatusOptions {
    requestId: string;
    logs?: boolean;
}

export interface ResultOptions {
    requestId: string;
}