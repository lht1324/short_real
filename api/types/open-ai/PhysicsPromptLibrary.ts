export const PHYSICS_LIBRARY = {
    // [Layer 1] 형태 (Morphology) -> Action (업계 용어 동사 풀)
    // 용도: 주체가 할 수 있는 '가장 빠르고 역동적인 동작'을 선택하는 기준
    morphology: {
        articulated: { // 인간, 로봇
            // 틱톡/스포츠/액션 영화 용어
            verbs: ["Sprints", "Lunges", "Vaults", "Lands a Haymaker", "Uppercuts", "Dashes", "Parkour Roll", "Backflips"],
            constraint: "No gliding feet" // 발 미끄러짐 방지용 최소 제약
        },
        wheeled: { // 자동차, 바이크
            // 레이싱/드리프트 씬 용어
            verbs: ["Drifts", "Powerslides", "Burnouts", "Fishtails", "Redlines", "Skids", "Launches"],
            constraint: "No strafing" // 게걸음 방지
        },
        tracked: { // 탱크, 중장비
            // 밀리터리/파괴 씬 용어
            verbs: ["Crushes", "Rumbles", "Plows", "Pivot Turns", "Crawls"],
            constraint: "No smooth sliding"
        },
        aerial_wing: { // 비행기, 윙슈트
            // 익스트림 스포츠/GoPro 용어
            verbs: ["Proximity Flying", "Nose Dives", "Barrel Rolls", "Banks Hard", "Rockets", "Soars", "Streaks"],
            constraint: "No hovering"
        },
        aquatic: { // 물고기, 잠수함
            // 수중 촬영 용어
            verbs: ["Torpedos", "Propels", "Surges", "Breaches", "Cuts through water"],
            constraint: "No gravity fall"
        },
        amorphous: { // 슬라임, 연기
            // VFX/CGI 용어
            verbs: ["Morphs", "Liquefies", "Erupts", "Explodes outward", "Swirls"],
            constraint: "No rigid structure"
        }
    },

    // [Layer 2] 재질 (Material) -> Effect Tag (단일 명사형 이펙트)
    // 용도: Action 뒤에 'with [Effect]' 형태로 붙일 단 하나의 시각적 조미료
    material: {
        rigid: { // 금속, 차체
            effect_tag: "Sparks", // 부딪히면 불꽃
            alt_tag: "Debris" // 혹은 파편
        },
        viscoelastic: { // 피부, 근육
            effect_tag: "Sweat Spray", // 타격 시 땀 튐 (가장 극적인 효과)
            alt_tag: "Skin Ripple" // 혹은 피부 떨림 (모션 블러로 표현됨)
        },
        brittle: { // 유리
            effect_tag: "Shards", // 파편
            alt_tag: "Glass Explosion"
        },
        cloth: { // 옷, 망토
            effect_tag: "Fabric Flutter", // 펄럭임
            alt_tag: "Wind Drag"
        },
        fluid: { // 물
            effect_tag: "Mist", // 안개 분사
            alt_tag: "Splash Burst"
        },
        elastoplastic: { // 진흙, 껌
            effect_tag: "Surface Deformation",
            alt_tag: "Heavy Splat"
        },
        granular: { // 모래, 먼지 (랠리카 등)
            effect_tag: "Dust Cloud", // 먼지 구름
            alt_tag: "Gravel Spray" // 자갈 튐
        }
    },

    // [Layer 3] 행동 맥락 (Action Context) -> Composition & Speed (구도 및 속도)
    // 용도: 카메라 워크와 속도감을 나타내는 영화/영상 전문 용어
    action_context: {
        locomotion: { // 이동
            camera_tech: "Low Angle Tracking Shot", // 바닥을 훑는 앵글
            speed_term: "High Speed, Directional Blur"
        },
        combat: { // 전투
            camera_tech: "Handheld Shaky Cam, Whip Pan", // 타격감을 위한 흔들림
            speed_term: "Impact Shockwave, Shutter Stutter" // 셔터 끊김 효과
        },
        interaction: { // 조작 (손)
            camera_tech: "Macro Shot, Tight Focus", // 초근접
            speed_term: "Precise Movement"
        },
        aerodynamics: { // 비행
            camera_tech: "FPV Drone Shot, Wide Angle", // 1인칭 드론 시점
            speed_term: "Breakneck Speed, Speed Lines" // 만화적 속도선
        },
        passive: { // 피격/반동
            camera_tech: "Crash Zoom, Reactionary Pan", // 줌인
            speed_term: "Sudden Recoil, Motion Blur"
        }
    }
};