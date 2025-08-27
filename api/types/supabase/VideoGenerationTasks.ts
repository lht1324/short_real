// video_generation_tasks 테이블 타입 정의

export interface SceneData {
    sceneNumber: number;
    narration: string;
    startSec: number;
    endSec: number;
}

export interface VideoGenerationTask {
    id: string; // uuid
    user_id: string; // uuid
    title?: string; // varchar(255), nullable
    status: 'pending' | 'in_progress' | 'completed' | 'failed'; // varchar(50), default 'pending'
    video_prompt?: string; // text, nullable
    narration_script: string; // text, not null
    scene_breakdown: SceneData[]; // jsonb, not null
    estimated_duration: number; // integer, not null
    selected_music_id?: string; // varchar(100), nullable
    selected_style_id?: string; // varchar(100), nullable
    selected_voice_id?: string; // varchar(100), nullable
    created_at?: string; // timestamp with time zone, default CURRENT_TIMESTAMP
}

export interface VideoGenerationTaskInsert {
    id?: string; // uuid, default gen_random_uuid()
    user_id: string; // uuid, required
    title?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    video_prompt?: string;
    narration_script: string;
    scene_breakdown: SceneData[];
    estimated_duration: number;
    selected_music_id?: string;
    selected_style_id?: string;
    selected_voice_id?: string;
    created_at?: string;
}

export interface VideoGenerationTaskUpdate {
    id?: never; // ID는 업데이트할 수 없음
    user_id?: never; // user_id는 업데이트할 수 없음
    title?: string;
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    video_prompt?: string;
    narration_script?: string;
    scene_breakdown?: SceneData[];
    estimated_duration?: number;
    selected_music_id?: string;
    selected_style_id?: string;
    selected_voice_id?: string;
    created_at?: never; // created_at는 업데이트할 수 없음
}