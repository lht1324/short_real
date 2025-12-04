/**
 * Seedance 1.0 Pro Fast - Optimized Generation Schema
 * meta 필드 제거됨 (GPT-4o-mini 토큰 절약 및 노이즈 감소)
 */

// ... (Enums 등은 그대로 유지) ...

export interface VideoGenPrompt {
    // model 필드는 보통 API 호출 코드에서 하드코딩하므로 프롬프트 JSON에는 없어도 됩니다.
    // 필요하다면 남겨두세요.

    scene_global: {
        description: string;
        mood_keywords: string[];
        temporal_flow: 'sequential' | 'simultaneous' | 'chaotic';
        // physics_engine_override는 모델 제어에 도움이 되므로 유지
        physics_engine_override?: {
            gravity?: 'normal' | 'low_g' | 'zero_g' | 'heavy';
            time_scale?: 'realtime' | 'slow_motion' | 'timelapse';
        };
    };

    subjects: {
        id: string;
        type: string; // Enum 활용
        visual_attributes: {
            appearance: string;
            material_properties?: string;
            weight_simulation?: 'heavy' | 'light' | 'floating'; // 중요
        };
        motion_logic: {
            primary_action: string;
            action_intensity: 'high' | 'medium' | 'low';
            micro_movements?: string;
        };
        // spatial_anchor는 필요 시 유지, 복잡하면 제거 가능
    }[];

    // interactions는 다중 피사체일 때 매우 중요하므로 유지
    interactions?: {
        trigger_subject: string;
        target_subject: string;
        interaction_type: string;
        causality: string;
    }[];

    environment: {
        setting_anchor: string;
        lighting_dynamics?: { behavior: string }; // 간소화 가능
        atmospherics?: { particles?: string; wind_force?: string };
    };

    cinematography: {
        shot_type: string;
        camera_movement?: {
            type: string;
            speed?: string;
            shake_intensity?: string; // 타격감 표현에 중요하므로 유지
        };
    };

    constraints?: {
        negative_prompt?: string;
    };
}