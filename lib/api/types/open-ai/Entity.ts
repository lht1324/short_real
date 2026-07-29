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
        clothing: {
            head?: string,
            upper_body?: string,
            lower_body?: string,
            hands?: string,
            feet?: string
        };
        material: string;
        hair?: string | null;
        accessories?: string[];
        body_features?: string;
        position_descriptor?: {
            horizontal: "left" | "center" | "right",
            depth: "foreground" | "midground" | "background",
            vertical?: "top" | "middle" | "bottom"  // 필요한 경우만
        };
    };

    // LLM 생각 정리용 내부 변수, 실사용 없음
    state?: {
        /** * 정지 이미지(t=0)에서의 초기 자세
         * 예: "Right fist fully extended", "Suspension compressed"
         */
        pose: string;
        expression?: string;
    };

    reference_image_prompt?: string;
}

export type InitialEntityManifestItem = Omit<Entity, 'state'>;