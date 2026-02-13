import {STYLE_PROMPT_LIBRARY} from "@/api/types/open-ai/StylePromptLibrary";

export interface TechnicalIntent {
    angleIntent: "Default/Neutral" | "Heroic/Scale" | "Extreme Power/Ground-level" | "Dialogue/Interaction" | "Surveillance/Map-view" | "Stylized/Technical";
    compositionIntent: "Symmetry" | "Balance" | "Strength" | "Action" | "Motion" | "Depth" | "Minimalism";
    exposureIntent: "Vibrant/High-Key" | "Ethereal/Dreamy" | "Balanced/Natural" | "Cinematic/Moody" | "Gritty/Noisy" | "Silhouetted/Backlit" | "Nocturnal/Deep-Night" | "Harsh/High-Energy";
}

/**
 * | Cinematic Technique | Category | Visual Axis | Vector ($\vec{C}$) |
 * | :--- | :--- | :--- | :--- |
 * | **Static Frame** | Spatial | None | $0X$, $0Y$, $0Z$ |
 * | **Truck Left** | Spatial | **X** | $-X$ |
 * | **Truck Right** | Spatial | **X** | $+X$ |
 * | **Pedestal Down** | Spatial | **Y** | $-Y$ |
 * | **Pedestal Up** | Spatial | **Y** | $+Y$ |
 * | **Dolly-Out** | Spatial | **Z** | $-Z$ |
 * | **Dolly-In** | Spatial | **Z** | $+Z$ |
 * | **Pan Left** | Angular | **X** (Yaw Y) | $-\Delta \theta_{Y}$ |
 * | **Pan Right** | Angular | **X** (Yaw Y) | $+\Delta \theta_{Y}$ |
 * | **Tilt Down** | Angular | **Y** (Pitch X) | $-\Delta \theta_{X}$ |
 * | **Tilt Up** | Angular | **Y** (Pitch X) | $+\Delta \theta_{X}$ |
 * | **Arc Orbit** | Spatial | **X**, **Z** | Circular |
 * | **Rack Focus** | Optical | **Z** (Focal) | $\Delta Z_{focal}$ |
 * | **Dolly Zoom** | **Hybrid** | **Z** | $\vec{C}(\pm Z) + \vec{f}(\mp Z)$ |
 * | **Crash Zoom Out**| Optical | **Z** (Focal) | $-\Delta \text{Scale}$ |
 * | **Crash Zoom In** | Optical | **Z** (Focal) | $+\Delta \text{Scale}$ |
 * | **Handheld Shaky** | Vibration | All | $C(t) + \delta_{\text{noise}}$ |
 */

import {MasterStyleInfo} from "@/api/types/supabase/MasterStyleInfo";
import {addArticleToWord} from "@/utils/stringUtils";
import {FluxPrompt} from "@/api/types/open-ai/FluxPrompt";
import {Entity} from "@/api/types/open-ai/Entity";

/**
 * @param cx 피사체의 X 방향
 * @param cy 피사체의 Y 방향
 * @param cz 피사체의 Z 방향
 * @param intensityTier 영상의 강도
 * @param narrativeVibe 이야기의 분위기
 */

export function subjectVectorsToCameraVectorString(
    cx: "$-X$" | "$0X$" | "$+X$",
    cy: "$-Y$" | "$0Y$" | "$+Y$",
    cz: "$-Z$" | "$0Z$" | "$+Z$",
    intensityTier: "VERY_LOW" | "LOW" | "HIGH" | "VERY_HIGH",
    narrativeVibe: "NORMAL" | "CHAOTIC" | "COMBAT" | "ANXIOUS" | "CATASTROPHIC" | "VERTIGO" | "SHOCK" | "DREAMY" | "SURREAL" | "EMOTIONAL" | "FOCUS"
): string {
    const candidateList = getCandidatesBySubjectVectors(cx, cy, cz, intensityTier);
    const [xCandidate, yCandidate, zCandidate] = candidateList;
    const isXCandidateSelected = xCandidate !== "None";
    const isYCandidateSelected = yCandidate !== "None";
    const isZCandidateSelected = zCandidate !== "None";
    const selectedCandidateCount = candidateList.reduce((acc, candidate) => {
        return acc + (candidate !== "None" ? 1 : 0);
    }, 0);
    const isHandheldShakyEnabled = narrativeVibe === "CHAOTIC" || narrativeVibe === "COMBAT" || narrativeVibe === "ANXIOUS" || narrativeVibe === "CATASTROPHIC";

    // - IF `Narrative Vibe` implies Instability (e.g., **'Chaos'**, **'Combat'**, **'Anxious'**, **'Catastrophic'**) -> APPEND "with Handheld Shaky" to the end string.
    let candidateString: string;

    if (selectedCandidateCount === 0) {
        candidateString = "Static Frame";
    } else if (selectedCandidateCount === 1) {
        candidateString = isXCandidateSelected
            ? xCandidate
            : isYCandidateSelected
                ? yCandidate
                : zCandidate; // isZCandidateSelected
    } else if (selectedCandidateCount === 2) {
        candidateString = isXCandidateSelected && isYCandidateSelected
            ? `${xCandidate} and ${yCandidate}`
            : isXCandidateSelected && isZCandidateSelected
                ? `${zCandidate} and ${xCandidate}`
                : `${zCandidate} and ${yCandidate}`; // isYCandidateSelected && isZCandidateSelected
    } else { // selectedCandidateCount === 3
        candidateString = `${zCandidate} and ${xCandidate}`;
    }

    // Upgrade
    if (intensityTier === "VERY_HIGH" && (yCandidate !== "Pedestal Down" && yCandidate !== "Pedestal Up") && (zCandidate === "Dolly-In" || zCandidate === "Zoom Out")) {
        if (narrativeVibe === "VERTIGO" || narrativeVibe === "SHOCK") {
            candidateString = isXCandidateSelected
                ? `Dolly Zoom and ${xCandidate}`
                : isYCandidateSelected
                    ? `Dolly Zoom and ${yCandidate}`
                    : "Dolly Zoom";
        } else {
            const upgradeValue = zCandidate === "Dolly-In" ? "Crash Zoom In" : "Crash Zoom Out";

            candidateString = isXCandidateSelected
                ? `${upgradeValue} and ${xCandidate}`
                : isYCandidateSelected
                    ? `${upgradeValue} and ${yCandidate}`
                    : upgradeValue;
        }
    }

    if (narrativeVibe === "DREAMY" || narrativeVibe === "SURREAL") {
        if (xCandidate !== "None" && zCandidate !== "None") {
            candidateString = "Arc Orbit";
        }
    }

    if (narrativeVibe === "EMOTIONAL" || narrativeVibe === "FOCUS") {
        if (candidateString === "Static Frame") {
            candidateString = "Rack Focus";
        }
    }

    // Forbidden Matrix Filtering
    if (selectedCandidateCount === 2) {
        if ((xCandidate === "Pan Left" || xCandidate === "Pan Right") && (yCandidate === "Pedestal Down" || yCandidate === "Pedestal Up")) {
            // [`Angular`-`X`] + [`Spatial`-`Y`]
            candidateString = xCandidate
        }

        // 이 둘은 로직 상 못 나옴
        // [`Spatial`-`Y`] + [`Optical`-`Z`]
        // [`Spatial`-`Z`] + [`Optical`-`Z`]
    }

    const getMovementAdverb = () => {
        switch (intensityTier) {
            case "VERY_LOW": return "steadily"
            case "LOW": return "smoothly"
            case "HIGH": return "aggressively"
            case "VERY_HIGH": return "violently"
        }
    }

    const movementAdverb = getMovementAdverb();

    return `${candidateString}${isHandheldShakyEnabled ? " with Handheld Shaky " : " "}${movementAdverb}`;
}

function getCandidatesBySubjectVectors(
    cx: "$-X$" | "$0X$" | "$+X$",
    cy: "$-Y$" | "$0Y$" | "$+Y$",
    cz: "$-Z$" | "$0Z$" | "$+Z$",
    intensityTier: "VERY_LOW" | "LOW" | "HIGH" | "VERY_HIGH"
): [
    ("Pan Left" | "Truck Left" | "None" | "Pan Right" | "Truck Right"),
    ("Tilt Down" | "Pedestal Down" | "None" | "Tilt Up" | "Pedestal Up"),
    ("Zoom Out" | "None" | "Dolly-In")
] {
    const getXCandidate = () => {
        switch (cx) {
            case "$-X$": return intensityTier === "VERY_LOW" || intensityTier === "LOW"
                ? "Pan Left"
                : "Truck Left";
            case "$0X$": return "None"
            case "$+X$": return intensityTier === "VERY_LOW" || intensityTier === "LOW"
                ? "Pan Right"
                : "Truck Right"
        }
    }
    const getYCandidate = () => {
        switch (cy) {
            case "$-Y$": return intensityTier === "VERY_LOW" || intensityTier === "LOW"
                ? "Tilt Down"
                : "Pedestal Down";
            case "$0Y$": return "None"
            case "$+Y$": return intensityTier === "VERY_LOW" || intensityTier === "LOW"
                ? "Tilt Up"
                : "Pedestal Up";
        }
    }
    const getZCandidate = () => {
        switch (cz) {
            case "$-Z$": return "Zoom Out"
            case "$0Z$": return "None"
            case "$+Z$": return "Dolly-In"
        }
    }

    const xCandidate = getXCandidate();
    const yCandidate = getYCandidate();
    const zCandidate = getZCandidate();

    return [xCandidate, yCandidate, zCandidate];
}

export function generateTechnicalLensString(masterStyleInfo: MasterStyleInfo): string {
    const { optics, composition } = masterStyleInfo;

    // 1. 개별 부품 추출 (불필요한 공백 제거)
    const lens = `${optics.lensType.trim()} Lens`;

    // 명세에는 없으나 인터페이스에 있는 focusDepth를 포함할지 결정 가능
    // 여기서는 인터페이스를 존중하여 포함하는 것으로 구성했습니다.
    const focus = `${optics.focusDepth.trim()} Focus`;

    const ratio = composition.preferredAspectRatio.trim();
    const framing = composition.framingStyle.trim();

    // 2. 기계적 조립 (쉼표로 구분, 마지막은 항상 쉼표와 공백으로 마감)
    // 조립 순서: [Lens], [Focus], [Ratio], [Framing],
    return `${lens}, ${focus}, ${ratio}, ${framing}`;
}

/**
 * AI가 생성한 블록들을 결합하여 최종 비디오 프롬프트를 조립합니다.
 * 1. "None" 입력값은 빈 문자열로 처리하여 제외합니다.
 * 2. 문법적 접속사를 보충하고 첫 글자 소문자화를 처리합니다.
 * 3. 마지막에 연쇄적인 .replace()를 통해 오염된 구두점과 공백을 세척합니다.
 */
export function assembleFullVideoGenPromptSentence(
    primaryNarrativeBlock: string,
    atmosphericLightingDelta: string,
    cinematicCameraVector: string,
    cameraActionString: string,
    style: string,
): string {
    // 1번 요청사항: "None" 필터링 및 기초 구두점 제거
    const sanitizeBlock = (text: string): string => {
        const trimmed = text.trim();
        if (trimmed.toLowerCase() === "none" || !trimmed) return "";
        return trimmed.replace(/[.,\s]+$/, ""); // 끝에 붙은 마침표, 쉼표, 공백 제거
    };

    const lowerFirstLetter = (text: string): string => {
        if (!text) return "";
        return text.charAt(0).toLowerCase() + text.slice(1);
    };

    // 각 블록 변수 선언 (카멜 표기법)
    const narrativePart = sanitizeBlock(primaryNarrativeBlock);
    const atmosphereRaw = lowerFirstLetter(sanitizeBlock(atmosphericLightingDelta));
    const cameraRaw = lowerFirstLetter(sanitizeBlock(cinematicCameraVector));
    const styleRaw = lowerFirstLetter(sanitizeBlock(style));

    // 카메라 핸들 치환
    const replacedCameraVector = cameraRaw.replace(
        "CINEMATIC_CAMERA_VECTORS",
        cameraActionString.trim()
    );

    // 접속사(Bridge) 처리
    let atmosphericPart = "";
    if (atmosphereRaw) {
        const atmosphereConnectors = ["amidst", "while", "with", "surrounded", "enhanced"];
        const hasConnector = atmosphereConnectors.some(c => atmosphereRaw.startsWith(c));
        atmosphericPart = hasConnector ? atmosphereRaw : `amidst ${atmosphereRaw}`;
    }

    let cameraPart = "";
    if (replacedCameraVector) {
        const hasCameraConnector = replacedCameraVector.includes("captured") || replacedCameraVector.includes("filmed");
        cameraPart = hasCameraConnector ? replacedCameraVector : `captured with ${replacedCameraVector}`;
    }

    let stylePart = "";
    if (styleRaw) {
        stylePart = styleRaw.startsWith("rendered") ? styleRaw : `rendered in ${styleRaw}`;
    }

    // 2번 요청사항: 최종 조립 및 연쇄적인 replace 처리
    const finalSentence = [
        narrativePart,
        atmosphericPart,
        cameraPart,
        stylePart
    ]
        .filter(Boolean) // 빈 문자열(None이었던 것들) 제거
        .join(", ");

    return finalSentence
        .replace(/,\s*,/g, ",")       // 중복 쉼표 세척 (,, 또는 , ,)
        .replace(/,\s*\./g, ".")      // 문장 끝 쉼표+마침표 방지
        .replace(/\s\s+/g, " ")       // 이중 공백 세척
        .trim() + ".";                // 최종 마침표 추가
}

export function surgicallyReplaceVideoGenPromptByCameraKey(
    videoGenPrompt: string,
    structuredCameraField: string,
    processedCameraAction: string,
    styleBlock: string
): string {
    // 1. Cinematic Camera Vector 필드를 쉼표로 분리
    const cameraParts = structuredCameraField.split(",");
    if (cameraParts.length === 0) return videoGenPrompt;

    // 2. 검색 키 생성 (예: "Macro lens")
    const searchKey = cameraParts[0].trim();
    const lowerPrompt = videoGenPrompt.toLowerCase();
    const lowerKey = searchKey.toLowerCase();

    // 3. videoGenPrompt에서 해당 키의 위치 탐색
    const keyIndex = lowerPrompt.indexOf(lowerKey);

    if (keyIndex === -1) {
        // 키를 못 찾으면 원본 반환 (안전장치)
        return videoGenPrompt;
    }

    // 4. 수술 집도
    // 키 위치 이전까지가 [주어 + 대기/광원] 섹션입니다.
    const narrativeAndAtmosphere = videoGenPrompt.substring(0, keyIndex).trim();

    // 5. 우리가 만든 [카메라 섹션] 조립 (핸들 치환)
    const correctedCamera = structuredCameraField
        // 접속사 제거
        .replace(/\b(captured with|filmed with|captured with a|filmed using)\s+CINEMATIC_CAMERA_VECTORS/gi, "CINEMATIC_CAMERA_VECTORS")
        .trim()
        .replace(/\.+$/, "") // 문장 끝 마침표 제거
        .replace("CINEMATIC_CAMERA_VECTORS", processedCameraAction); // 핸들을 실제 액션으로 치환

    // 6. 최종 합체 및 화학적 세척
    return `${narrativeAndAtmosphere.replace(/,$/, "")}, ${correctedCamera}, rendered in ${styleBlock.replace(/\.+$/, "")}.`
        .replace(/,\s*,/g, ",") // 중복 쉼표 세척
        .replace(/\b(with|a|an|the|captured|filmed|shot)\s*,/gi, "$1") // 관사/전치사 뒤의 어색한 쉼표 제거
        .replace(/\.,/g, ",") // 마침표와 쉼표가 겹치는 현상(.,) 제거
        .replace(/\b(a|an)\s+\1\b/gi, "$1") // 관사 중복(a a, an an) 제거
        .replace(/\s\s+/g, " ") // 이중 공백 제거
        .trim();
}

/**
 * 고증 파괴 및 환각 방지를 위한 확정적 프롬프트 조립 함수
 * @param imageGenPrompt LLM이 생성한 시각 레이아웃 객체 (FluxPrompt)
 * @param sceneEntityManifestList 고증 데이터가 담긴 엔티티 리스트 (Entity[])
 * @param canvasType 'Vertical' | 'Horizontal' | 'Square' (레터박스 방역용)
 */
export function assembleFullImageGenPromptSentence(
    imageGenPrompt: FluxPrompt,
    sceneEntityManifestList: Entity[],
    canvasType: 'Vertical' | 'Horizontal' | 'Square' = 'Vertical'
): string {
    const { camera, subjects, scene, background, composition, mood, lighting, color_palette, style, effects } = imageGenPrompt;

    const formatList = (list: string[]) => {
        if (!list || list.length === 0) return "";
        if (list.length === 1) return list[0];
        return `${list.slice(0, -1).join(", ")}, and ${list.slice(-1)}`;
    };

    // --- UNIT 4 - Sentence 1: Subject & Framing ---
    let sentence1 = "";
    if (subjects && subjects.length > 0) {
        const subjectClauses = subjects.map((subject, index) => {
            const entity = sceneEntityManifestList.find(e => e.id === subject.id);
            if (!entity) return subject.description;

            /**
             * - **Structures by `type`**:
             *   * **`human`**: `[ERA/PERIOD], [NATIONALITY/ETHNICITY], [ROLE], [GENDER], [AGE]`
             *   * **`machine`**: `[ERA/PERIOD], [NATION/MARKINGS], [MODEL NAME], [SUB-TYPE], [PRODUCTION YEAR/SPEC]`
             *   * **`creature`**: `[ERA/PERIOD], [CULTURAL ORIGIN], [SPECIES/ARCHETYPE], [GENDER/`N/A`], [AGE/MATURITY]`
             *   * **`animal`**: `[ERA/PERIOD], [GEOGRAPHIC REGION], [SPECIES], [GENDER/`N/A`], [AGE/MATURITY]`
             *   * **`object`**: `[ERA/PERIOD], [CULTURAL/NATIONAL STYLE], [ITEM NAME], [CRAFTSMANSHIP/DETAIL]`
             *   * **`hybrid`**: `[ERA/PERIOD], [NATIONALITY/ETHNICITY], [HYBRID TYPE], [GENDER], [AGE]`
             */
            const demoParts = entity.demographics.split(', ');
            const genderPart = entity.type !== 'machine' && entity.type !== 'object' && demoParts[3] !== "N/A"
                ? `${demoParts[3]} `
                : ""
            const demographicAnchor = `${demoParts[0]} ${demoParts[1]} ${genderPart}${demoParts[2]}`;

            const hasHelmet = entity.appearance.accessories?.some(acc => acc.toLowerCase().includes('helmet') || acc.toLowerCase().includes('hat'));

            // [찝찝함 해결의 핵심] 모든 파트를 배열에 담습니다.
            const detailParts: string[] = [];
            if (!hasHelmet && entity.appearance.hair) detailParts.push(`with ${entity.appearance.hair}`);
            if (entity.appearance.body_features) detailParts.push(entity.appearance.body_features);
            detailParts.push(`clad in ${entity.appearance.clothing_or_material}`);
            detailParts.push(`equipped with ${formatList(entity.appearance.accessories || [])}`);

            // 배열을 조인하면 값이 있는 것들 사이에만 ", "가 정확히 들어갑니다.
            const detailClause = detailParts.join(", ");

            if (index === 0) {
                const framing = addArticleToWord(`${camera.angle} ${camera.distance}`, true);
                const connector = entity.role === 'prop' ? "which is" : "who is";
                // 앵커 뒤에 무조건 쉼표를 하나 찍고 조인된 문자열을 붙입니다.
                return `${framing} captures ${demographicAnchor}, ${detailClause} ${connector} ${subject.pose} in the ${subject.position}`;
            } else {
                const start = `while in the ${subject.position} ${addArticleToWord(demographicAnchor)}`;
                const connector = entity.role === 'prop' ? "" : "is";
                return `, ${start}, ${detailClause} ${connector} ${subject.pose}`;
            }
        });
        sentence1 = `${subjectClauses.join("")}`; // 문장은 마침표로 끝냄
    } else {
        const framing = addArticleToWord(`${camera.angle} ${camera.distance}`, true);
        sentence1 = `${framing} captures the ${scene} elements`;
    }

    // --- UNIT 4 - Sentence 2: Environment & Atmosphere ---
    const hexPalette = `(${color_palette.join(', ')})`;
    const s2Connector = subjects.length > 0 ? `depicting ${scene} with a` : `arranged in a`;
    // 문장 시작은 대문자로 (Unit 4 준수)
    const sentence2 = `the scene is set in ${background}, ${s2Connector} ${composition} composition, where the atmosphere is ${mood}, illuminated by ${lighting} and a color palette of ${hexPalette}`;

    // --- UNIT 4 - Sentence 3: Technical Specifications ---
    let safeStyle = style;
    if (canvasType === 'Vertical' && style.toLowerCase().includes("cinematic")) {
        safeStyle = style.replace(/cinematic/gi, "high-fidelity RAW portrait photography");
    }
    const sentence3 = `rendered in ${safeStyle}, captured with a ${camera.lens} lens at ${camera.fNumber} for ${camera.focus} and ISO ${camera.ISO}, featuring ${formatList(effects)}`;

    // 최종 결과: 3개의 문장을 공백 한 칸씩 띄워서 합침
    return `${sentence1}, ${sentence2}, ${sentence3}.`
        .replaceAll(".,", ",")
        .replaceAll("  ", " ");
}

/**
 * @param technicalIntent
 * @param masterStyleInfo
 * @param entityManifestList
 * @param styleId
 * @param aspectRatio
 */
export function composeOpticalAndTechnicalOption(
    technicalIntent: TechnicalIntent,
    masterStyleInfo: MasterStyleInfo,
    entityManifestList: Entity[],
    styleId: keyof typeof STYLE_PROMPT_LIBRARY,
    aspectRatio: { width: number; height: number; } = { width: 9, height: 16 }
): Omit<FluxPrompt, 'scene' | 'subjects' | 'color_palette' | 'lighting' | 'mood' | 'background'> {
    const { width, height } = aspectRatio;
    const canvasType: "Horizontal" | "Vertical" | "Square" = width > height
        ? "Horizontal"
        : width < height
            ? "Vertical"
            : "Square";
    const {
        style: definedStyle,
        effects: definedEffects,
    } = STYLE_PROMPT_LIBRARY[styleId];
    const framingStyle = masterStyleInfo.composition.framingStyle;
    const focusDepth = masterStyleInfo.optics.focusDepth;
    const grainLevel = masterStyleInfo.fidelity.grainLevel;
    const exposureVibe = masterStyleInfo.optics.exposureVibe;

    const {
        angleIntent
    } = technicalIntent;

    const getAngle = () => {
        // bird's eye
        const isEveryEntityAeroDynamics = entityManifestList.every((entity) => {
            return entity.physics_profile?.action_context.includes('aerodynamics') === true;
        });

        const angleMap = {
            "Horizontal": {
                "Default/Neutral": "eye level",
                "Heroic/Scale": "low angle",
                "Extreme Power/Ground-level": "worm's-eye",
                "Dialogue/Interaction": "over-the-shoulder",
                "Surveillance/Map-view": isEveryEntityAeroDynamics
                    ? "bird's-eye"
                    : "high angle shot looking down",
                "Stylized/Technical": "isometric"
            },
            "Vertical": {
                "Default/Neutral": "eye level",
                "Heroic/Scale": "low angle",
                "Extreme Power/Ground-level": "low angle",
                "Dialogue/Interaction": "over-the-shoulder",
                "Surveillance/Map-view": "high angle shot looking down",
                "Stylized/Technical": "slightly low",
            },
            "Square": {
                "Default/Neutral": "eye level",
                "Heroic/Scale": "slightly low",
                "Extreme Power/Ground-level": "low angle",
                "Dialogue/Interaction": "eye level",
                "Surveillance/Map-view": "high angle",
                "Stylized/Technical": "eye level",
            }
        }

        return angleMap[canvasType][angleIntent];
    }

    const getDistance = () => {
        const distanceMap = {
            "Horizontal": {
                "Extreme Long/Wide": "extreme wide shot",
                "Long/Wide": "wide shot",
                "Full/Medium Wide": "medium wide shot",
                "Medium/Waist": "medium shot",
                "Bust/Chest": "medium close-up",
                "Face/Detail": "close-up",
            },
            "Vertical": {
                "Extreme Long/Wide": "vertical panoramic environmental shot",
                // "full-length" 대신 인물의 활동 범위를 강조하는 명칭으로 변경
                "Long/Wide": "vertical full-body action shot",
                "Full/Medium Wide": "medium wide vertical shot",
                // 콕핏 장면에서 가장 많이 쓰일 "Medium" 구간의 명칭을 명확히 함
                "Medium/Waist": "cinematic waist-up vertical capture",
                "Bust/Chest": "medium close-up",
                "Face/Detail": "close-up",
            },
            "Square": {
                "Extreme Long/Wide": "wide-angle square shot",
                "Long/Wide": "full-frame environmental shot",
                "Full/Medium Wide": "medium-wide centered shot",
                "Medium/Waist": "medium shot",
                "Bust/Chest": "medium close-up",
                "Face/Detail": "close-up",
            }
        }

        return distanceMap[canvasType][framingStyle];
    }
    const distance = getDistance();

    const getFocus = () => {
        switch (canvasType) {
            case "Horizontal": {
                switch (focusDepth) {
                    case "Deep": return "deep focus"
                    case "Shallow": {
                        if (distance === "close-up") {
                            return "macro focus";
                        } else if (distance.includes("medium")) {
                            return "cinematic background blur";
                        } else if (distance.includes("wide")) {
                            return "selective focus";
                        } else {
                            return "selective focus";
                        }
                    }
                    case "Selective": return "selective focus"
                }
            }
            case "Vertical": {
                switch (focusDepth) {
                    case "Deep": return "sharp focus throughout the vertical frame"
                    case "Shallow": {
                        if (distance === "close-up") {
                            return "macro detail focus";
                        } else if (distance.includes("medium")) {
                            return "soft blurred background";
                        } else if (distance.includes("wide")) {
                            return "subtle subject isolation";
                        } else {
                            return "selective focus";
                        }
                    }
                    case "Selective": return "selective focus"
                }
            }
            case "Square": {
                switch (focusDepth) {
                    case "Deep": return "deep focus"
                    case "Shallow": return "bokeh-rich background"
                    case "Selective": return "selective focus"
                }
            }
        }
    }
    const focus = getFocus();

    const getLens = () => {
        const lensType = masterStyleInfo.optics.lensType;

        // 1. 거리를 3단계(WIDE, MID, CLOSE)로 범주화 (Source data인 framingStyle 기반)
        const isWideScale = ["Extreme Long/Wide", "Long/Wide"].includes(framingStyle);
        const isCloseScale = ["Bust/Chest", "Face/Detail"].includes(framingStyle);

        // 2. 캔버스 타입별 기본 렌즈 매핑 (변동 없음)
        const lensMap = {
            "Horizontal": { "Wide-Angle": "24mm", "Spherical": "35mm", "Anamorphic": "85mm", "Macro": "85mm macro" },
            "Vertical":   { "Wide-Angle": "35mm", "Spherical": "50mm", "Anamorphic": "50mm", "Macro": "85mm" },
            "Square":     { "Wide-Angle": "24mm", "Spherical": "50mm", "Anamorphic": "50mm", "Macro": "85mm" }
        };

        let finalLens = lensMap[canvasType][lensType] || "50mm";

        // 3. 거리 범주에 따른 광학 최적화 (Override)

        // [WIDE 전략] 아주 먼 거리라면 렌즈도 시원하게 (14mm 도입)
        if (isWideScale) {
            if (framingStyle === "Extreme Long/Wide" && canvasType === "Horizontal") {
                finalLens = "14mm"; // 광활한 풍경 극대화
            } else if (finalLens === "85mm" || finalLens === "50mm") {
                finalLens = canvasType === "Horizontal" ? "24mm" : "35mm"; // 멀리서 찍는데 망원렌즈면 답답하므로 광각으로 전환
            }
        }

        // [CLOSE 전략] 가까운 거리라면 왜곡 방지 및 디테일 강화
        if (isCloseScale) {
            if (lensType === "Macro") {
                finalLens = "100mm macro"; // 초근접 전용 수치
            } else if (["24mm", "35mm"].includes(finalLens)) {
                // 얼굴 왜곡 방지: 가깝게 찍을 때 광각렌즈는 50mm(표준)나 85mm(망원)로 강제 변환
                finalLens = canvasType === "Vertical" ? "85mm" : "50mm";
            }
        }

        return finalLens;
    };
    const lens = getLens();

    const getFNumber = () => {
        const isWideLens = lens.includes("14mm") || lens.includes("24mm");
        const isTeleLens = lens.includes("85mm") || lens.includes("100mm");
        const isCloseUp = framingStyle.includes("Face") || framingStyle.includes("Detail");

        // 1. 기본 매핑 (Baseline)
        let fValue = 4.0; // Selective의 기본값으로 활용
        if (focusDepth === "Shallow") fValue = 2.8;
        if (focusDepth === "Deep") fValue = 11.0;

        // 2. 렌즈 미리수(mm)에 따른 미세 조정
        if (focusDepth === "Shallow") {
            if (isWideLens) {
                // 광각에서 아웃포커싱을 주려면 조리개를 극한으로 열어야 함
                fValue = 1.4;
            } else if (isTeleLens) {
                // 망원은 기본적으로 심도가 얕으므로 너무 날아가지 않게 2.8 유지
                fValue = 2.8;
            } else {
                fValue = 1.8; // 표준(35mm, 50mm) 렌즈용
            }
        }

        // 3. 거리(Distance)에 따른 안전장치 (Close-up 방어)
        if (isCloseUp && focusDepth === "Shallow") {
            // 초근접 촬영에서 f/1.4~1.8은 초점 영역이 너무 좁음. f/4.0 정도로 조여서 디테일 확보.
            fValue = 4.0;
        }

        // 4. 노출 환경(exposureVibe) 반영 (옵션)
        if (masterStyleInfo.optics.exposureVibe === "Low-Key" && focusDepth === "Deep") {
            // 어두운 곳에서 억지로 Deep Focus(f/11)를 잡으면 노이즈가 심해짐. 살짝 타협(f/8.0).
            fValue = 8.0;
        }

        return `f/${fValue.toFixed(1)}`;
    };
    const fNumber = getFNumber();

    const getISO = () => {
        // 1. 기본값 설정 (MasterStyleInfo에서 가져오되 없으면 100)
        let iso = masterStyleInfo.optics.defaultISO || 100;

        // fNumber에서 숫자만 추출 (예: "f/11.0" -> 11.0)
        const fValue = parseFloat(fNumber.replace("f/", ""));

        // 2. [변수 1] exposureVibe에 따른 기본 배수 적용
        const vibeMultiplier = {
            "Low-Key": 4.0,   // 어두운 분위기: 빛을 더 민감하게 (ISO 증가)
            "Natural": 1.0,   // 표준
            "High-Key": 0.5   // 밝은 분위기: 빛을 덜 민감하게 (ISO 감소)
        };
        iso *= (vibeMultiplier[exposureVibe] || 1.0);

        // 3. [변수 2] fNumber에 따른 광량 보상 (Reciprocity)
        // 조리개를 많이 조였을 경우(f/8.0 이상) ISO를 높여 노출 보정
        if (fValue >= 8.0) {
            iso *= 2.0;
        }

        // 4. [변수 3] grainLevel에 따른 질감 보정
        // 거친 질감이 필요하면 ISO를 더 높여서 입자감(Noise/Grain) 유도
        if (grainLevel === "Gritty") {
            iso *= 1.5;
        } else if (grainLevel === "Clean") {
            iso *= 0.8; // 아주 깨끗한 샷은 ISO를 최소화
        }

        // 5. [안전장치] AI 이미지 붕괴 방지를 위한 Clamp
        // 최소 100에서 최대 1600 사이로 제한 (800~1600 사이가 시네마틱한 입자감이 가장 예쁨)
        return Math.min(Math.max(Math.round(iso), 100), 1600);
    };

    const getComposition = () => {
        const unifiedCompositionMap = {
            "Horizontal": {
                "Symmetry": "vanishing point center",
                "Balance": "rule of thirds",
                "Strength": "strong horizontal lines",
                "Action": "dynamic off-center",
                "Motion": "S-curve through the horizon",
                "Depth": "leading lines toward the horizon",
                "Minimalism": "minimalist negative space"
            },
            "Vertical": {
                "Symmetry": "centered vertical symmetry",
                "Balance": "vertical rule of thirds",
                "Strength": "strong verticals",
                "Action": "steep diagonal tension",
                "Motion": "vertical S-curve",
                "Depth": "low-to-high leading lines",
                "Minimalism": "vertical minimalist negative space"
            },
            "Square": {
                "Symmetry": "central symmetry",
                "Balance": "rule of thirds",
                "Strength": "centered framing",
                "Action": "dynamic off-center",
                "Motion": "circular arrangement",
                "Depth": "centered framing",
                "Minimalism": "minimalist negative space"
            }
        };
        return unifiedCompositionMap[canvasType][technicalIntent.compositionIntent] || "rule of thirds";
    };

    const getStyle = () => {
        const textureDetail = masterStyleInfo.fidelity.textureDetail;

        return definedStyle[canvasType](textureDetail, grainLevel);
    }

    const getEffects = () => {
        return [
            ...definedEffects.grain[grainLevel],
            ...definedEffects.canvas[canvasType],
            ...definedEffects.base,
        ]
    }

    const effects = getEffects();

    return {
        style: getStyle(),
        camera: {
            angle: getAngle(),
            distance: distance,
            focus: focus,
            lens: lens,
            fNumber: fNumber,
            ISO: getISO(),
        },
        composition: getComposition(),
        effects: effects.filter((effect) => {
            return !(focus === "deep focus" && (effect.includes("bokeh") || effect.includes("blur")));
        }),
    }
}

export function assembleEnvironmentalAndAtmosphereSentence(
    environmentalAndAtmosphereOptions: Omit<FluxPrompt, 'camera' | 'style' | 'effects'>,
) {
    const { subjects, scene, background, composition, mood, lighting, color_palette } = environmentalAndAtmosphereOptions;

    // --- UNIT 4 - Sentence 2: Environment & Atmosphere ---
    const hexPalette = `(${color_palette.join(', ')})`;
    const s2Connector = subjects.length > 0 ? `depicting ${scene} with a` : `arranged in a`;
    // 문장 시작은 대문자로 (Unit 4 준수)
    const environmentalAndAtmosphereSentence = `the scene is set in ${background}, ${s2Connector} ${composition} composition, where the atmosphere is ${mood}, illuminated by ${lighting} and a color palette of ${hexPalette}`;

    return environmentalAndAtmosphereSentence
        .replaceAll(".,", ",")
        .replaceAll("  ", " ");
}

export function assembleOpticalAndTechnicalSentence(
    opticalAndTechnicalOptions: Omit<FluxPrompt, 'scene' | 'subjects' | 'color_palette' | 'composition' | 'lighting' | 'mood' | 'background'>,
    canvasType: 'Vertical' | 'Horizontal' | 'Square' = 'Vertical',
) {
    const { camera, style, effects } = opticalAndTechnicalOptions;

    const formatList = (list: string[]) => {
        if (!list || list.length === 0) return "";
        if (list.length === 1) return list[0];
        return `${list.slice(0, -1).join(", ")}, and ${list.slice(-1)}`;
    };

    // --- UNIT 4 - Sentence 3: Technical Specifications ---
    let safeStyle = style;

    if (canvasType === 'Vertical' && style.toLowerCase().includes("cinematic")) {
        safeStyle = style.replace(/cinematic/gi, "high-fidelity RAW portrait photography");
    }
    const opticalAndTechnicalSentence = `rendered in ${safeStyle}, captured with a ${camera.lens} lens at ${camera.fNumber} for ${camera.focus} and ISO ${camera.ISO}, featuring ${formatList(effects)}.`;

    return opticalAndTechnicalSentence
        .replaceAll(".,", ",")
        .replaceAll("  ", " ");
}

export function convertImageGenPromptToSentence(data: FluxPrompt): string {
    const segments: string[] = [];

    // 1. Core Style & Scene (가장 중요)
    segments.push(`Style: ${data.style}.`);
    segments.push(`Scene: ${data.scene}`); // scene은 보통 문장형이라 마침표 생략 가능성 고려

    // 2. Mood & Atmosphere
    segments.push(`Mood: ${data.mood}`);
    segments.push(`Lighting: ${data.lighting}`);
    segments.push(`Background: ${data.background}`);

    // 3. Subjects (가장 용량 많이 차지함 -> 효율적 압축)
    if (data.subjects && data.subjects.length > 0) {
        const subjectDescriptions = data.subjects.map((subj) => {
            // Description에 이미 외형 묘사가 풍부하므로, 중복되는 clothes/type은 제외하고
            // 포즈와 위치정보만 보강해줍니다.
            let desc = `${subj.description}`;

            // 포즈가 비어있지 않으면 추가
            if (subj.pose) desc += `, acting: ${subj.pose}`;
            // 위치가 비어있지 않으면 추가
            if (subj.position) desc += `, placed at ${subj.position}`;

            return desc;
        });
        segments.push(subjectDescriptions.join(" / "));
    }

    // 4. Technical Details (Camera, Effects)
    const cameraDetails = [
        data.camera.lens,
        data.camera.angle,
        data.camera.distance,
        data.camera.focus,
        `f/${data.camera.fNumber}`,
        `ISO ${data.camera.ISO}`
    ].filter(Boolean).join(", ");

    segments.push(`Camera settings: ${cameraDetails}.`);
    segments.push(`Effects: ${data.effects.join(", ")}.`);
    segments.push(`Composition: ${data.composition}.`);

    // 5. Color Palette (16진수 코드는 이미지 생성기가 잘 못 알아먹을 때가 많아 텍스트화하면 좋지만, 일단 그대로 둠)
    // (Hex 코드는 글자수를 적게 차지하므로 유지)
    if (data.color_palette && data.color_palette.length > 0) {
        segments.push(`Palette: ${data.color_palette.join(", ")}.`);
    }

    // 전체 조립 (공백 하나로 연결)
    return segments.join(" ");
}