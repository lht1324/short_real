import { CaptionData, CaptionConfigState } from '@/components/page/workspace/editor/WorkspaceEditorPageClient';

/**
 * CaptionData와 CaptionConfigState를 ASS 파일 문자열로 변환
 */
export function generateASSContent(
    captionDataList: CaptionData[],
    captionConfig: CaptionConfigState,
    videoHeight: number
): string {
    // 색상을 BGR 포맷으로 변환 (ASS 포맷 요구사항)
    const hexToASSColor = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `&H00${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}`;
    };

    const videoWidth = Math.round(videoHeight * 9 / 16);

    // 폰트 사이즈 그대로 사용
    const fontSize = Math.round(captionConfig.fontSize * 0.7);

    // VideoPlayerPanel과 동일한 Y 위치 계산
    const estimatedCaptionHeight = Math.round(fontSize * 1.2);
    const lineAreaHeight = 24;
    const captionAreaHeight = lineAreaHeight + estimatedCaptionHeight * 2 + lineAreaHeight;

    // top 기준 픽셀 위치
    const captionAreaTop = Math.round((captionConfig.captionPosition / 100) * (videoHeight - captionAreaHeight));

    // ASS MarginV: 기존 위치에서 11px 아래로
    const captionAreaDashedBorderHeight = 2;
    const lineAreaVerticalPadding = (lineAreaHeight - captionAreaDashedBorderHeight) / 2; // 11
    // const marginV = captionAreaTop + lineAreaHeight - lineAreaVerticalPadding;
    const marginV = captionAreaTop + lineAreaHeight;

    // Active Outline thickness
    const activeOutline = captionConfig.isActiveOutlineEnabled
        ? Math.round((captionConfig.activeOutlineThickness / 100) * fontSize * 0.15)
        : 0;

    // Inactive Outline thickness
    const inactiveOutline = captionConfig.isInactiveOutlineEnabled
        ? Math.round((captionConfig.inactiveOutlineThickness / 100) * fontSize * 0.15)
        : 0;

    // Active Shadow thickness (isShadowEnabled 체크)
    const activeShadow = captionConfig.isShadowEnabled
        ? Math.round((captionConfig.shadowThickness / 100) * fontSize * 0.2)
        : 0;

    // Inactive Shadow thickness (isShadowEnabled 체크)
    const inactiveShadow = captionConfig.isShadowEnabled
        ? Math.round((captionConfig.shadowThickness / 100) * fontSize * 0.2)
        : 0;

    // Font info를 JSON으로 직렬화 (주석으로 포함)
    const fontInfo = {
        fontFamily: captionConfig.fontFamilyName,
        fontSize: fontSize,
        weights: [captionConfig.fontWeight]
    };

    // ASS 헤더 (FONT_INFO 주석 추가)
    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
; FONT_INFO: ${JSON.stringify(fontInfo)}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Active,${captionConfig.fontFamilyName},${fontSize},${hexToASSColor(captionConfig.activeColor)},&H000000FF,${hexToASSColor(captionConfig.activeOutlineColor)},&H00000000,${captionConfig.fontWeight >= 700 ? 1 : 0},0,0,0,100,100,0,0,1,${activeOutline},${activeShadow},8,10,10,${marginV},1
Style: Inactive,${captionConfig.fontFamilyName},${fontSize},${hexToASSColor(captionConfig.inactiveColor)},&H000000FF,${hexToASSColor(captionConfig.inactiveOutlineColor)},&H00000000,${captionConfig.fontWeight >= 700 ? 1 : 0},0,0,0,100,100,0,0,1,${inactiveOutline},${inactiveShadow},8,10,10,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

    // 시간 포맷 변환
    const formatTime = (seconds: number): string => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const cs = Math.floor((seconds % 1) * 100);
        return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${cs.toString().padStart(2, '0')}`;
    };

    // 두 단어씩 묶어서 Dialogue 생성
    const dialogues: string[] = [];
    captionDataList.forEach(caption => {
        const segments = caption.subtitleSegmentationList;

        for (let i = 0; i < segments.length; i += 2) {
            const firstWord = segments[i];
            const secondWord = segments[i + 1];

            if (secondWord) {
                const firstActiveStart = formatTime(firstWord.startSec);
                const firstActiveEnd = formatTime(firstWord.endSec);
                dialogues.push(
                    `Dialogue: 0,${firstActiveStart},${firstActiveEnd},Active,,0,0,0,,{\\c${hexToASSColor(captionConfig.activeColor)}}${firstWord.word} {\\c${hexToASSColor(captionConfig.inactiveColor)}}${secondWord.word}`
                );

                const secondActiveStart = formatTime(secondWord.startSec);
                const secondActiveEnd = formatTime(secondWord.endSec);
                dialogues.push(
                    `Dialogue: 0,${secondActiveStart},${secondActiveEnd},Active,,0,0,0,,{\\c${hexToASSColor(captionConfig.inactiveColor)}}${firstWord.word} {\\c${hexToASSColor(captionConfig.activeColor)}}${secondWord.word}`
                );
            } else {
                const start = formatTime(firstWord.startSec);
                const end = formatTime(firstWord.endSec);
                dialogues.push(`Dialogue: 0,${start},${end},Active,,0,0,0,,${firstWord.word}`);
            }
        }
    });

    return header + dialogues.join('\n');
}
