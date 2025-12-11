export const PHYSICS_LIBRARY = {
    // [Layer 1] 재질 (Material) -> Effect Tag (단일 명사형 이펙트 + 물리적 반응)
    material: {
        rigid: { // 금속, 차체
            effect_tag: "Sparks",
            alt_tag: "Debris",
            visual_injection: "High specularity, Micro-abrasion scratches, Heat shimmer from friction"
        },
        viscoelastic: { // 피부, 근육
            effect_tag: "Sweat Spray",
            alt_tag: "Skin Ripple",
            visual_injection: "Subsurface scattering, Micro-scale sweat beads, G-force induced skin ripples"
        },
        brittle: { // 유리
            effect_tag: "Shards",
            alt_tag: "Glass Explosion",
            visual_injection: "Sharp jagged edges, High refraction, Fine dust powder"
        },
        cloth: { // 옷, 망토
            effect_tag: "Fabric Flutter",
            alt_tag: "Wind Drag",
            visual_injection: "Visible fabric weave, Taut/Stretched fabric due to high wind, Rapid flutter"
        },
        fluid: { // 물
            effect_tag: "Mist",
            alt_tag: "Splash Burst",
            visual_injection: "Light refraction, Turbulence, Directional droplets"
        },
        elastoplastic: { // 진흙, 껌
            effect_tag: "Surface Deformation",
            alt_tag: "Heavy Splat",
            visual_injection: "Deep indentation, Sticky texture, Slow recoil"
        },
        granular: { // 모래, 먼지
            effect_tag: "Dust Cloud",
            alt_tag: "Gravel Spray",
            visual_injection: "Particulate haze, Volumetric density, uneven grainy surface"
        }
    },

    // [Layer 2] 행동 맥락 (Action Context) -> Composition & Speed (구도 및 속도)
    action_context: {
        locomotion: { // 이동
            camera_tech: "Low Angle Tracking Shot",
            speed_term: "Fast Motion, Directional Motion Blur"
        },
        combat: { // 전투
            camera_tech: "Handheld Shaky Cam, Whip Pan",
            speed_term: "High Shutter Speed, Sudden Motion Blur"
        },
        interaction: { // 조작 (손)
            camera_tech: "Macro Shot, Tight Focus",
            speed_term: "Real-time, Shallow Depth of Field"
        },
        aerodynamics: { // 비행 (윙슈트)
            camera_tech: "FPV Drone Shot, Wide Angle",
            speed_term: "Hyperlapse, Extreme Motion Blur, Speed Lines"
        },
        passive: { // 피격/반동
            camera_tech: "Crash Zoom, Reactionary Pan",
            speed_term: "Sudden Recoil, Camera Shake"
        },
        velocity_max: { // [NEW] 극초고속 (레이싱, 추격)
            camera_tech: "Bumper Cam, Ground Level",
            speed_term: "Hyperlapse, Warp Speed Effect, Background Streaming Blur"
        }
    }
};
