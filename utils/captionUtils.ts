import { CaptionData, CaptionConfigState } from '@/components/page/workspace/editor/WorkspaceEditorPageClient';

/**
 * CaptionData와 CaptionConfigState를 ASS 파일 문자열로 변환
 */
export function generateASSContent(
    captionDataList: CaptionData[],
    captionConfig: CaptionConfigState,
    videoWidth: number,
    videoHeight: number,
    captionAreaTop: number,
    captionAreaVerticalPadding: number,
    captionOneLineHeight: number,
): string {
    // 색상을 BGR 포맷으로 변환 (ASS 포맷 요구사항)
    const hexToASSColor = (hex: string): string => {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `&H00${b.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${r.toString(16).padStart(2, '0').toUpperCase()}`;
    };

    // ASS는 lineHeight을 폰트 사이즈로 사용함
    const fontSize = captionOneLineHeight;

    // VideoPlayerPanel과 동일한 Y 위치 계산
    const marginV = captionAreaTop + captionAreaVerticalPadding;

    // Active Outline thickness
    const activeOutline = captionConfig.isActiveOutlineEnabled
        ? Math.round((captionConfig.activeOutlineThickness / 100) * 12)
        : 0;

    // Inactive Outline thickness
    const inactiveOutline = captionConfig.isInactiveOutlineEnabled
        ? Math.round((captionConfig.inactiveOutlineThickness / 100) * 12)
        : 0;

    // Font info를 JSON으로 직렬화 (주석으로 포함)
    const fontInfo = {
        fontFamily: captionConfig.fontFamilyName,
        fontSize: fontSize,
        weights: [captionConfig.fontWeight]
    };

    const fontWeightName = getStandardFontWeightNameByValue(captionConfig.fontWeight);
    const fontName = !(fontWeightName === "Regular" || fontWeightName === "Bold")
        ? `${captionConfig.fontFamilyName} ${fontWeightName}`
        : `${captionConfig.fontFamilyName}`;

    // ASS 헤더 - 단일 Default 스타일 (공통 요소만)
    const header = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
; FONT_INFO: ${JSON.stringify(fontInfo)}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontName},${fontSize},&H00FFFFFF,&H000000FF,&H00000000,&H00000000,${fontWeightName === "Bold" ? 1 : 0},0,0,0,100,100,0,0,1,0,0,8,10,10,${marginV},1

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

    // 두 단어씩 묶어서 Dialogue 생성 (\bord 오버라이드 사용)
    const dialogues: string[] = [];
    captionDataList.forEach(caption => {
        const segments = caption.subtitleSegmentationList;

        for (let i = 0; i < segments.length; i += 2) {
            const firstWord = segments[i];
            const secondWord = segments[i + 1];

            if (secondWord) {
                // firstWord Active 구간
                const firstActiveStart = formatTime(firstWord.startSec);
                const firstActiveEnd = formatTime(firstWord.endSec);

                dialogues.push(
                    `Dialogue: 0,${firstActiveStart},${firstActiveEnd},Default,,0,0,0,,{\\bord${activeOutline}\\c${hexToASSColor(captionConfig.activeColor)}\\3c${hexToASSColor(captionConfig.activeOutlineColor)}}${firstWord.word} {\\bord${inactiveOutline}\\c${hexToASSColor(captionConfig.inactiveColor)}\\3c${hexToASSColor(captionConfig.inactiveOutlineColor)}}${secondWord.word}`
                );

                // secondWord Active 구간
                const secondActiveStart = formatTime(secondWord.startSec);
                const secondActiveEnd = formatTime(secondWord.endSec);

                dialogues.push(
                    `Dialogue: 0,${secondActiveStart},${secondActiveEnd},Default,,0,0,0,,{\\bord${inactiveOutline}\\c${hexToASSColor(captionConfig.inactiveColor)}\\3c${hexToASSColor(captionConfig.inactiveOutlineColor)}}${firstWord.word} {\\bord${activeOutline}\\c${hexToASSColor(captionConfig.activeColor)}\\3c${hexToASSColor(captionConfig.activeOutlineColor)}}${secondWord.word}`
                );
            } else {
                // 단어가 하나만 있는 경우
                const start = formatTime(firstWord.startSec);
                const end = formatTime(firstWord.endSec);
                dialogues.push(`Dialogue: 0,${start},${end},Default,,0,0,0,,{\\bord${activeOutline}\\c${hexToASSColor(captionConfig.activeColor)}\\3c${hexToASSColor(captionConfig.activeOutlineColor)}}${firstWord.word}`);
            }
        }
    });

    return header + dialogues.join('\n');
}

function getStandardFontWeightNameByValue(weightValue: number) {
    switch (weightValue) {
        case 100: return "Thin";
        case 200: return "ExtraLight";
        case 300: return "Light";
        case 400: return "Regular";
        case 500: return "Medium";
        case 600: return "SemiBold";
        case 700: return "Bold";
        case 800: return "ExtraBold";
        case 900: return "Black";
        default: return "Regular";
    }
}
