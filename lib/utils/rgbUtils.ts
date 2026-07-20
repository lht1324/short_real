export function getContrastColor(hexColor: string): string {
    // HEX를 RGB로 변환
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // 상대적 휘도 계산 (WCAG 공식)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // 임계값 0.5 기준으로 결정
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}