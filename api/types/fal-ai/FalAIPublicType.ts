// 공통 타입 정의
import {MergeAudioVideoRequest, MergeVideosRequest} from "@/api/types/fal-ai/FalAIRequest";
import {MergeAudioVideoResponse, MergeVideosResponse} from "@/api/types/fal-ai/FalAIResponse";

export interface FalFile {
    url: string;
    content_type?: string;
    file_name?: string;
    file_size?: number;
}

export interface Resolution {
    aspect_ratio: string;
    width: number;
    height: number;
}

export interface AudioTrack {
    codec: string;
    channels: number;
    sample_rate: number;
    bitrate: number;
}

export interface VideoFormat {
    container: string;
    video_codec: string;
    profile: string;
    level: number;
    pixel_format: string;
    bitrate: number;
}

export interface Video {
    media_type?: 'video';
    url: string;
    content_type: string;
    file_name: string;
    file_size: number;
    duration: number;
    bitrate: number;
    codec: string;
    container: string;
    fps: number;
    frame_count: number;
    timebase: string;
    resolution: Resolution;
    format: VideoFormat;
    audio?: AudioTrack;
    start_frame_url?: string;
    end_frame_url?: string;
}

export interface Metadata {
    [key: string]: any; // 메타데이터는 각 서비스마다 다를 수 있음
}

// 서비스 타입 정의
export type FalService = 'merge-videos' | 'merge-audio-video';

// 서비스별 Request/Response 매핑
export interface ServiceTypeMap {
    'merge-videos': {
        request: MergeVideosRequest;
        response: MergeVideosResponse;
    };
    'merge-audio-video': {
        request: MergeAudioVideoRequest;
        response: MergeAudioVideoResponse;
    };
}

export interface QueueStatus {
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    logs?: Array<{ message: string; level: string; timestamp: string }>;
}