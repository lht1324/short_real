export interface TechnicalIntent {
    angleIntent: "Default/Neutral" | "Heroic/Scale" | "Extreme Power/Ground-level" | "Dialogue/Interaction" | "Surveillance/Map-view" | "Stylized/Technical";
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

            const demoParts = entity.demographics.split(', ');
            const demographicAnchor = `${demoParts[0]} ${demoParts[1]}`;

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
    const sentence3 = `rendered in ${safeStyle}, this image is captured with a ${camera.lens} lens at ${camera.fNumber} for ${camera.focus} and ISO ${camera.ISO}, featuring ${formatList(effects)}`;

    // 최종 결과: 3개의 문장을 공백 한 칸씩 띄워서 합침
    return `${sentence1}, ${sentence2}, ${sentence3}.`.replaceAll(".,", ",");
}

export function composeOpticalAndTechnicalOption(
    technicalIntent: TechnicalIntent,
    masterStyleInfo: MasterStyleInfo,
    entityManifestList: Entity[],
    aspectRatio: { width: number; height: number; } = { width: 9, height: 16 }
) {
    const { width, height } = aspectRatio;
    const canvasType: "Horizontal" | "Vertical" | "Square" = width > height
        ? "Horizontal"
        : width < height
            ? "Vertical"
            : "Square";
    const framingStyle = masterStyleInfo.composition.framingStyle;
    const focusDepth = masterStyleInfo.optics.focusDepth;

    const {
        angleIntent
    } = technicalIntent;

    const getAngle = () => {
        // bird's eye
        const isEveryEntityAeroDynamics = entityManifestList.every((entity) => {
            return entity.physics_profile?.action_context.includes('aerodynamics') === true;
        });

        switch (canvasType) {
            case "Horizontal": {
                switch (angleIntent) {
                    case "Default/Neutral": return "eye level"
                    case "Heroic/Scale": return "low angle"
                    case "Extreme Power/Ground-level": return "worm's-eye"
                    case "Dialogue/Interaction": return "over-the-shoulder"
                    case "Surveillance/Map-view": return isEveryEntityAeroDynamics
                        ? "bird's-eye"
                        : "high angle shot looking down"
                    case "Stylized/Technical": return "isometric"
                }
            }
            case "Vertical": {
                switch (angleIntent) {
                    case "Default/Neutral": return "eye level"
                    case "Heroic/Scale":
                    case "Extreme Power/Ground-level": return "low angle"
                    case "Dialogue/Interaction": return "over-the-shoulder"
                    case "Surveillance/Map-view": return "high angle shot looking down"
                    case "Stylized/Technical": return "slightly low"
                }
            }
            case "Square": {
                switch (angleIntent) {
                    case "Default/Neutral":
                    case "Dialogue/Interaction":
                    case "Stylized/Technical": return "eye level"
                    case "Heroic/Scale": return "slightly low"
                    case "Extreme Power/Ground-level": return "low angle"
                    case "Surveillance/Map-view": return "high angle"
                }
            }
        }
    }

    const getDistance = () => {
        // framingStyle enum으로 교체 후 default 제거
        switch (canvasType) {
            case "Horizontal": {
                switch (framingStyle) {
                    case "Extreme Long/Wide": return "extreme wide shot"
                    case "Long/Wide": return "wide shot"
                    case "Full/Medium Wide": return "medium wide shot"
                    case "Medium/Waist": return "medium shot"
                    case "Bust/Chest": return "medium close-up"
                    case "Face/Detail": return "close-up"
                    default: return ""
                }
            }
            case "Vertical": {
                switch (framingStyle) {
                    case "Extreme Long/Wide": return "vertical panoramic environmental shot"
                    case "Long/Wide": return "full-length vertical capture"
                    case "Full/Medium Wide": return "full-body shot"
                    case "Medium/Waist": return "medium full shot"
                    case "Bust/Chest": return "medium close-up"
                    case "Face/Detail": return "close-up"
                    default: return ""
                }
            }
            case "Square": {
                switch (framingStyle) {
                    case "Extreme Long/Wide": return "wide-angle square shot"
                    case "Long/Wide": return "full-frame environmental shot"
                    case "Full/Medium Wide": return "medium-wide centered shot"
                    case "Medium/Waist": return "medium shot"
                    case "Bust/Chest": return "medium close-up"
                    case "Face/Detail": return "close-up"
                    default: return ""
                }
            }
        }
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
    // angle
    // "Default/Neutral" | "Heroic/Scale" | "Extreme Power/Ground-level" | "Dialogue/Interaction" | "Surveillance/Map-view" | "Stylized/Technical"
    // distance
    // "Extreme Long/Wide" | "Long/Wide" | "Full/Medium Wide" | "Medium/Waist" | "Bust/Chest" | "Face/Detail"

    /**
     *     <unit_3_optical_and_technical>
     *       **UNIT 3: OPTICAL & TECHNICAL REASONING**
     *       2. **[Field: 'camera', 'composition'] - Technical Mapping Logic**
     *         - **Action**: Map <master_style_guide> specs to the JSON structure.
     *         - **Rule 1 (Strict Selection)**: For fields with a provided **[List]**, you MUST select exactly ONE value from that list.
     *         - **Rule 2 (Formatted Output)**: Follow the specified string/number format strictly.
     *         - **Field: 'camera'**:
     *           - **'lens' [Context-Aware Mapping]**:
     *             - **Action**: Map `<master_style_guide>.<optics>.lensType` to a specific focal length (mm) optimized for the **[Canvas_Type]** to prevent subject distortion and aspect-ratio artifacts.
     *             * **[Aspect-Ratio Translation Table]**:
     *               - **IF [Canvas_Type] is "Horizontal"**:
     *                   * "Wide-Angle" -> **"14mm"** or **"24mm"**
     *                   * "Spherical" -> **"35mm"** or **"50mm"**
     *                   * "Anamorphic" -> **"70mm"** or **"85mm"**
     *                   * "Macro" -> **"85mm macro"**
     *               - **IF [Canvas_Type] is "Vertical"**:
     *                   * **CRITICAL**: Avoid ultra-wide and anamorphic labels to prevent letterboxing and limb stretching.
     *                   * "Wide-Angle" -> **"35mm"** (Moderate wide-angle that preserves human proportions)
     *                   * "Spherical" -> **"50mm"**
     *                   * "Anamorphic" -> **"50mm"** or **"85mm"** (Note: Strictly use spherical focal lengths to block 'Cinemascope' artifacts)
     *                   * "Macro" -> **"85mm"**
     *               - **IF [Canvas_Type] is "Square"**:
     *                   * "Wide-Angle" -> **"24mm"**
     *                   * "Spherical" -> **"50mm"**
     *                   * "Anamorphic" -> **"50mm"**
     *                   * "Macro" -> **"85mm"**
     *             - **Constraint**: Do not output the source intent labels (e.g., "Anamorphic"). Output ONLY the **Final mm Value** (e.g., "50mm") into `image_gen_prompt.camera.lens` and `image_gen_prompt_sentence`.
     *           - **'fNumber' [Format: string]**:
     *             * **Action**: Define the aperture value as a string (Pattern: "f/X.X").
     *             * *Mapping Guide (Based on <master_style_guide>.<optics>.`focusDepth`)*:
     *               * If "Shallow" -> Select a wide aperture (**"f/1.2"**, **"f/1.8"**, or **"f/2.8"**).
     *               * If "Deep" -> Select a narrow aperture (**"f/8.0"** or **"f/11.0"**).
     *               * If "Selective" -> Select **"f/4.0"**.
     *           - **'ISO' [Format: number]**:
     *             * **Action**: Use <master_style_guide>.<optics>.`defaultISO` as the baseline.
     *             * **Adjustment (Based on <master_style_guide>.<optics>.`exposureVibe`)**:
     *               - If "Low-Key", you may increase it by up to 1 stop from default (max 1600).
     *               - If "High-Key", you may decrease it by up to 1 stop from default (min 100).
     *               - If "Natural", Strictly adhere to <master_style_guide>.<optics>.`defaultISO` to maintain a balanced, unmanipulated sensor response that reflects standard lighting conditions.
     *             * **Constraint**: Output exactly one integer.
     *         - **Field: 'composition' [Context-Aware Mapping]**:
     *           - **Action**: Map <master_style_guide>.<composition> and Narrative Tone into a cinematic composition technique optimized for the **[Canvas_Type]** to ensure balanced spatial distribution and narrative flow.
     *           * **[Aspect-Ratio Translation Table]**:
     *             - **IF [Canvas_Type] is "Horizontal"**:
     *                 * "Symmetry/Perspective" -> **"vanishing point center"** (Maximizes depth in wide frames)
     *                 * "Natural Balance" -> **"rule of thirds"**
     *                 * "Strength/Architecture" -> **"strong horizontal lines"**
     *                 * "Action/High Energy" -> **"diagonal energy"** or **"dynamic off-center"**
     *                 * "Complex Motion" -> **"S-curve through the horizon"**
     *                 * "Depth/Immersion" -> **"leading lines toward the horizon"**
     *                 * "Solitude/Focus" -> **"minimalist negative space"**
     *             - **IF [Canvas_Type] is "Vertical"**:
     *                 * "Symmetry/Perspective" -> **"centered vertical symmetry"**
     *                 * "Natural Balance" -> **"vertical rule of thirds"**
     *                 * "Strength/Architecture" -> **"strong verticals"** (Emphasizes height and scale)
     *                 * "Action/High Energy" -> **"steep diagonal tension"**
     *                 * "Complex Motion" -> **"vertical S-curve"** or **"triangular arrangement"**
     *                 * "Depth/Immersion" -> **"low-to-high leading lines"**
     *                 * "Aesthetic Perfection" -> **"vertical golden spiral"**
     *                 * "Solitude/Focus" -> **"vertical minimalist negative space"**
     *             - **IF [Canvas_Type] is "Square"**:
     *                 * "Symmetry/Perspective" -> **"central symmetry"**
     *                 * "Natural Balance" -> **"rule of thirds"**
     *                 * "Focus & Flow" -> **"circular arrangement"** or **"centered framing"**
     *                 * "Isolation" -> **"minimalist negative space"**
     *           - **Constraint**: Do not output the source intent labels. Output ONLY the **Final Cinematic Term** into `image_gen_prompt.composition` and `image_gen_prompt_sentence`.
     *         **[Execution Rule]**:
     *         - Accuracy and adherence to the predefined pick-lists are mandatory to pass system validation.
     *       3. **[Field: 'style', 'lighting', 'mood'] - Atmospheric Anchoring**
     *         - **Action**: Synthesize raw technical data into descriptive strings while maintaining cross-reference stability with the 'camera' object.
     *         - **Field: 'style' [Context-Aware Mapping]**:
     *           - **Action**: Synthesize a technical rendering style by combining <master_style_guide>.<fidelity>.`textureDetail` and <master_style_guide>.<fidelity>.`grainLevel`, filtered through **[Canvas_Type]**.
     *           - **Constraint**: Strictly exclude `resolutionTarget` (e.g., 4K, 8K) and `era` from this field to prevent technical artifacts and color bias.
     *           * **[Aspect-Ratio Translation Table]**:
     *             - **IF [Canvas_Type] is "Horizontal"**:
     *               * **Mapping**: "Professional cinematic RAW aesthetic with [`textureDetail`] detail and [`grainLevel`] grain."
     *               * **Note**: Maintains high-end cinematic texture for 16:9 frames.
     *             - **IF [Canvas_Type] is "Vertical"**:
     *               * **Mapping**: "High-fidelity RAW portrait photography with [`textureDetail`] surface detail and [`grainLevel`] organic texture."
     *               * **CRITICAL**: Use "Portrait photography" to align with vertical datasets. Strictly avoid "Cinematic" or "4K" to prevent letterboxing.
     *             - **IF [Canvas_Type] is "Square"**:
     *               * **Mapping**: "Balanced RAW texture style with [`textureDetail`] and [`grainLevel`] definition."
     *           - **Constraint**: Output ONLY the **Final Style String** into `image_gen_prompt.style` and `image_gen_prompt_sentence`.
     *         - **Field: 'lighting' [Format: string]**:
     *           * **Source**: <master_style_guide>.<color_and_light>.`lightingSetup` and <master_style_guide>.<optics>.`exposureVibe`.
     *           * **Mapping Guide**:
     *             - Use `lightingSetup` as the primary technique (e.g., "Chiaroscuro") and `exposureVibe` as the intensity/brightness level.
     *           * **Constraint**: If `exposureVibe` is "Low-Key", description must emphasize deep shadows and high contrast.
     *         - **Field: 'mood' [Format: string]**:
     *           * **Source**: <video_context>.<video_title> (High-level theme) and <master_style_guide>.<color_and_light>.`tonality`.
     *           * **Mapping Guide**:
     *             - **Infer** the emotional atmosphere by combining the narrative theme (from title) with the color theory of `tonality`.
     *             - *Example*: If Title is "Last Stand" and Tonality is "Warm earth tones" -> "Exhilarating yet somber atmosphere with a sense of grounded grit."
     *           * **Constraint**: Do NOT include camera technicals (ISO, lens, etc.) to prevent data conflict.
     *       - **[Field: 'effects'] - Context-Aware Artifact Management**
     *         - **Action**: Generate a flat array of technical keywords based on **[Canvas_Type]**, ensuring zero conflict with aspect ratio.
     *         - **Source 1: <master_style_guide>.<fidelity>.`grainLevel`** (Grain consistency)
     *           - [No Change]: "Gritty" -> ["heavy film grain"], "Filmic" -> ["subtle film grain"], "Clean" -> ["clean digital sensor finish"].
     *         - **Source 2: <master_style_guide>.<fidelity>.`resolutionTarget`** (Ratio-Safe Fidelity)
     *           * **IF [Canvas_Type] is "Horizontal"**:
     *             - Use numeric targets: ["4K UHD", "8K resolution", "ultra-sharp details"].
     *           * **IF [Canvas_Type] is "Vertical" or "Square"**:
     *             - **CRITICAL**: Use descriptive targets ONLY: ["highly defined textures", "hyper-detailed rendering", "extreme visual fidelity"]. (Prevents letterboxing by avoiding '4K/8K' tokens).
     *         - **Source 3: <master_style_guide>.<optics>.`lensType`** (Optical Alignment)
     *           * **IF [Canvas_Type] is "Horizontal"**:
     *             - If "Anamorphic" -> ["oval bokeh", "anamorphic lens flares", "horizontal light streaks"].
     *             - If "Wide-Angle" -> ["slight barrel distortion", "expansive field of view"].
     *           * **IF [Canvas_Type] is "Vertical"**:
     *             - If "Anamorphic" -> ["oval bokeh", "vertical light leaks", "soft edge bloom"]. (Note: Strips horizontal-specific flares).
     *             - If "Wide-Angle" -> ["sharp focus edges", "unfiltered clarity"]. (Note: Removes barrel distortion to prevent limb stretching).
     *         - **[Final Integration Rule]**:
     *           - **MUST**: Collect all triggered strings from Source 1, 2, and 3.
     *           - **MUST**: Merge them into one single, flat array: `["source1-effect-1", "source1-effect2", "source1-effect-3", ... , source3-effect-n]`.
     *           - **Constraint**: If `camera.focus` is "deep focus", discard any "bokeh" or "blur" related keywords from the final array.
     *         **[Execution Rule]**:
     *           - Combine all triggered keywords into a single flat array.
     *           - If focus is "deep focus", remove any "bokeh" or "blur" keywords from this array.
     *       **[Execution Rule]**:
     *       - All camera values must be physically plausible and consistent with the MasterStyle standard.
     *     </unit_3_optical_and_technical>
     */
}