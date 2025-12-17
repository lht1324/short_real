export const PHYSICS_LIBRARY = {
    // [Layer 1] 재질 (Material) -> Vocabulary List
    material: {
        rigid: {
            effect_tag: "Sparks",
            alt_tag: "Debris",
            vocabulary: [
                "Brushed grain", "Pitted", "Rusted", "Polished", "Specular highlight",
                "Chrome glint", "Dented", "Scratched", "Warped"
            ]
        },
        viscoelastic: {
            effect_tag: "Sweat Spray",
            alt_tag: "Skin Ripple",
            vocabulary: [
                "Porous", "Calloused", "Subsurface scattering", "Oily sheen", "Sweat-beaded",
                "Flushed", "Stretched", "Sagging", "Bulging veins", "Muscle definition"
            ]
        },
        brittle: {
            effect_tag: "Shards",
            alt_tag: "Glass Explosion",
            vocabulary: [
                "Sharp faceted edges", "Cracks", "Shards", "Internal refraction", "Prismatic glint"
            ]
        },
        cloth: {
            effect_tag: "Fabric Flutter",
            alt_tag: "Wind Drag",
            vocabulary: [
                "Coarse weave", "Finely-stitched", "Plush", "Matte finish", "Satin sheen",
                "Billowing", "Clinging", "Taut against skin", "Rippling", "Heavy-set"
            ]
        },
        fluid: {
            effect_tag: "Mist",
            alt_tag: "Splash Burst",
            vocabulary: [
                "Droplets", "Spray", "Mist", "Foam", "Ripples",
                "Caustics", "Refractive", "High-contrast reflection"
            ]
        },
        elastoplastic: {
            effect_tag: "Surface Deformation",
            alt_tag: "Heavy Splat",
            vocabulary: [
                "Deep surface indentation", "Sticky glossy texture", "Impact splash pattern",
                "Stretching material", "Viscous splat"
            ]
        },
        granular: {
            effect_tag: "Dust Cloud",
            alt_tag: "Gravel Spray",
            vocabulary: [
                "Volumetric dust cloud", "Streaming particle trails", "Coarse grains",
                "Airborne density", "Rough surface shadow"
            ]
        }
    },

    // [Layer 2] 행동 맥락 (Action Context) -> Vocabulary List (Visual Hints로 사용)
    action_context: {
        locomotion: {
            camera_tech: "Low Angle Tracking Shot",
            speed_term: "Fast Motion, Directional Motion Blur",
            vocabulary: [
                "Mid-stride", "Off-balance stance", "Airborne phase",
                "Leaning into turn", "Legs blurred in motion", "Weight shifted forward"
            ]
        },
        combat: {
            camera_tech: "Handheld Shaky Cam, Whip Pan",
            speed_term: "High Shutter Speed, Sudden Motion Blur",
            vocabulary: [
                "Fist extended", "Impact tremor", "Muscle coiled", "Recoiling from blow",
                "Guard raised", "Face contorted", "Torque in torso"
            ]
        },
        interaction: {
            camera_tech: "Macro Shot, Tight Focus",
            speed_term: "Real-time, Shallow Depth of Field",
            vocabulary: [
                "Firm grip", "Knuckles white", "Fingertips grazing",
                "Interlocked fingers", "Palm pressed flat", "Precise handling"
            ]
        },
        aerodynamics: {
            camera_tech: "FPV Drone Shot, Wide Angle",
            speed_term: "Hyperlapse, Extreme Motion Blur, Speed Lines",
            vocabulary: [
                "Streamlined posture", "Arms swept back", "Body arched",
                "Free-falling orientation", "Wind-resistance tuck"
            ]
        },
        passive: {
            camera_tech: "Crash Zoom, Reactionary Pan",
            speed_term: "Sudden Recoil, Camera Shake",
            vocabulary: [
                "Slouched posture", "Resting weight", "Stationary stance",
                "Relaxed limbs", "Grounded footing"
            ]
        },
        velocity_max: {
            camera_tech: "Bumper Cam, Ground Level",
            speed_term: "Hyperlapse, Warp Speed Effect, Background Streaming Blur",
            vocabulary: [
                "Motion-blurred edges", "Speed lines", "Background streaking",
                "Silhouette distorted by speed"
            ]
        }
    }
};