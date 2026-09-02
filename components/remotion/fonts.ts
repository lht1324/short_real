import {loadFont as loadFont_AlfaSlabOne} from '@remotion/google-fonts/AlfaSlabOne';
import {loadFont as loadFont_Anton} from '@remotion/google-fonts/Anton';
import {loadFont as loadFont_Archivo} from '@remotion/google-fonts/Archivo';
import {loadFont as loadFont_ArchivoBlack} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as loadFont_Bangers} from '@remotion/google-fonts/Bangers';
import {loadFont as loadFont_BebasNeue} from '@remotion/google-fonts/BebasNeue';
import {loadFont as loadFont_BricolageGrotesque} from '@remotion/google-fonts/BricolageGrotesque';
import {loadFont as loadFont_Bungee} from '@remotion/google-fonts/Bungee';
import {loadFont as loadFont_Caveat} from '@remotion/google-fonts/Caveat';
import {loadFont as loadFont_CrimsonText} from '@remotion/google-fonts/CrimsonText';
import {loadFont as loadFont_DancingScript} from '@remotion/google-fonts/DancingScript';
import {loadFont as loadFont_DMSans} from '@remotion/google-fonts/DMSans';
import {loadFont as loadFont_DMSerifDisplay} from '@remotion/google-fonts/DMSerifDisplay';
import {loadFont as loadFont_Figtree} from '@remotion/google-fonts/Figtree';
import {loadFont as loadFont_FiraSans} from '@remotion/google-fonts/FiraSans';
import {loadFont as loadFont_Fraunces} from '@remotion/google-fonts/Fraunces';
import {loadFont as loadFont_Fredoka} from '@remotion/google-fonts/Fredoka';
import {loadFont as loadFont_Inter} from '@remotion/google-fonts/Inter';
import {loadFont as loadFont_JetBrainsMono} from '@remotion/google-fonts/JetBrainsMono';
import {loadFont as loadFont_Lato} from '@remotion/google-fonts/Lato';
import {loadFont as loadFont_Lexend} from '@remotion/google-fonts/Lexend';
import {loadFont as loadFont_LilitaOne} from '@remotion/google-fonts/LilitaOne';
import {loadFont as loadFont_LuckiestGuy} from '@remotion/google-fonts/LuckiestGuy';
import {loadFont as loadFont_Manrope} from '@remotion/google-fonts/Manrope';
import {loadFont as loadFont_Merriweather} from '@remotion/google-fonts/Merriweather';
import {loadFont as loadFont_Montserrat} from '@remotion/google-fonts/Montserrat';
import {loadFont as loadFont_Nunito} from '@remotion/google-fonts/Nunito';
import {loadFont as loadFont_OpenSans} from '@remotion/google-fonts/OpenSans';
import {loadFont as loadFont_Oswald} from '@remotion/google-fonts/Oswald';
import {loadFont as loadFont_Outfit} from '@remotion/google-fonts/Outfit';
import {loadFont as loadFont_Pacifico} from '@remotion/google-fonts/Pacifico';
import {loadFont as loadFont_PaytoneOne} from '@remotion/google-fonts/PaytoneOne';
import {loadFont as loadFont_PlayfairDisplay} from '@remotion/google-fonts/PlayfairDisplay';
import {loadFont as loadFont_PlusJakartaSans} from '@remotion/google-fonts/PlusJakartaSans';
import {loadFont as loadFont_Poppins} from '@remotion/google-fonts/Poppins';
import {loadFont as loadFont_Raleway} from '@remotion/google-fonts/Raleway';
import {loadFont as loadFont_Righteous} from '@remotion/google-fonts/Righteous';
import {loadFont as loadFont_Roboto} from '@remotion/google-fonts/Roboto';
import {loadFont as loadFont_Sora} from '@remotion/google-fonts/Sora';
import {loadFont as loadFont_SourceSans3} from '@remotion/google-fonts/SourceSans3';
import {loadFont as loadFont_SpaceGrotesk} from '@remotion/google-fonts/SpaceGrotesk';
import {loadFont as loadFont_Staatliches} from '@remotion/google-fonts/Staatliches';
import {loadFont as loadFont_Syne} from '@remotion/google-fonts/Syne';
import {loadFont as loadFont_Teko} from '@remotion/google-fonts/Teko';
import {loadFont as loadFont_Unbounded} from '@remotion/google-fonts/Unbounded';
import {loadFont as loadFont_Urbanist} from '@remotion/google-fonts/Urbanist';
import {loadFont as loadFont_WorkSans} from '@remotion/google-fonts/WorkSans';
import {loadFont as loadFont_ZillaSlab} from '@remotion/google-fonts/ZillaSlab';
import {loadFont as loadFont_Barlow} from '@remotion/google-fonts/Barlow';
import {loadFont as loadFont_BarlowCondensed} from '@remotion/google-fonts/BarlowCondensed';
import {loadFont as loadFont_FjallaOne} from '@remotion/google-fonts/FjallaOne';
import {loadFont as loadFont_PathwayGothicOne} from '@remotion/google-fonts/PathwayGothicOne';
import {loadFont as loadFont_PTSans} from '@remotion/google-fonts/PTSans';
import {loadFont as loadFont_PTSansNarrow} from '@remotion/google-fonts/PTSansNarrow';
import {loadFont as loadFont_TitilliumWeb} from '@remotion/google-fonts/TitilliumWeb';
import {loadFont as loadFont_LeagueGothic} from '@remotion/google-fonts/LeagueGothic';
import {loadFont as loadFont_LeagueSpartan} from '@remotion/google-fonts/LeagueSpartan';
import {loadFont as loadFont_RussoOne} from '@remotion/google-fonts/RussoOne';
import FONT_FAMILY_LIST from '@/lib/FontFamilyList';

type FontLoader = (...args: any[]) => {
    fontFamily: string;
    waitUntilDone: () => Promise<void>;
};

const FONT_LOADER_MAP: Record<string, FontLoader> = {
    'Alfa Slab One': loadFont_AlfaSlabOne,
    'Anton': loadFont_Anton,
    'Archivo': loadFont_Archivo,
    'Archivo Black': loadFont_ArchivoBlack,
    'Bangers': loadFont_Bangers,
    'Bebas Neue': loadFont_BebasNeue,
    'Bricolage Grotesque': loadFont_BricolageGrotesque,
    'Bungee': loadFont_Bungee,
    'Caveat': loadFont_Caveat,
    'Crimson Text': loadFont_CrimsonText,
    'Dancing Script': loadFont_DancingScript,
    'DM Sans': loadFont_DMSans,
    'DM Serif Display': loadFont_DMSerifDisplay,
    'Figtree': loadFont_Figtree,
    'Fira Sans': loadFont_FiraSans,
    'Fraunces': loadFont_Fraunces,
    'Fredoka': loadFont_Fredoka,
    'Inter': loadFont_Inter,
    'JetBrains Mono': loadFont_JetBrainsMono,
    'Lato': loadFont_Lato,
    'Lexend': loadFont_Lexend,
    'Lilita One': loadFont_LilitaOne,
    'Luckiest Guy': loadFont_LuckiestGuy,
    'Manrope': loadFont_Manrope,
    'Merriweather': loadFont_Merriweather,
    'Montserrat': loadFont_Montserrat,
    'Nunito': loadFont_Nunito,
    'Open Sans': loadFont_OpenSans,
    'Oswald': loadFont_Oswald,
    'Outfit': loadFont_Outfit,
    'Pacifico': loadFont_Pacifico,
    'Paytone One': loadFont_PaytoneOne,
    'Playfair Display': loadFont_PlayfairDisplay,
    'Plus Jakarta Sans': loadFont_PlusJakartaSans,
    'Poppins': loadFont_Poppins,
    'Raleway': loadFont_Raleway,
    'Righteous': loadFont_Righteous,
    'Roboto': loadFont_Roboto,
    'Sora': loadFont_Sora,
    'Source Sans 3': loadFont_SourceSans3,
    'Space Grotesk': loadFont_SpaceGrotesk,
    'Staatliches': loadFont_Staatliches,
    'Syne': loadFont_Syne,
    'Teko': loadFont_Teko,
    'Unbounded': loadFont_Unbounded,
    'Urbanist': loadFont_Urbanist,
    'Work Sans': loadFont_WorkSans,
    'Zilla Slab': loadFont_ZillaSlab,
    'Barlow': loadFont_Barlow,
    'Barlow Condensed': loadFont_BarlowCondensed,
    'Fjalla One': loadFont_FjallaOne,
    'Pathway Gothic One': loadFont_PathwayGothicOne,
    'PT Sans': loadFont_PTSans,
    'PT Sans Narrow': loadFont_PTSansNarrow,
    'Titillium Web': loadFont_TitilliumWeb,
    'League Gothic': loadFont_LeagueGothic,
    'League Spartan': loadFont_LeagueSpartan,
    'Russo One': loadFont_RussoOne,
};

// (fontName, weight) -> fontFamily 캐시. 동일 폰트 동일 웨이트의 중복 @font-face 주입 방지
const fontFamilyCache = new Map<string, string>();

function getFontLoaderByName(fontName: string): FontLoader | undefined {
    return FONT_LOADER_MAP[fontName];
}

function getGenericByFontName(fontName: string): string {
    const fontFamily = FONT_FAMILY_LIST.find((fontFamily) => {
        return fontFamily.name === fontName;
    });
    return fontFamily?.generic ?? 'sans-serif';
}

/**
 * 지정 폰트/웨이트의 CSS font-family 문자열을 반환한다.
 * (loadFont는 최초 호출 시 document에 @font-face를 주입한다. 브라우저/헤드리스 크롬 공통 동작)
 */
export function getFontFamilyByWeight(fontName: string, weight: number): string {
    // SSR/빌드 환경에서는 document가 없어 @font-face 주입이 불가능. 폴백 문자열만 반환
    if (typeof document === 'undefined') {
        return `'${fontName}', '${getGenericByFontName(fontName)}'`;
    }

    const cacheKey = `${fontName}_${weight}`;
    const cached = fontFamilyCache.get(cacheKey);
    if (cached) {
        return cached;
    }

    const loader = getFontLoaderByName(fontName);
    if (!loader) {
        return `'${fontName}', '${getGenericByFontName(fontName)}'`;
    }

    const { fontFamily } = loader('normal', {
        weights: [weight],
        subsets: ['latin'],
        ignoreTooManyRequestsWarning: true,
    });

    fontFamilyCache.set(cacheKey, fontFamily);
    return fontFamily;
}

/**
 * 폰트 + generic 포함 풀 폼 (CSS fallback 체인)
 */
export function getFontFullShape(fontName: string, weight: number): string {
    const family = getFontFamilyByWeight(fontName, weight);
    if (family.startsWith("'")) {
        return family;
    }
    return `'${family}', '${getGenericByFontName(fontName)}'`;
}

/**
 * 캡션 렌더에 필요한 폰트의 로드 완료를 기다린다. (서버 렌더링 시 사용)
 */
export function waitForFontLoaded(fontName: string, weight: number): Promise<void> {
    const loader = getFontLoaderByName(fontName);
    if (!loader) {
        return Promise.resolve();
    }
    return loader('normal', {
        weights: [weight],
        subsets: ['latin'],
        ignoreTooManyRequestsWarning: true,
    }).waitUntilDone();
}

/**
 * CaptionConfigPanel 드롭다운 미리보기용 전 폰트 프리로드 (weight 400 기준).
 * 브라우저는 @font-face 로드 완료 시 해당 폰트로 텍스트를 자동 리플로우한다.
 */
export function loadAllPreviewFonts(): void {
    if (typeof document === 'undefined') {
        return;
    }

    FONT_FAMILY_LIST.forEach((fontFamily) => {
        const loader = FONT_LOADER_MAP[fontFamily.name];
        if (!loader) {
            return;
        }
        try {
            loader('normal', {
                weights: [400],
                subsets: ['latin'],
                ignoreTooManyRequestsWarning: true,
            });
        } catch (error) {
            console.error(`[Preview Fonts] Failed to load preview font: ${fontFamily.name}`, error);
        }
    });
}