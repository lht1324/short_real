interface BaseFfmpegCommandRequest {
    input_files: Record<string, string>; // in_ 접두사 필수
    output_files: Record<string, string>; // out_ 접두사 필수
    vcpu_count?: number; // vCPU 개수 (선택)
}

export interface RunFfmpegCommandRequest extends BaseFfmpegCommandRequest {
    ffmpeg_command: string; // {{alias}} 플레이스홀더 사용
}

export interface RunChainedFfmpegCommandsRequest extends BaseFfmpegCommandRequest {
    ffmpeg_commands: string[]; // 명령어 배열
}

export interface RunFfmpegCommandResponse {
    command_id: string;
}

export interface OutputFile {
    file_id: string;
    size_mbytes: number;
    duration?: number;
    file_type: 'video' | 'audio' | 'image';
    file_format: string;
    storage_url: string;
    width?: number;
    height?: number;
    codec?: string;
    frame_rate?: number;
    bitrate_video_kb?: number;
    bitrate_audio_kb?: number;
}

export interface PollCommandResponse {
    command_id: string;
    status: 'PROCESSING' | 'SUCCESS' | 'FAILED';
    command_type: 'FFMPEG_COMMAND' | 'FFMPEG_CHAINED_COMMANDS';
    vcpu_count: number;
    total_processing_seconds?: number;
    ffmpeg_command_run_seconds?: number;
    output_files?: Record<string, OutputFile>;
    error_status?: string;
    error_message?: string;
    original_request: RunFfmpegCommandRequest | RunChainedFfmpegCommandsRequest | unknown;
}

export interface StoreFileRequest {
    file_url: string;
}

export interface StoreFileResponse {
    file_id: string;
}

export interface WebhookPayload {
    data: PollCommandResponse;
    timestamp: number;
}