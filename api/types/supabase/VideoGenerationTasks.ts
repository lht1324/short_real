// video_generation_tasks 테이블 타입 정의

import {Voice} from "@/api/types/eleven-labs/Voice";
import {BGMInfo} from "@/api/types/supabase/BackgroundMusics";
import {Style} from "@/api/types/supabase/Styles";
import {MasterStyleInfo} from "@/api/server/MasterStyleInfo";

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

export interface VideoGenerationRequest {
    userId: string;
    narrationScript: string;
    style?: Style;
    voiceId?: string;
}

export interface VideoGenerationResponse {
    taskId: string;
}

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
    selected_music_id?: string; // varchar(100), nullable
    selected_style_id?: string; // varchar(100), nullable
    selected_voice_id?: string; // varchar(100), nullable
    created_at?: string; // timestamp with time zone, default CURRENT_TIMESTAMP
    updated_at?: string;
}

export enum SceneGenerationStatus {
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    PROCESSED = 'processed',
    FAILED = 'failed'
}

export enum VideoGenerationTaskStatus {
    PENDING = 'pending',
    IN_PROGRESS = 'in_progress',
    COMPLETED = 'completed',
    FAILED = 'failed'
}

export enum VideoAspectRatio {
    HORIZONTAL_16_9 = "16:9",
    VERTICAL_16_9 = "9:16",
    SQUARE = "1:1",
    HORIZONTAL_5_4 = "5:4",
    VERTICAL_5_4 = "4:5",
    HORIZONTAL_3_2 = "3:2",
    VERTICAL_3_2 = "2:3",
}

export enum VideoResolution {
    RES_480P = "480p",
    RES_720P = "720p",
}