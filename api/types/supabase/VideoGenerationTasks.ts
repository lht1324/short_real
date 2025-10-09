// video_generation_tasks 테이블 타입 정의
import {MasterStyleInfo} from "@/api/server/MasterStyleInfo";

export interface VideoGenerationTask {
    id?: string; // uuid
    user_id: string; // uuid
    title?: string; // varchar(255), nullable
    status?: VideoGenerationTaskStatus; // varchar(50), default 'pending'
    video_prompt?: string; // text, nullable
    narration_script: string; // text, not null
    scene_breakdown_list: SceneData[]; // jsonb, not null
    subtitle_segment_list: SubtitleSegment[]; // jsonb, not null
    master_style_positive_prompt?: MasterStyleInfo;
    master_style_negative_prompt?: string;
    video_main_subject?: string;
    processed_scene_count?: number;
    music_data_list?: MusicData[];
    selected_music_id?: string; // varchar(100), nullable
    selected_style_id?: string; // varchar(100), nullable
    selected_voice_id?: string; // varchar(100), nullable
    created_at?: string; // timestamp with time zone, default CURRENT_TIMESTAMP
    updated_at?: string;
}

// '전체' 플로우의 현재 상태, '작업' 한정 아님.
export enum VideoGenerationTaskStatus {
    // 초안 작성
    DRAFTING = 'drafting',
    // 음성 생성
    GENERATING_VOICE = 'generating_voice',
    // 마스터 스타일 프롬프트 생성
    GENERATING_MASTER_STYLE_PROMPT = 'generating_master_style_prompt',
    // 이미지 생성용 프롬프트 생성
    GENERATING_IMAGE_PROMPT = 'generating_image_prompt',
    // 영상 생성용 프롬프트 생성
    GENERATING_VIDEO_PROMPT = 'generating_video_prompt',
    // 영상 생성
    GENERATING_VIDEO = 'generating_video',
    // 영상 병합
    STITCHING_VIDEOS = 'stitching_videos',
    // 영상과 음성 병합
    MERGING_VIDEO_AND_AUDIO = 'merging_video_and_audio',
    // 작곡
    COMPOSING_MUSIC = 'composing_music',
    // 편집
    EDITOR = "editor",
    // 완료
    COMPLETED = 'completed',
    // 실패
    FAILED = 'failed',
}

export interface SceneData {
    sceneNumber: number;
    narration: string; // 각 Scene에 보여질 자막
    sceneDuration: number;
    imageGenPromptDirective: string;
    imageGenPrompt?: string; // 각 Scene 이미지 생성에 넣을 프롬프트
    videoGenPrompt?: string; // 각 Scene 영상 생성에 넣을 프롬프트
    requestId?: string;
    sceneSubtitleSegments?: SubtitleSegment[];
    status: SceneGenerationStatus;
}

export interface SubtitleSegment {
    word: string;
    startSec: number;
    endSec: number;
}

export enum SceneGenerationStatus {
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PROCESSED = 'processed',
    FAILED = 'failed'
}

export interface MusicData {
    title: string;
    tagList: string[];
    audioUrl?: string;
    imageUrl?: string;
    duration: number; // sec
}