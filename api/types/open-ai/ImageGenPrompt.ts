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

    motion_vector: {
        /** * The specific timing of the snapshot relative to the action.
         * - 'preparation': Before movement (coiled, tense).
         * - 'initiation': The moment of starting (explosive start).
         * - 'peak_action': Mid-air or max velocity (frozen).
         * - 'impact': Touching down or colliding (compression).
         * - 'recovery': Aftermath (sliding, stabilizing).
         */
        time_phase: 'preparation' | 'initiation' | 'peak_action' | 'impact' | 'recovery';

        /** * The primary direction of kinetic energy.
         * Used for hair/clothing physics and muscle tension direction.
         * e.g., "forward_and_down", "vertical_up", "rotational_spin"
         */
        force_direction: string;

        /**
         * Visual cues implying speed or tension.
         * e.g., "hair blowing backwards", "muscles fully extended", "clothing rippling"
         */
        visual_evidence: string;
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

export interface PhysicsProfile {
    /**
     * Layer A: 재료 역학 (Material Dynamics) - "충격에 어떻게 반응하는가?"
     * - 'rigid': 강체 (금속, 바위, 뼈) -> 찌그러짐(Dent), 튕김(Bounce), 파편화(Shatter).
     * - 'viscoelastic': 점탄성체 (피부, 고무, 근육) -> 출렁임(Ripple), 멍(Bruise), 충격 흡수.
     * - 'brittle': 취성체 (유리, 얼음, 도자기) -> 산산조각(Crack/Shatter).
     * - 'cloth': 직물 (옷, 머리카락) -> 펄럭임(Flutter), 주름(Fold), 항력.
     * - 'fluid': 유체 (물, 피, 땀) -> 비산(Spray), 흐름(Flow).
     */
    material: 'rigid' | 'viscoelastic' | 'brittle' | 'cloth' | 'fluid' | 'elastoplastic' | 'granular';

    /**
     * Layer B: 행동 맥락 (Action Context) - "어떤 힘이 지배하는가?"
     * - 'locomotion': 이동 (달리기, 주행) -> 마찰력, 관성, 무게 중심 이동.
     * - 'combat': 전투 (타격, 피격) -> 비탄성 충돌(Snap), 충격파, 넉백.
     * - 'interaction': 상호작용 (잡기, 조작) -> 미세 컨트롤, 파지력.
     * - 'aerodynamics': 공기역학 (비행, 낙하) -> 양력, 항력, 중력 가속도.
     * - 'passive': 수동적 상태 (정지, 밀려남) -> 외부 힘에 의한 반응.
     * - 'velocity_max': 초고속 이동
     */
    action_context: 'locomotion' | 'combat' | 'interaction' | 'aerodynamics' | 'passive' | 'velocity_max';
}

// Entity 인터페이스는 기존과 동일하게 유지
export interface Entity {
    id: string;
    role: 'main_hero' | 'sub_character' | 'background_extra' | 'prop';

    /** 시각적/의미적 분류 (VLM 이해용 보조 태그) */
    type: 'human' | 'creature' | 'object' | 'machine' | 'animal' | 'hybrid';

    demographics: string; // 예: "African American, 30s"

    appearance: {
        /** * 재질감을 암시하는 텍스처 설명 (Deep Research - Dimension 2 반영)
         * 예: "Glossy chrome plating" (Rigid 암시), "Sweat-drenched pores" (Viscoelastic 암시)
         */
        clothing_or_material: string;
        hair?: string;
        accessories?: string[];
        body_features?: string;
    };

    // LLM 생각 정리용 내부 변수, 실사용 없음
    state?: {
        /** * 정지 이미지(t=0)에서의 초기 자세
         * 예: "Right fist fully extended", "Suspension compressed"
         */
        pose: string;
        expression?: string;
    };

    /** * [New] 물리 엔진 라우팅을 위한 핵심 프로필
     * 기존 'biotype'을 대체하며, 영상 생성 프롬프트 조립 시 Key로 사용됨.
     */
    physics_profile?: PhysicsProfile;
}

export type InitialEntityManifestItem = Omit<Entity, 'physics_profile' | 'state'>;