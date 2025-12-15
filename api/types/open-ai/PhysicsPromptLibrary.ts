export const PHYSICS_LIBRARY = {
    // [Layer 1] 재질 (Material) -> Effect Tag (단일 명사형 이펙트 + 물리적 반응)
    material: {
        rigid: { // 금속, 차체
            effect_tag: "Sparks",
            alt_tag: "Debris",
            visual_injection: {
                detailed: "Brushed metal grain, Micro-scratches, Welding seams, Rust patina",
                dynamic: "Streamlined reflection lines, Heat haze distortion, Motion-blurred specularity"
            }
        },
        viscoelastic: { // 피부, 근육
            effect_tag: "Sweat Spray",
            alt_tag: "Skin Ripple",
            visual_injection: {
                detailed: "Damp skin texture, Visible pores, Subsurface scattering, Fine wrinkles",
                dynamic: "Glistening sweat sheen, Tensed muscle definition, Face contorted in exertion"
            }
        },
        brittle: { // 유리
            effect_tag: "Shards",
            alt_tag: "Glass Explosion",
            visual_injection: {
                detailed: "Sharp faceted edges, Internal light refraction, Dust on surface",
                dynamic: "Fragmenting geometry, Directional shattering, Motion-warped reflection"
            }
        },
        cloth: { // 옷, 망토
            effect_tag: "Fabric Flutter",
            alt_tag: "Wind Drag",
            visual_injection: {
                detailed: "Visible thread weave, Crisp stitching, Heavy drape folds, Fabric nap",
                dynamic: "Wind-sheared silhouette, Taut fabric ripples, Clothing pressed against body"
            }
        },
        fluid: { // 물
            effect_tag: "Mist",
            alt_tag: "Splash Burst",
            visual_injection: {
                detailed: "Surface tension curvature, Clear optical refraction, Stationary droplets",
                dynamic: "Directional spray, Turbulent foam trails, Elongated liquid streaks"
            }
        },
        elastoplastic: { // 진흙, 껌
            effect_tag: "Surface Deformation",
            alt_tag: "Heavy Splat",
            visual_injection: {
                detailed: "Deep surface indentation, Sticky glossy texture, Fingerprint marks",
                dynamic: "Impact splash pattern, Stretching material shapes, Dynamic surface deformation"
            }
        },
        granular: { // 모래, 먼지
            effect_tag: "Dust Cloud",
            alt_tag: "Gravel Spray",
            visual_injection: {
                detailed: "Individual coarse grains, Piled texture, Rough surface shadow",
                dynamic: "Volumetric dust cloud, Streaming particle trails, Airborne density"
            }
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
