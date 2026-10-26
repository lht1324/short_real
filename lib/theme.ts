export const darkPalette = {
    canvas: '#0A0A0B',
    surface: '#131316',
    hairline: '#26262B',
    text1: '#F4F4F5',
    text2: '#A1A1AA',
    accent: '#EF2B70',
} as const;

export const lightPalette = {
    canvas: '#F6F3F7',
    surface: '#FFFFFF',
    hairline: '#E7E2E8',
    text1: '#170C45',
    text2: '#6B6377',
    accent: '#EF2B70',
} as const;

export type ThemePalette = typeof darkPalette;
