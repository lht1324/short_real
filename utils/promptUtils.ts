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
    if (intensityTier === "VERY_HIGH" && (yCandidate !== "Pedestal Down" && yCandidate !== "Pedestal Up") && (zCandidate === "Zoom In" || zCandidate === "Zoom Out")) {
        if (narrativeVibe === "VERTIGO" || narrativeVibe === "SHOCK") {
            candidateString = isXCandidateSelected
                ? `Dolly Zoom and ${xCandidate}`
                : isYCandidateSelected
                    ? `Dolly Zoom and ${yCandidate}`
                    : "Dolly Zoom";
        } else {
            const upgradeValue = zCandidate === "Zoom In" ? "Crash Zoom In" : "Crash Zoom Out";

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
    ("Zoom Out" | "None" | "Zoom In")
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
            case "$+Z$": return "Zoom In"
        }
    }

    const xCandidate = getXCandidate();
    const yCandidate = getYCandidate();
    const zCandidate = getZCandidate();

    return [xCandidate, yCandidate, zCandidate];
}