export interface MasterStyleInfo {
    // 1. 광학 및 카메라 표준 (Image Prompt의 camera 객체 생성 근거)
    optics: {
        lensType: "Anamorphic" | "Spherical" | "Macro" | "Wide-Angle";
        focusDepth: "Shallow" | "Deep" | "Selective";
        exposureVibe: "High-Key" | "Low-Key" | "Natural";
        defaultISO: number; // 장면 조명에 따른 기준값
    };

    // 2. 색채 표준 (Image Prompt의 color_palette 생성 근거)
    colorAndLight: {
        tonality: string; // 예: "Warm earth tones"
        lightingSetup: string; // 예: "Chiaroscuro"
        globalHexPalette: {
            materialAnchor: string;      // Fixed: Primary subject base color
            keyLightSpectrumMin: string; // Range Start: Primary light
            keyLightSpectrumMax: string; // Range End: Primary light
            fillLightSpectrumMin: string;// Range Start: Secondary light
            fillLightSpectrumMax: string;// Range End: Secondary light
            shadowAnchor: string;        // Fixed: Environment black level
            ambientSpectrumMin: string;  // Range Start: Atmospheric/Haze
            ambientSpectrumMax: string;  // Range End: Atmospheric/Haze
        };
    };

    // 3. 재질 및 품질 표준 (Image Prompt의 description/effects 생성 근거)
    fidelity: {
        textureDetail: "Ultra-High" | "Raw" | "Stylized";
        grainLevel: "Clean" | "Filmic" | "Gritty";
        resolutionTarget: "8K" | "4K" | "Filmic Scan";
    };

    // 4. 시대 및 환경 표준 (Era Synchronization의 절대 기준)
    globalEnvironment: {
        era: string; // 예: "1944 WWII"
        locationArchetype: string; // 예: "European Urban Ruin"
    };

    // 5. 구도 표준 (image_gen_prompt.composition 생성 근거)
    composition: {
        framingStyle: "Extreme Long/Wide" | "Long/Wide" | "Full/Medium Wide" | "Medium/Waist" | "Bust/Chest" | "Face/Detail";
        preferredAspectRatio: string;
    };
}