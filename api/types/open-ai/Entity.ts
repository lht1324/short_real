export interface PhysicsProfile {
    /**
     * Layer A: 재료 역학 (Material Dynamics) - "충격에 어떻게 반응하는가?"
     * - 'rigid': 강체 (금속, 바위, 뼈) -> 찌그러짐(Dent), 튕김(Bounce), 파편화(Shatter).
     * - 'viscoelastic': 점탄성체 (피부, 고무, 근육) -> 출렁임(Ripple), 멍(Bruise), 충격 흡수.
     * - 'brittle': 취성체 (유리, 얼음, 도자기) -> 산산조각(Crack/Shatter).
     * - 'cloth': 직물 (옷, 머리카락) -> 펄럭임(Flutter), 주름(Fold), 항력.
     * - 'fluid': 유체 (물, 피, 땀) -> 비산(Spray), 흐름(Flow).
     */
    material: ('rigid' | 'viscoelastic' | 'brittle' | 'cloth' | 'fluid' | 'elastoplastic' | 'granular')[];

    /**
     * Layer B: 행동 맥락 (Action Context) - "어떤 힘이 지배하는가?"
     * - 'locomotion': 이동 (달리기, 주행) -> 마찰력, 관성, 무게 중심 이동.
     * - 'combat': 전투 (타격, 피격) -> 비탄성 충돌(Snap), 충격파, 넉백.
     * - 'interaction': 상호작용 (잡기, 조작) -> 미세 컨트롤, 파지력.
     * - 'aerodynamics': 공기역학 (비행, 낙하) -> 양력, 항력, 중력 가속도.
     * - 'passive': 수동적 상태 (정지, 밀려남) -> 외부 힘에 의한 반응.
     * - 'velocity_max': 초고속 이동
     */
    action_context: ('locomotion' | 'combat' | 'interaction' | 'aerodynamics' | 'passive' | 'velocity_max')[];
}

export interface Entity {
    id: string;
    role: 'main_hero' | 'sub_character' | 'background_extra' | 'prop';

    /** 시각적/의미적 분류 (VLM 이해용 보조 태그) */
    type: 'human' | 'creature' | 'object' | 'machine' | 'animal' | 'hybrid';

    demographics: string; // type별 구조 정의 다 되어 있음. 프롬프트 참고

    appearance: {
        /** * 재질감을 암시하는 텍스처 설명 (Deep Research - Dimension 2 반영)
         * 예: "Glossy chrome plating" (Rigid 암시), "Sweat-drenched pores" (Viscoelastic 암시)
         */
        clothing_or_material: string;
        hair?: string;
        accessories?: string[];
        body_features?: string;
        position_descriptor?: string;
    };

    // LLM 생각 정리용 내부 변수, 실사용 없음
    state?: {
        /** * 정지 이미지(t=0)에서의 초기 자세
         * 예: "Right fist fully extended", "Suspension compressed"
         */
        pose: string;
        expression?: string;
    };

    // [New] 물리 엔진 라우팅을 위한 핵심 프로필. 영상 생성 프롬프트 조립 시 Key로 사용됨.
    physics_profile?: PhysicsProfile;
}

export type InitialEntityManifestItem = Omit<Entity, 'physics_profile' | 'state'>;