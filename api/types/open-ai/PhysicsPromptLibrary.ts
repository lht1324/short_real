export const PHYSICS_LIBRARY = {
    // [Layer 1] 재질 (Material) -> 에너지 강도별 단어장 분화
    material: {
        // [Rigid] 강체: 금속, 바위, 고밀도 폴리머 등
        rigid: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Micro-texture Integrity",
                vocabulary: {
                    verbs: ["gleam", "reflect", "hold", "remain"],
                    adjectives: ["anisotropic", "brushed", "matte", "oxidized", "solid"],
                    nouns: ["micro-scratches", "brushed grain", "matte metallic finish", "oxidized patina", "specular occlusion"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Lustrous Reflection",
                vocabulary: {
                    verbs: ["glint", "shimmer", "shine", "catch light"],
                    adjectives: ["lustrous", "polished", "reflective", "metallic"],
                    nouns: ["chrome glint", "fresnel reflection", "specular bloom", "polished sheen", "light-catching edges"]
                }
            },
            high_intensity: {
                effect_tag: "Surface Wear", alt_tag: "Structural Stress",
                vocabulary: {
                    verbs: ["grind", "scrape", "shear", "dent"],
                    adjectives: ["pitted", "abrasive", "chipped", "discolored"],
                    nouns: ["surface shearing", "pitted erosion", "abrasive scuffs", "structural dents", "paint chipping"]
                }
            },
            very_high_intensity: {
                effect_tag: "Sparks", alt_tag: "Kinetic Failure",
                vocabulary: {
                    verbs: ["spark", "warp", "shear", "fragment", "shatter"],
                    adjectives: ["incandescent", "molten", "jagged", "white-hot"],
                    nouns: ["incandescent sparks", "molten metal droplets", "structural warping", "white-hot friction", "jagged shearing"]
                }
            }
        },
        // [Viscoelastic] 점탄성체: 피부, 근육, 고무, 유기 조직 등
        viscoelastic: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Epidermal Depth",
                vocabulary: {
                    verbs: ["breathe", "rest", "absorb", "soften"],
                    adjectives: ["porous", "translucent", "fine", "dermal", "elastic"],
                    nouns: ["subsurface scattering", "porous micro-detail", "translucent depth", "fine vellus hair", "natural skin elasticity"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Surface Vitality",
                vocabulary: {
                    verbs: ["glisten", "hydrate", "flush", "glow"],
                    adjectives: ["oily", "hydrated", "specular", "lustrous", "tight"],
                    nouns: ["oily sheen", "hydrated pores", "specular sweat film", "subtle flush", "epidermal gloss"]
                }
            },
            high_intensity: {
                effect_tag: "Skin Ripple", alt_tag: "Myological Tension",
                vocabulary: {
                    verbs: ["ripple", "bulge", "tense", "recoil", "flex"],
                    adjectives: ["rippling", "bulging", "tense", "defined", "strained"],
                    nouns: ["muscle torque", "skin rippling", "subcutaneous vibration", "bulging veins", "tense muscle definition"]
                }
            },
            very_high_intensity: {
                effect_tag: "Sweat Spray", alt_tag: "Impact Trauma",
                vocabulary: {
                    verbs: ["spray", "deform", "propagate", "convulse", "stretch"],
                    adjectives: ["aerosolized", "violent", "distorted", "bruised"],
                    nouns: ["aerosolized sweat spray", "violent tissue deformation", "shockwave propagation", "muscle convulsion", "extreme skin stretching"]
                }
            }
        },
        // [Brittle] 취성체: 유리, 얼음, 도자기, 수정 등
        brittle: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Crystalline Clarity",
                vocabulary: {
                    verbs: ["refract", "focus", "transmit", "clarify"],
                    adjectives: ["crystalline", "prismatic", "caustic", "edge-lit", "vitreous"],
                    nouns: ["internal refraction", "prismatic glint", "caustic focus", "crystalline clarity", "edge-lit transparency"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Optical Flux",
                vocabulary: {
                    verbs: ["disperse", "ping", "glint", "distort"],
                    adjectives: ["micro-fractured", "spectral", "sharp", "chromatic"],
                    nouns: ["micro-fracture glint", "spectral dispersion", "surface clarity", "sharp specular pings", "chromatic aberration"]
                }
            },
            high_intensity: {
                effect_tag: "Cracks", alt_tag: "Fracture Initiation",
                vocabulary: {
                    verbs: ["crack", "splinter", "chip", "fissure"],
                    adjectives: ["spider-webbed", "jagged", "chipped", "fractured"],
                    nouns: ["spider-webbing cracks", "stress fracturing", "chipped facets", "internal splintering", "structural fissures"]
                }
            },
            very_high_intensity: {
                effect_tag: "Shards", alt_tag: "Kinetic Fragmentation",
                vocabulary: {
                    verbs: ["shatter", "burst", "explode", "fragment"],
                    adjectives: ["explosive", "kinetic", "jagged", "fractal"],
                    nouns: ["explosive shards", "kinetic glass fragments", "crystalline dust burst", "jagged projectile debris", "fractal shattering"]
                }
            }
        },
        // [Cloth] 직물: 옷감, 머리카락, 깃발 등
        cloth: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Textile Integrity",
                vocabulary: {
                    verbs: ["drape", "hang", "settle", "weave"],
                    adjectives: ["finely-stitched", "frayed", "matte", "static", "coarse"],
                    nouns: ["finely-stitched weave", "frayed fiber detail", "matte fiber finish", "static drape", "coarse textile grain"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Soft Aerodynamics",
                vocabulary: {
                    verbs: ["sway", "drift", "flutter", "sheen"],
                    adjectives: ["satin", "velvet", "gentle", "rhythmic", "soft"],
                    nouns: ["satin sheen", "velvet pile", "gentle swaying", "rhythmic hem-drift", "micro-flutter"]
                }
            },
            high_intensity: {
                effect_tag: "Fabric Flutter", alt_tag: "Aerodynamic Drag",
                vocabulary: {
                    verbs: ["billow", "snap", "drag", "crease", "whip"],
                    adjectives: ["billowing", "snapping", "dynamic", "heavy"],
                    nouns: ["billowing folds", "snap-back tension", "wind-drag resistance", "heavy ripple", "dynamic creases"]
                }
            },
            very_high_intensity: {
                effect_tag: "Violent Flapping", alt_tag: "Material Failure",
                vocabulary: {
                    verbs: ["flap", "shred", "tear", "vibrate"],
                    adjectives: ["violent", "turbulent", "high-frequency", "torn"],
                    nouns: ["violent fabric whipping", "aerodynamic turbulence", "material shredding", "high-frequency vibration", "tearing seams"]
                }
            }
        },
        // [Fluid] 유체: 물, 피, 기름, 냉각수 등
        fluid: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Surface Tension",
                vocabulary: {
                    verbs: ["suspend", "pool", "stagnate", "cohere"],
                    adjectives: ["glassy", "deep", "static", "liquid"],
                    nouns: ["glassy meniscus", "deep volumetric clarity", "static caustics", "suspended particulates", "molecular cohesion"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Rhythmic Flow",
                vocabulary: {
                    verbs: ["ripple", "undulate", "flow", "distort", "glide"],
                    adjectives: ["concentric", "gentle", "undulating", "soft"],
                    nouns: ["concentric ripples", "gentle surface flux", "undulating current", "micro-droplets", "refractive distortions"]
                }
            },
            high_intensity: {
                effect_tag: "Mist", alt_tag: "Kinetic Turbulence",
                vocabulary: {
                    verbs: ["churn", "swirl", "stream", "foam", "mist"],
                    adjectives: ["turbulent", "aerosolized", "foaming", "viscous"],
                    nouns: ["turbulent swirl", "aerosolized mist", "droplet trails", "foaming current", "streaming liquid lines"]
                }
            },
            very_high_intensity: {
                effect_tag: "Splash Burst", alt_tag: "Hydraulic Impact",
                vocabulary: {
                    verbs: ["erupt", "burst", "splash", "splatter", "spray"],
                    adjectives: ["explosive", "violent", "high-contrast", "kinetic"],
                    nouns: ["explosive splash burst", "foam eruption", "high-contrast liquid crown", "violent spray", "kinetic splatter"]
                }
            }
        },
        // [Elastoplastic] 점소성체: 진흙, 고무, 젤리, 끈적이는 물질 등
        elastoplastic: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Viscous Cohesion",
                vocabulary: {
                    verbs: ["stick", "adhere", "settle", "cohere"],
                    adjectives: ["sticky", "glossy", "matte", "opaque", "cohesive"],
                    nouns: ["sticky glossy texture", "surface memory", "matte viscous finish", "opaque density", "cohesive surface tension"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Plastic Flux",
                vocabulary: {
                    verbs: ["indent", "flow", "heal", "deform"],
                    adjectives: ["slow-motion", "viscous", "self-healing", "ductile"],
                    nouns: ["slow-motion indentation", "viscous sheen", "self-healing surface", "ductile flow", "soft deformation"]
                }
            },
            high_intensity: {
                effect_tag: "Deformation", alt_tag: "Material Strain",
                vocabulary: {
                    verbs: ["crater", "stretch", "elongate", "drag"],
                    adjectives: ["deep", "stretching", "permanent", "viscous"],
                    nouns: ["deep cratering", "stretching tendrils", "material elongation", "permanent indentation", "viscous drag"]
                }
            },
            very_high_intensity: {
                effect_tag: "Splat", alt_tag: "Viscous Ejection",
                vocabulary: {
                    verbs: ["splat", "fragment", "splatter", "rupture"],
                    adjectives: ["explosive", "adhesive", "heavy", "ruptured"],
                    nouns: ["explosive splat pattern", "viscous fragmentation", "adhesive splatter", "heavy impact squish", "material rupture"]
                }
            }
        },
        // [Granular] 입립체: 모래, 먼지, 자갈, 화약 등
        granular: {
            very_low_intensity: {
                effect_tag: "None", alt_tag: "Particulate Stillness",
                vocabulary: {
                    verbs: ["settle", "rest", "accumulate", "dust"],
                    adjectives: ["settled", "coarse", "rough", "granular"],
                    nouns: ["settled dust motes", "coarse mineral grain", "rough surface shadow", "granular stasis", "crystalline grit"]
                }
            },
            low_intensity: {
                effect_tag: "None", alt_tag: "Micro-drift",
                vocabulary: {
                    verbs: ["skitter", "drift", "transport", "shimmer"],
                    adjectives: ["surface", "eolian", "low-density", "subtle"],
                    nouns: ["surface skittering", "micro-drift", "eolian transport", "low-density particulate flux", "subtle dust shimmer"]
                }
            },
            high_intensity: {
                effect_tag: "Dust Trail", alt_tag: "Aerosolized Density",
                vocabulary: {
                    verbs: ["stream", "eddy", "shift", "swirl"],
                    adjectives: ["streaming", "airborne", "eddying", "shifting"],
                    nouns: ["streaming particle trails", "airborne density", "eddying dust", "gravel shifting", "swirling grit"]
                }
            },
            very_high_intensity: {
                effect_tag: "Dust Cloud", alt_tag: "Volumetric Eruption",
                vocabulary: {
                    verbs: ["erupt", "spray", "burst", "propagate", "eject"],
                    adjectives: ["volumetric", "kinetic", "high-velocity"],
                    nouns: ["volumetric dust eruption", "gravel spray", "kinetic grit burst", "debris cloud propagation", "high-velocity particle ejecta"]
                }
            }
        }
    },

    // [Layer 2] 행동 맥락 (Action Context) -> 에너지 강도별 카메라 및 속도 분화
    action_context: {
        // [Locomotion] 이동: 걷기, 달리기, 주행 등
        locomotion: {
            very_low_intensity: {
                speed_term: "Stationary Tension",
                vocabulary: {
                    verbs: ["stand", "wait", "poise", "ground"],
                    adjectives: ["weighted", "latent", "static", "poised"],
                    nouns: ["weight centered", "latent kinetic energy", "static stance", "poised footing"]
                }
            },
            low_intensity: {
                speed_term: "Rhythmic Pace",
                vocabulary: {
                    verbs: ["stride", "pace", "walk", "swing"],
                    adjectives: ["balanced", "rhythmic", "fluid", "natural"],
                    nouns: ["balanced stride", "heel-to-toe roll", "fluid rhythmic walking", "natural arm swing"]
                }
            },
            high_intensity: {
                speed_term: "Decisive Acceleration",
                vocabulary: {
                    verbs: ["lean", "stride", "compress", "push"],
                    adjectives: ["aggressive", "forward", "driving"],
                    nouns: ["leaning into turn", "forward momentum", "aggressive stride", "suspension compression"]
                }
            },
            very_high_intensity: {
                speed_term: "High-Velocity Motion Blur",
                vocabulary: {
                    verbs: ["soar", "extend", "blur", "slipstream"],
                    adjectives: ["airborne", "mid-stride", "directional", "ground-level"],
                    nouns: ["airborne phase", "mid-stride extension", "directional motion blur", "ground-level slipstream"]
                }
            }
        },
        // [Combat] 전투: 타격, 방어, 투척 등
        combat: {
            very_low_intensity: {
                speed_term: "Tense Stillness",
                vocabulary: {
                    verbs: ["focus", "coil", "breathe", "stare"],
                    adjectives: ["focused", "coiled", "measured", "pre-strike"],
                    nouns: ["focused gaze", "muscle coiled", "measured breathing", "pre-strike stasis"]
                }
            },
            low_intensity: {
                speed_term: "Controlled Maneuver",
                vocabulary: {
                    verbs: ["position", "raise", "shift", "pivot"],
                    adjectives: ["technical", "guarded", "centered", "defensive"],
                    nouns: ["technical positioning", "guard raised", "center of gravity shift", "defensive pivoting"]
                }
            },
            high_intensity: {
                speed_term: "Explosive Kinetic Force",
                vocabulary: {
                    verbs: ["extend", "torque", "rotate", "snap"],
                    adjectives: ["explosive", "snapping", "extended", "rotating"],
                    nouns: ["fist extended", "shoulder torque", "hip rotation", "snapping impact motion"]
                }
            },
            very_high_intensity: {
                speed_term: "Sudden Recoil & Impact",
                vocabulary: {
                    verbs: ["tremble", "recoil", "contort", "propagate"],
                    adjectives: ["impacted", "recoiling", "contorted", "shockwave-driven"],
                    nouns: ["impact tremor", "recoiling from blow", "face contorted", "propagating shockwave"]
                }
            }
        },
        // [Interaction] 상호작용: 잡기, 조작, 터치 등
        interaction: {
            very_low_intensity: {
                speed_term: "Delicate Stasis",
                vocabulary: {
                    verbs: ["hover", "touch", "press", "grip"],
                    adjectives: ["light", "tactile", "static", "flat"],
                    nouns: ["fingertips hovering", "light tactile contact", "palm pressed flat", "static grip"]
                }
            },
            low_intensity: {
                speed_term: "Real-time Precision",
                vocabulary: {
                    verbs: ["graze", "handle", "articulate", "manipulate"],
                    adjectives: ["precise", "articulated", "soft", "grazing"],
                    nouns: ["fingertips grazing", "precise handling", "articulated finger movement", "soft manipulation"]
                }
            },
            high_intensity: {
                speed_term: "Decisive Grip",
                vocabulary: {
                    verbs: ["pull", "grip", "hold", "tense"],
                    adjectives: ["firm", "white-knuckled", "tense", "intentional"],
                    nouns: ["firm traction", "knuckles white", "tense hold", "intentional pull"]
                }
            },
            very_high_intensity: {
                speed_term: "Violent Interaction",
                vocabulary: {
                    verbs: ["snatch", "crush", "wrench", "rip"],
                    adjectives: ["sudden", "crushing", "violent", "kinetic"],
                    nouns: ["sudden snatch", "crushing force", "white-knuckled tension", "kinetic wrenching"]
                }
            }
        },
        // [Aerodynamics] 공기역학: 비행, 낙하, 항력 등
        aerodynamics: {
            very_low_intensity: {
                speed_term: "Static Float",
                vocabulary: {
                    verbs: ["hover", "float", "drift", "suspend"],
                    adjectives: ["static", "subtle", "neutral", "buoyant"],
                    nouns: ["hovering stasis", "subtle air current flux", "neutral buoyancy"]
                }
            },
            low_intensity: {
                speed_term: "Smooth Descent/Glide",
                vocabulary: {
                    verbs: ["glide", "tuck", "bank", "pitch"],
                    adjectives: ["streamlined", "controlled", "stable", "smooth"],
                    nouns: ["streamlined posture", "wind-resistance tuck", "controlled banking", "stable pitch"]
                }
            },
            high_intensity: {
                speed_term: "Rapid Velocity Change",
                vocabulary: {
                    verbs: ["arch", "lean", "sweep", "drag"],
                    adjectives: ["arched", "g-force-induced", "swept-back", "aerodynamic"],
                    nouns: ["body arched", "g-force lean", "arms swept back", "aero-dynamic drag lines"]
                }
            },
            very_high_intensity: {
                speed_term: "Hyperlapse, Speed Lines",
                vocabulary: {
                    verbs: ["fall", "plummet", "jettison", "blur"],
                    adjectives: ["free-falling", "terminal", "violent", "extreme"],
                    nouns: ["free-falling orientation", "terminal velocity", "violent turbulence", "extreme motion blur"]
                }
            }
        },
        // [Passive] 수동적 상태: 충격 수용, 대기, 피격 등
        passive: {
            very_low_intensity: {
                speed_term: "Absolute Rest",
                vocabulary: {
                    verbs: ["rest", "ground", "relax", "settle"],
                    adjectives: ["relaxed", "grounded", "inertial", "motionless"],
                    nouns: ["relaxed limbs", "grounded footing", "inertial stasis"]
                }
            },
            low_intensity: {
                speed_term: "Idle Flux",
                vocabulary: {
                    verbs: ["slouch", "rest", "shift", "sway"],
                    adjectives: ["slouched", "resting", "subtle", "passive"],
                    nouns: ["slouched posture", "resting weight", "subtle weight shift", "passive swaying"]
                }
            },
            high_intensity: {
                speed_term: "Kinetic Displacement",
                vocabulary: {
                    verbs: ["flinch", "stagger", "jolt", "disrupt"],
                    adjectives: ["sharp", "staggering", "disrupted"],
                    nouns: ["sharp flinch", "staggering back", "torso jolt", "center of mass disruption"]
                }
            },
            very_high_intensity: {
                speed_term: "Violent Recoil",
                vocabulary: {
                    verbs: ["lurch", "fly", "propagate", "whip"],
                    adjectives: ["unexpected", "impact-driven", "shockwave-induced", "whiplash"],
                    nouns: ["unexpected lurch", "impact-driven flight", "shockwave propagation", "whiplash motion"]
                }
            }
        },
        // [Velocity Max] 초고속: 가속의 정점
        velocity_max: {
            very_low_intensity: {
                speed_term: "Latent Velocity",
                vocabulary: {
                    verbs: ["vibrate", "hum", "ready", "charge"],
                    adjectives: ["vibrating", "humming", "ready", "latent"],
                    nouns: ["vibration at rest", "humming power", "aerodynamic readiness"]
                }
            },
            low_intensity: {
                speed_term: "Consistent High Speed",
                vocabulary: {
                    verbs: ["blur", "streak", "translate", "flow"],
                    adjectives: ["motion-blurred", "streaking", "smooth", "consistent"],
                    nouns: ["motion-blurred edges", "background streaking", "smooth translation"]
                }
            },
            high_intensity: {
                speed_term: "Warp Speed Effect",
                vocabulary: {
                    verbs: ["streak", "blur", "warp", "rush"],
                    adjectives: ["visual", "environmental", "rapid", "optical"],
                    nouns: ["speed lines", "visual streaking", "environmental blur", "rapid optical flow"]
                }
            },
            very_high_intensity: {
                speed_term: "Hyperlapse, Extreme G-force",
                vocabulary: {
                    verbs: ["distort", "streak", "liquefy", "warp"],
                    adjectives: ["anamorphic", "distorted", "liquefied", "extreme"],
                    nouns: ["silhouette distorted by speed", "anamorphic light streaks", "background liquefaction"]
                }
            }
        }
    }
};
