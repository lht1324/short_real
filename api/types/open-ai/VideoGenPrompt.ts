/**
 * Seedance 1.0 Pro Fast - Optimized Generation Schema
 * meta 필드 제거됨 (GPT-4o-mini 토큰 절약 및 노이즈 감소)
 */

// ... (Enums 등은 그대로 유지) ...

export interface VideoGenPrompt {
    // 1. Scene Context (전체 그림)
    // 모델에게 "어떤 영상을 만들 것인가"에 대한 큰 그림을 제공합니다.
    scene_global: {
        description: string; // 전체 씬을 아우르는 소설 같은 묘사 (Verbose Narrative)
        mood_keywords: string[]; // 분위기/속도감 제어 (e.g., "Fast-paced", "Gritty")
    };

    // 2. Cast & Action (인물과 동작 - 핵심)
    // 인물 외형은 고정하고, 동작은 흐름(Flow)으로 기술합니다.
    subjects: {
        id: string; // Entity Manifest와 매칭되는 고유 ID
        visual_attributes: {
            appearance: string; // "Black hoodie, curly hair..." (일관성 유지를 위한 외형 묘사)
            weight_simulation: 'heavy' | 'light' | 'dynamic'; // 물리 엔진 힌트 (최소한의 제어)
        };
        motion_frame: {
            // 기존 primary_action을 대체. 시작-중간-끝이 있는 서사적 동작 기술.
            // 예: "Explodes from crouch -> Sprints forward -> Leaps -> Lands smoothly"
            narrative_sequence: string;
            action_intensity: 'high' | 'medium' | 'low'; // 동작의 에너지 레벨
        };
    }[];

    // 3. Environment (무대 배경)
    // 인물이 움직이는 공간을 고정하여 배경이 울렁거리는 것을 방지합니다.
    environment: {
        setting_description: string; // "Graffiti-covered urban alley with wet asphalt"
        lighting: string; // "High-contrast street lamps"
    };

    // 4. Cinematography (카메라 연출)
    // 영상의 역동성을 결정하는 카메라 워킹을 별도로 분리합니다.
    cinematography: {
        shot_type: string; // "Low-angle tracking shot"
        camera_movement: string; // "Follow subject at high speed"
        shake_intensity?: 'stable' | 'handheld' | 'earthquake'; // 현장감 조절
    };

    // 5. Safety & Quality (제약 조건)
    constraints?: {
        negative_prompt?: string; // "morphing, blurring, distortion"
    };
}