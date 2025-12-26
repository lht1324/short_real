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
            very_low_intensity: { camera_tech: "Static Medium Shot", speed_term: "Stationary Tension", vocabulary: ["Weight centered", "Latent kinetic energy", "Static stance", "Poised footing"] },
            low_intensity: { camera_tech: "Steady Tracking Shot", speed_term: "Rhythmic Pace", vocabulary: ["Balanced stride", "Heel-to-toe roll", "Fluid rhythmic walking", "Natural arm swing"] },
            high_intensity: { camera_tech: "Dolly-In Tracking", speed_term: "Decisive Acceleration", vocabulary: ["Leaning into turn", "Forward momentum", "Aggressive stride", "Suspension compression"] },
            very_high_intensity: { camera_tech: "Low-Angle Tracking Shot", speed_term: "High-Velocity Motion Blur", vocabulary: ["Airborne phase", "Mid-stride extension", "Directional motion blur", "Ground-level slipstream"] }
        },

        // [Combat] 전투: 타격, 방어, 투척 등
        combat: {
            very_low_intensity: { camera_tech: "Static Close-up", speed_term: "Tense Stillness", vocabulary: ["Focused gaze", "Muscle coiled", "Measured breathing", "Pre-strike stasis"] },
            low_intensity: { camera_tech: "Slow Dolly-In", speed_term: "Controlled Maneuver", vocabulary: ["Technical positioning", "Guard raised", "Center of gravity shift", "Defensive pivoting"] },
            high_intensity: { camera_tech: "Reactionary Pan", speed_term: "Explosive Kinetic Force", vocabulary: ["Fist extended", "Shoulder torque", "Hip rotation", "Snapping impact motion"] },
            very_high_intensity: { camera_tech: "Handheld Shaky Cam, Whip Pan", speed_term: "Sudden Recoil & Impact", vocabulary: ["Impact tremor", "Recoiling from blow", "Face contorted", "Propagating shockwave"] }
        },

        // [Interaction] 상호작용: 잡기, 조작, 터치 등
        interaction: {
            very_low_intensity: { camera_tech: "Macro Shot", speed_term: "Delicate Stasis", vocabulary: ["Fingertips hovering", "Light tactile contact", "Palm pressed flat", "Static grip"] },
            low_intensity: { camera_tech: "Macro Shot, Deep Focus", speed_term: "Real-time Precision", vocabulary: ["Fingertips grazing", "Precise handling", "Articulated finger movement", "Soft manipulation"] },
            high_intensity: { camera_tech: "Tight Focus, Rack Focus", speed_term: "Decisive Grip", vocabulary: ["Firm traction", "Knuckles white", "Tense hold", "Intentional pull"] },
            very_high_intensity: { camera_tech: "Crash Zoom", speed_term: "Violent Interaction", vocabulary: ["Sudden snatch", "Crushing force", "White-knuckled tension", "Kinetic wrenching"] }
        },

        // [Aerodynamics] 공기역학: 비행, 낙하, 항력 등
        aerodynamics: {
            very_low_intensity: { camera_tech: "Gliding Drone Shot", speed_term: "Static Float", vocabulary: ["Hovering stasis", "Subtle air current flux", "Neutral buoyancy"] },
            low_intensity: { camera_tech: "Slow Arc Orbit", speed_term: "Smooth Descent/Glide", vocabulary: ["Streamlined posture", "Wind-resistance tuck", "Controlled banking", "Stable pitch"] },
            high_intensity: { camera_tech: "FPV Drone Shot", speed_term: "Rapid Velocity Change", vocabulary: ["Body arched", "G-force lean", "Arms swept back", "Aero-dynamic drag lines"] },
            very_high_intensity: { camera_tech: "FPV Drone, High Shutter Speed", speed_term: "Hyperlapse, Speed Lines", vocabulary: ["Free-falling orientation", "Terminal velocity", "Violent turbulence", "Extreme motion blur"] }
        },

        // [Passive] 수동적 상태: 충격 수용, 대기, 피격 등
        passive: {
            very_low_intensity: { camera_tech: "Static Frame", speed_term: "Absolute Rest", vocabulary: ["Relaxed limbs", "Grounded footing", "Inertial stasis"] },
            low_intensity: { camera_tech: "Slow Dolly-In", speed_term: "Idle Flux", vocabulary: ["Slouched posture", "Resting weight", "Subtle weight shift", "Passive swaying"] },
            high_intensity: { camera_tech: "Reactionary Pan", speed_term: "Kinetic Displacement", vocabulary: ["Sharp flinch", "Staggering back", "Torso jolt", "Center of mass disruption"] },
            very_high_intensity: { camera_tech: "Crash Zoom, Extreme Shaky Cam", speed_term: "Violent Recoil", vocabulary: ["Unexpected lurch", "Impact-driven flight", "Shockwave propagation", "Whiplash motion"] }
        },

        // [Velocity Max] 초고속: 가속의 정점
        velocity_max: {
            very_low_intensity: { camera_tech: "Parallel Tracking", speed_term: "Latent Velocity", vocabulary: ["Vibration at rest", "Humming power", "Aerodynamic readiness"] },
            low_intensity: { camera_tech: "Parallel Tracking", speed_term: "Consistent High Speed", vocabulary: ["Motion-blurred edges", "Background streaking", "Smooth translation"] },
            high_intensity: { camera_tech: "Bumper Cam, Ground Level", speed_term: "Warp Speed Effect", vocabulary: ["Speed lines", "Visual streaking", "Environmental blur", "Rapid optical flow"] },
            very_high_intensity: { camera_tech: "Bumper Cam, Shaky Cam", speed_term: "Hyperlapse, Extreme G-force", vocabulary: ["Silhouette distorted by speed", "Anamorphic light streaks", "Background liquefaction"] }
        }
    }
};