// video_generation_tasks 테이블 타입 정의
import {MasterStyleInfo} from "@/api/types/supabase/MasterStyleInfo";
import {CaptionConfigState, CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {Entity, InitialEntityManifestItem} from "@/api/types/open-ai/Entity";
import {FluxPrompt} from "@/api/types/open-ai/FluxPrompt";
import {ExportPlatform} from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";

export interface VideoGenerationTask {
    id?: string; // uuid
    user_id: string; // uuid
    status?: VideoGenerationTaskStatus; // varchar(50), default 'pending'
    video_prompt?: string; // text, nullable
    narration_script: string; // text, not null
    scene_breakdown_list: SceneData[]; // jsonb, not null
    subtitle_segment_list: SubtitleSegment[]; // jsonb, not null
    master_style_info?: MasterStyleInfo;
    entity_manifest_list?: InitialEntityManifestItem[];
    video_title?: string;
    video_description?: string;
    processed_scene_count?: number;
    music_data_list?: MusicData[];
    final_video_merge_data?: FinalVideoMergeData;
    selected_style_id?: string; // varchar(100), nullable
    selected_voice_id?: string; // varchar(100), nullable
    caption_completed?: boolean; // boolean, default false - 자막 번인 완료 여부
    music_completed?: boolean; // boolean, default false - 음악 편집 완료 여부
    merge_started?: boolean; // boolean, default false - 최종 병합 시작 여부
    is_user_cancelled_task?: boolean; // boolean, default false - 유저 도중 취소 여부 (status와 더불어 판단함)
    is_generation_failed?: boolean; // boolean, default false - 실패 여부 (Retry 시 기존 status 조회하기)
    export_status?: ExportStatus;
    export_platform?: ExportPlatform;
    created_at?: string; // timestamp with time zone, default CURRENT_TIMESTAMP
    updated_at?: string;
}

// '전체' 플로우의 현재 상태, '작업' 한정 아님.
export enum VideoGenerationTaskStatus {
    // 초안 작성
    DRAFTING = 'drafting',
    // 음성 생성
    GENERATING_VOICE = 'generating_voice',

    // 단순 엔드포인트 취소
    // 마스터 스타일 프롬프트 생성
    GENERATING_MASTER_STYLE_PROMPT = 'generating_master_style_prompt',
    // 이미지 생성용 프롬프트 생성
    GENERATING_IMAGE_PROMPT = 'generating_image_prompt',
    // 영상 생성용 프롬프트 생성
    GENERATING_VIDEO_PROMPT = 'generating_video_prompt',

    // Replicate 취소
    // 영상 생성
    GENERATING_VIDEO = 'generating_video',
    // 영상 병합 (영상 병합 + 음성 병합) -> GENERATING_VOICE로 수정? (성우의 음성 녹음)
    STITCHING_VIDEOS = 'stitching_videos',
    // 작곡
    COMPOSING_MUSIC = 'composing_music',

    // 편집
    EDITOR = "editor",
    // 최종 편집
    FINALIZING = "finalizing",
    // 완료
    COMPLETED = 'completed',
    // // 실패
    // FAILED = 'failed',
}

export interface SceneData {
    sceneNumber: number;
    narration: string; // 각 Scene에 보여질 자막
    sceneDuration: number;
    imageGenPromptDirective: string;
    imageGenPrompt?: FluxPrompt; // 각 Scene 이미지 생성에 넣을 프롬프트
    imageGenPromptSentence?: string;
    videoGenPrompt?: string; // 각 Scene 영상 생성에 넣을 프롬프트
    videoGenPromptShort?: string;
    sceneEntityManifestList?: Entity[];
    requestId?: string;
    sceneSubtitleSegments?: SubtitleSegment[];
    sceneCastingEntityIdList?: string[];
    sceneVisualDescription?: string;
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

export interface FinalVideoMergeData {
    // Caption 병합용
    isCaptionEnabled: boolean;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    videoWidth: number;
    videoHeight: number;
    captionAreaTop: number;
    captionAreaVerticalPadding: number;
    captionOneLineHeight: number;

    // Music 자르기용
    musicIndex: number;
    cuttingAreaStartSec: number;
    cuttingAreaEndSec: number;
    volumePercentage: number;
}

export enum ExportStatus {
    UPLOADING = "UPLOADING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
}