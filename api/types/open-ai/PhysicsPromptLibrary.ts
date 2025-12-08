export const PHYSICS_LIBRARY = {
    // Layer 1: 형태 (Morphology) - 변동 없음
    morphology: {
        articulated: {
            motion_rules: "Movement driven by joint rotation and core torque. Limbs maintain fixed length.",
            visual_cues: "Plant feet firmly to generate force. Arms pump for balance.",
            negative_prompt: "no rubbery limbs, no bending bones, no gliding feet"
        },
        wheeled: {
            motion_rules: "Non-holonomic movement. Motion vector MUST align with wheel rotation.",
            visual_cues: "Chassis leans opposite to the turn (body roll). Tires deform under load.",
            negative_prompt: "no sliding sideways, no crabbing, no strafing"
        },
        tracked: {
            motion_rules: "High friction traction. Zero-radius turning capability.",
            visual_cues: "Treads grip the ground individually. Heavy vibration.",
            negative_prompt: "no smooth sliding, no floating treads"
        },
        aerial_wing: {
            motion_rules: "Aerodynamic lift and banking turns.",
            visual_cues: "Wings flex under air pressure. Banking into curves.",
            negative_prompt: "no hovering without propulsion, no static wings"
        },
        aquatic: {
            motion_rules: "Hydrodynamic propulsion via undulation.",
            visual_cues: "Fins ripple with current. Body creates wake turbulence.",
            negative_prompt: "no rigid movement, no gravity-based falling"
        },
        amorphous: {
            motion_rules: "Volume preservation with free-form deformation.",
            visual_cues: "Shape flows and adapts to containers. Center of mass shifts fluidly.",
            negative_prompt: "no fixed joints, no rigid structure"
        }
    },

    // Layer 2: 재질 (Material) - [업데이트] 소성체(Mud)와 입자(Sand) 추가
    material: {
        rigid: { // 강체 (금속, 뼈)
            impact_low: "clank, ding, vibrate rigid surface",
            impact_high: "buckle, shear, dent, shatter, pulverize",
            texture_desc: "unyielding, stiff, solid"
        },
        viscoelastic: { // 점탄성체 (피부, 고무)
            impact_low: "ripple, jiggle, quiver",
            impact_high: "compress violently, bruise, contort, snap back",
            texture_desc: "supple, pliant, resilient"
        },
        brittle: { // 취성체 (유리, 얼음)
            impact_low: "vibrate, crackle",
            impact_high: "shatter instantly, fragment, explode into shards",
            texture_desc: "crystalline, sharp, fragile"
        },
        cloth: { // 직물 (옷, 머리카락)
            impact_low: "flutter, drape, sway",
            impact_high: "whip, snap, tear, shred",
            texture_desc: "flowing, woven, lightweight"
        },
        fluid: { // 유체 (물, 연기)
            impact_low: "trickle, seep, ooze, bead up",
            impact_high: "atomize, erupt, splash, vaporize",
            texture_desc: "chaotic, turbulent, misty, pore-sized micro-droplets"
        },
        elastoplastic: {
            impact_low: "deform, imprint, indent",
            impact_high: "splat, flatten, ooze, adhere",
            texture_desc: "dense, malleable, sticky, heavy, opaque solid"
        },
        // [NEW] 연구 보고서 VLM Prompting 3.3 반영
        granular: { // 입자/분말 (모래, 먼지, 가루)
            impact_low: "shift, trickle, sift",
            impact_high: "disperse, blast, crumble, cloud", // 충격 시 흩어짐
            texture_desc: "coarse, gritty, loose, particulate"
        }
    },

    // Layer 3: 행동 맥락 (Action Context) - 변동 없음
    action_context: {
        locomotion: {
            physics_law: "Friction-based propulsion. Inertia carries momentum.",
            camera_behavior: "Tracking shot matching speed, motion blur streaks.",
            key_verbs: "grip, torque, accelerate, drift"
        },
        combat: {
            physics_law: "Inelastic collision. Kinetic energy converts to deformation and shockwaves.",
            camera_behavior: "Shutter angle effect, Camera shake on impact, Frame skip.",
            key_verbs: "connects solid, snaps back, ripples through target, explosive radial burst"
        },
        interaction: {
            physics_law: "Fine motor control. Surface indentation at contact points.",
            camera_behavior: "Close focus, steady tracking.",
            key_verbs: "grasp, compress, manipulate, indent"
        },
        aerodynamics: {
            physics_law: "Drag vs Gravity. Terminal velocity.",
            camera_behavior: "Floating camera, wind noise visualization.",
            key_verbs: "soar, glide, plummet, buffeting"
        },
        passive: {
            physics_law: "Newtonian reaction. Object follows external force vector.",
            camera_behavior: "Reactionary pan.",
            key_verbs: "tumble, slide, roll, absorb"
        }
    }
};