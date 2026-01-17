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