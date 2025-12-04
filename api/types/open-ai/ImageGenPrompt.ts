/**
 * Google GenAI Imagen 4를 위한 구조적 프롬프트 스키마 (SIJS: Standardized Imagen JSON Schema)
 * 복합 객체의 속성 격리(Attribute Isolation)와 정밀 제어를 목적으로 함.
 */
export interface ImageGenPrompt {
    meta_config: {
        project_name?: string;
        /** * 구조적 제어의 정확성을 위해 false 권장.
         * true일 경우 모델이 JSON을 무시하고 창의적으로 재해석할 위험이 있음.
         */
        enhance_prompt: boolean;
        notes?: string;
    };

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

/** 개별 등장 요소 정의 */
export interface Entity {
    /** 고유 ID (interaction_logic에서 참조용). 예: 'hero_girl', 'rusty_robot' */
    id: string;
    /** 이미지 내 역할 가중치 */
    role: 'main_hero' | 'sub_character' | 'background_extra' | 'prop';
    /** 객체 유형 */
    type: 'human' | 'creature' | 'object' | 'machine' | 'animal';

    /** 인구통계학적 특성 (사람일 경우 필수). 예: 'Korean female, 20s' */
    demographics?: string;

    appearance: {
        /** 의상, 스킨, 재질 등 시각적 묘사. 복잡한 패턴 지양. */
        clothing_or_material: string;
        hair?: string;
        accessories?: string[];
        /** 신체적 특징 (흉터, 키 등) */
        body_features?: string;
    };

    state: {
        /** 예: 'Standing tall', 'Sitting on bench' */
        pose: string;
        /** 예: 'Smiling', 'Neutral', 'Mouth closed' */
        expression?: string;
    };

    /** 텍스트 렌더링이 필요한 경우 사용 */
    text_render?: {
        content: string;
        style: string;
    };
}