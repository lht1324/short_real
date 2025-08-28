// Video Data 생성 요청/응답 타입

import {OpenAIUsage} from "@/api/types/open-ai/OpenAIResponse";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";
import {Voice} from "@/api/types/eleven-labs/Voice";

export interface VideoDataGenerationRequest {
    script: string; // 생성된 스크립트
    duration: number; // 초 단위 (15 또는 30)
    style?: {
        id: string;
        name: string;
        description: string;
    };
    voice?: Voice,
    music?: {
        id: string;
        title: string;
        artist: string;
    };
}

export interface VideoDataGenerationResponse {
    success: boolean;
    data?: {
        videoPrompt: string; // Pika용 영상 생성 프롬프트
        narrationScript: string; // 내레이션 스크립트
        sceneBreakdown: SceneData[]; // 장면별 분할
        estimatedDuration: number; // 예상 소요 시간 (초)
    };
    error?: {
        message: string;
        code?: string;
    };
    usage?: OpenAIUsage;
}