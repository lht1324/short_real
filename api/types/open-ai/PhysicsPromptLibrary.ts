export const PHYSICS_LIBRARY = {
    // [Layer 1] 재질 (Material) -> 에너지 강도별 단어장 분화
    material: {
        // [Rigid] 강체: 금속, 바위, 고밀도 폴리머 등
        rigid: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Micro-texture Integrity",
                vocabulary: ["Anisotropic highlights", "Micro-scratches", "Brushed grain", "Matte metallic finish", "Oxidized patina", "Specular occlusion"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Lustrous Reflection",
                vocabulary: ["Chrome glint", "Fresnel reflection", "Specular bloom", "Polished sheen", "Light-catching edges", "Metallic luster"]
            },
            high_intensity: {
                effect_tag: "Surface Wear", alt_tag: "Structural Stress",
                vocabulary: ["Surface shearing", "Pitted erosion", "Abrasive scuffs", "Structural dents", "Paint chipping", "Thermal discoloration"]
            },
            very_high_intensity: {
                effect_tag: "Sparks", alt_tag: "Kinetic Failure",
                vocabulary: ["Incandescent sparks", "Molten metal droplets", "Structural warping", "White-hot friction", "Jagged shearing", "Fragmentation"]
            }
        },

        // [Viscoelastic] 점탄성체: 피부, 근육, 고무, 유기 조직 등
        viscoelastic: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Epidermal Depth",
                vocabulary: ["Subsurface scattering", "Porous micro-detail", "Translucent depth", "Fine vellus hair", "Dermal texture", "Natural skin elasticity"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Surface Vitality",
                vocabulary: ["Oily sheen", "Hydrated pores", "Specular sweat film", "Subtle flush", "Epidermal gloss", "Lustrous skin-tightness"]
            },
            high_intensity: {
                effect_tag: "Skin Ripple", alt_tag: "Myological Tension",
                vocabulary: ["Muscle torque", "Skin rippling", "Subcutaneous vibration", "Bulging veins", "Tense muscle definition", "Flesh recoil"]
            },
            very_high_intensity: {
                effect_tag: "Sweat Spray", alt_tag: "Impact Trauma",
                vocabulary: ["Aerosolized sweat spray", "Violent tissue deformation", "Shockwave propagation", "Muscle convulsion", "Extreme skin stretching", "Bruise-tinted flush"]
            }
        },

        // [Brittle] 취성체: 유리, 얼음, 도자기, 수정 등
        brittle: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Crystalline Clarity",
                vocabulary: ["Internal refraction", "Prismatic glint", "Caustic focus", "Crystalline clarity", "Edge-lit transparency", "Vitreous luster"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Optical Flux",
                vocabulary: ["Micro-fracture glint", "Spectral dispersion", "Surface clarity", "Sharp specular pings", "Chromatic aberration in-glass"]
            },
            high_intensity: {
                effect_tag: "Cracks", alt_tag: "Fracture Initiation",
                vocabulary: ["Spider-webbing cracks", "Stress fracturing", "Chipped facets", "Internal splintering", "Jagged edge formation", "Structural fissures"]
            },
            very_high_intensity: {
                effect_tag: "Shards", alt_tag: "Kinetic Fragmentation",
                vocabulary: ["Explosive shards", "Kinetic glass fragments", "Crystalline dust burst", "Jagged projectile debris", "Fractal shattering", "Prismatic explosion"]
            }
        },

        // [Cloth] 직물: 옷감, 머리카락, 깃발 등
        cloth: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Textile Integrity",
                vocabulary: ["Finely-stitched weave", "Frayed fiber detail", "Matte fiber finish", "Static drape", "Coarse textile grain", "Interwoven texture"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Soft Aerodynamics",
                vocabulary: ["Satin sheen", "Velvet pile", "Gentle swaying", "Rhythmic hem-drift", "Soft silk-sheen", "Micro-flutter"]
            },
            high_intensity: {
                effect_tag: "Fabric Flutter", alt_tag: "Aerodynamic Drag",
                vocabulary: ["Billowing folds", "Snap-back tension", "Wind-drag resistance", "Heavy ripple", "Fabric snapping", "Dynamic creases"]
            },
            very_high_intensity: {
                effect_tag: "Violent Flapping", alt_tag: "Material Failure",
                vocabulary: ["Violent fabric whipping", "Aerodynamic turbulence", "Material shredding", "High-frequency vibration", "Tearing seams", "Kinetic drag-lines"]
            }
        },

        // [Fluid] 유체: 물, 피, 기름, 냉각수 등
        fluid: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Surface Tension",
                vocabulary: ["Glassy meniscus", "Deep volumetric clarity", "Static caustics", "Suspended particulates", "Liquid depth", "Molecular cohesion"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Rhythmic Flow",
                vocabulary: ["Concentric ripples", "Gentle surface flux", "Undulating current", "Micro-droplets", "Refractive distortions", "Soft liquid-glides"]
            },
            high_intensity: {
                effect_tag: "Mist", alt_tag: "Kinetic Turbulence",
                vocabulary: ["Turbulent swirl", "Aerosolized mist", "Droplet trails", "Foaming current", "Viscous flow", "Streaming liquid lines"]
            },
            very_high_intensity: {
                effect_tag: "Splash Burst", alt_tag: "Hydraulic Impact",
                vocabulary: ["Explosive splash burst", "Foam eruption", "High-contrast liquid crown", "Violent spray", "Turbulent vortex", "Kinetic splatter"]
            }
        },

        // [Elastoplastic] 점소성체: 진흙, 고무, 젤리, 끈적이는 물질 등
        elastoplastic: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Viscous Cohesion",
                vocabulary: ["Sticky glossy texture", "Surface memory", "Matte viscous finish", "Opaque density", "Cohesive surface tension"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Plastic Flux",
                vocabulary: ["Slow-motion indentation", "Viscous sheen", "Self-healing surface", "Ductile flow", "Soft deformation"]
            },
            high_intensity: {
                effect_tag: "Deformation", alt_tag: "Material Strain",
                vocabulary: ["Deep cratering", "Stretching tendrils", "Material elongation", "Permanent indentation", "Viscous drag"]
            },
            very_high_intensity: {
                effect_tag: "Splat", alt_tag: "Viscous Ejection",
                vocabulary: ["Explosive splat pattern", "Viscous fragmentation", "Adhesive splatter", "Heavy impact squish", "Material rupture"]
            }
        },

        // [Granular] 입립체: 모래, 먼지, 자갈, 화약 등
        granular: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Particulate Stillness",
                vocabulary: ["Settled dust motes", "Coarse mineral grain", "Rough surface shadow", "Granular stasis", "Crystalline grit"]
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Micro-drift",
                vocabulary: ["Surface skittering", "Micro-drift", "Eolian transport", "Low-density particulate flux", "Subtle dust shimmer"]
            },
            high_intensity: {
                effect_tag: "Dust Trail", alt_tag: "Aerosolized Density",
                vocabulary: ["Streaming particle trails", "Airborne density", "Eddying dust", "Gravel shifting", "Swirling grit"]
            },
            very_high_intensity: {
                effect_tag: "Dust Cloud", alt_tag: "Volumetric Eruption",
                vocabulary: ["Volumetric dust eruption", "Gravel spray", "Kinetic grit burst", "Debris cloud propagation", "High-velocity particle ejecta"]
            }
        }
    },

    // [Layer 2] 행동 맥락 (Action Context) -> 에너지 강도별 카메라 및 속도 분화
    action_context: {
        // [Locomotion] 이동: 걷기, 달리기, 주행 등
        locomotion: {
            // VERY_LOW: 정지 상태에서의 대치 시점 선택
            very_low_intensity: {
                speed_term: "Stationary Tension",
                vocabulary: ["Weight centered", "Latent kinetic energy", "Static stance", "Poised footing"]
            },
            // LOW: 리드미컬한 이동 시 추격 혹은 선도 선택
            low_intensity: {
                speed_term: "Rhythmic Pace",
                vocabulary: ["Balanced stride", "Heel-to-toe roll", "Fluid rhythmic walking", "Natural arm swing"]
            },
            // HIGH: 결정적 가속 시 피사체와의 상대 속도 방향 결정 (역행 방지 핵심)
            high_intensity: {
                speed_term: "Decisive Acceleration",
                vocabulary: ["Leaning into turn", "Forward momentum", "Aggressive stride", "Suspension compression"]
            },
            // VERY_HIGH: 초고속 상황에서 지면 밀착형 시점의 전후방 선택
            very_high_intensity: {
                speed_term: "High-Velocity Motion Blur",
                vocabulary: ["Airborne phase", "Mid-stride extension", "Directional motion blur", "Ground-level slipstream"]
            }
        },

        // [Combat] 전투: 타격, 방어, 투척 등
        combat: {
            // VERY_LOW: 대치 중인 주체 사이의 심리적 압박감 방향 선택
            very_low_intensity: {
                speed_term: "Tense Stillness",
                vocabulary: ["Focused gaze", "Muscle coiled", "Measured breathing", "Pre-strike stasis"]
            },
            // LOW: 전술적 거리를 좁히거나 벌리는 움직임 선택
            low_intensity: {
                speed_term: "Controlled Maneuver",
                vocabulary: ["Technical positioning", "Guard raised", "Center of gravity shift", "Defensive pivoting"]
            },
            // HIGH: 타격 방향에 따른 즉각적인 시선 회전 선택
            high_intensity: {
                speed_term: "Explosive Kinetic Force",
                vocabulary: ["Fist extended", "Shoulder torque", "Hip rotation", "Snapping impact motion"]
            },
            // VERY_HIGH: 타격의 에너지를 추격할지, 피격의 반동을 묘사할지 선택 (물리적 인과관계 확정)
            very_high_intensity: {
                speed_term: "Sudden Recoil & Impact",
                vocabulary: ["Impact tremor", "Recoiling from blow", "Face contorted", "Propagating shockwave"]
            }
        },

        // [Interaction] 상호작용: 잡기, 조작, 터치 등
        interaction: {
            // VERY_LOW: 접촉 직전, 물체와의 위치 관계를 정의하는 시점 선택
            very_low_intensity: {
                speed_term: "Delicate Stasis",
                vocabulary: ["Fingertips hovering", "Light tactile contact", "Palm pressed flat", "Static grip"]
            },
            // LOW: 정밀 조작 시 움직임에 동기화할지, 고정해서 관찰할지 선택
            low_intensity: {
                speed_term: "Real-time Precision",
                vocabulary: ["Fingertips grazing", "Precise handling", "Articulated finger movement", "Soft manipulation"]
            },
            // HIGH: 잡기/당기기 등의 결정적 동작 시 시선 집중도와 초점 이동 방향 선택
            high_intensity: {
                speed_term: "Decisive Grip",
                vocabulary: ["Firm traction", "Knuckles white", "Tense hold", "Intentional pull"]
            },
            // VERY_HIGH: 급격한 탈취나 파괴적 상호작용 시 줌의 방향 선택 (시각적 충격량 제어)
            very_high_intensity: {
                speed_term: "Violent Interaction",
                vocabulary: ["Sudden snatch", "Crushing force", "White-knuckled tension", "Kinetic wrenching"]
            }
        },

        // [Aerodynamics] 공기역학: 비행, 낙하, 항력 등
        aerodynamics: {
            // VERY_LOW: 공중 부양 시 정적인 고정과 미세한 대기 흐름의 반영 선택
            very_low_intensity: {
                speed_term: "Static Float",
                vocabulary: ["Hovering stasis", "Subtle air current flux", "Neutral buoyancy"]
            },
            // LOW: 하강 혹은 활공 시 피사체를 중심으로 한 회전 방향 선택
            low_intensity: {
                speed_term: "Smooth Descent/Glide",
                vocabulary: ["Streamlined posture", "Wind-resistance tuck", "Controlled banking", "Stable pitch"]
            },
            // HIGH: 고속 비행 시 전진감을 극대화하기 위한 위치 관계 선택 (역행 방지 핵심)
            high_intensity: {
                speed_term: "Rapid Velocity Change",
                vocabulary: ["Body arched", "G-force lean", "Arms swept back", "Aero-dynamic drag lines"]
            },
            // VERY_HIGH: 초고속 낙하/비행 시 피사체를 앞지를 것인지, 바짝 붙을 것인지 선택
            very_high_intensity: {
                speed_term: "Hyperlapse, Speed Lines",
                vocabulary: ["Free-falling orientation", "Terminal velocity", "Violent turbulence", "Extreme motion blur"]
            }
        },

        // [Passive] 수동적 상태: 충격 수용, 대기, 피격 등
        passive: {
            // VERY_LOW: 힘이 닥치기 전, 피사체의 인내와 주변 상황의 대조 선택
            very_low_intensity: {
                speed_term: "Absolute Rest",
                vocabulary: ["Relaxed limbs", "Grounded footing", "Inertial stasis"]
            },
            // LOW: 미세한 힘의 작용 시 피사체에 집중할지, 충격의 전파를 보여줄지 선택
            low_intensity: {
                speed_term: "Idle Flux",
                vocabulary: ["Slouched posture", "Resting weight", "Subtle weight shift", "Passive swaying"]
            },
            // HIGH: 물리적 변위 발생 시 충격 방향에 따른 실시간 대응 선택
            high_intensity: {
                speed_term: "Kinetic Displacement",
                vocabulary: ["Sharp flinch", "Staggering back", "Torso jolt", "Center of mass disruption"]
            },
            // VERY_HIGH: 폭발적 충격 시 에너지의 작용축(수직/수평)과 급격한 시야 변화 선택
            very_high_intensity: {
                speed_term: "Violent Recoil",
                vocabulary: ["Unexpected lurch", "Impact-driven flight", "Shockwave propagation", "Whiplash motion"]
            }
        },

        // [Velocity Max] 초고속: 가속의 정점
        velocity_max: {
            // VERY_LOW: 가속 직전의 잠재적 에너지와 정면의 압박감 대칭
            very_low_intensity: {
                speed_term: "Latent Velocity",
                vocabulary: ["Vibration at rest", "Humming power", "Aerodynamic readiness"]
            },
            // LOW: 일정한 고속 주행 시 배경이 흐르는 파라락스 방향 선택
            low_intensity: {
                speed_term: "Consistent High Speed",
                vocabulary: ["Motion-blurred edges", "Background streaking", "Smooth translation"]
            },
            // HIGH: 지면/근접 시점에서 속도의 '입구'와 '출구' 시점 선택
            high_intensity: {
                speed_term: "Warp Speed Effect",
                vocabulary: ["Speed lines", "Visual streaking", "Environmental blur", "Rapid optical flow"]
            },
            // VERY_HIGH: 피사체를 프레임에 고정할지, 가속도로 추월할지 선택 (역행 현상 제어의 핵심)
            very_high_intensity: {
                speed_term: "Hyperlapse, Extreme G-force",
                vocabulary: ["Silhouette distorted by speed", "Anamorphic light streaks", "Background liquefaction"]
            }
        }
    }
};