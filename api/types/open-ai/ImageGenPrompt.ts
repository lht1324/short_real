/**
 * Google GenAI Imagen 4를 위한 구조적 프롬프트 스키마 (SIJS)
 * - 불필요한 메타데이터 삭제 (Token 절약)
 * - 시각적 데이터(Visual Data)에만 집중
 */
export interface ImageGenPrompt {
    technical_specifications: {
        /** 예: 'Japanese Anime Style', 'Photorealistic', 'Oil Painting' */
        art_style: string;
        camera_settings: {
            /** 예: 'Low angle', 'Dutch tilt', 'Overhead shot' */
            angle: string;
            /** 예: 'Wide shot', 'Medium close-up', 'Macro' */
            framing: string;
            /** 예: 'Sharp focus on subject', 'Bokeh background' */
            focus: string;
        };
        /** 예: 'Unreal Engine 5', 'V-Ray', 'Analog Film' */
        rendering_engine: string;
        /** 화질 및 디테일 향상을 위한 태그 배열 */
        quality_tags: string[];
    };

    /** * 등장하는 모든 인물, 사물, 동물 등을 정의.
     * 배열 구조를 통해 각 객체의 속성(색상, 옷 등)이 서로 섞이지 않게 격리함.
     */
    entity_manifest: Entity[];

    environmental_context: {
        /** 예: 'Cyberpunk alleyway', 'Sunny meadow' */
        location: string;
        /** 예: 'Rainy', 'Foggy', 'Dusty' */
        atmosphere: string;
        lighting_setup: {
            /** 전반적인 조명 (예: 'Soft moonlight') */
            global_light: string;
            /** 포인트 조명 (예: 'Neon pink rim light') */
            accent_light?: string;
        };
        /** 배경을 구성하는 주요 요소들 */
        background_elements?: string[];
    };

    interaction_logic: {
        /** * 객체 간의 위치 관계 명시.
         * 예: ['subject_01 is on the left', 'object_01 is behind subject_01']
         */
        spatial_arrangement: string[];
        /** * 객체 간의 행동 및 상호작용.
         * 예: ['subject_01 is holding object_01', 'subject_01 looks at subject_02']
         */
        actions: string[];
    };

    constraints: {
        /** * 생성되지 말아야 할 요소 (Negative Prompt).
         * 예: 'text, watermark, blurry, distorted hands'
         */
        exclusions?: string;
    };
}

// Entity 인터페이스는 기존과 동일하게 유지
export interface Entity {
    id: string;
    role: 'main_hero' | 'sub_character' | 'background_extra' | 'prop';
    type: 'human' | 'creature' | 'object' | 'machine' | 'animal';
    demographics?: string;
    appearance: {
        clothing_or_material: string;
        hair?: string;
        accessories?: string[];
        body_features?: string;
    };
    state: {
        pose: string;
        expression?: string;
    };
    text_render?: {
        content: string;
        style: string;
    };
}