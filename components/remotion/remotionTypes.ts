/**
 * Remotion 컴포지션 공용 타입 및 디자인 규칙.
 * - 에디터 미리보기(<Player>)와 서버 렌더링(renderMedia)이 동일한 스키마를 공유한다.
 * - 이 파일은 UI(에디터)에서 import 하지 않도록 구조적 타이핑(structural typing)만 사용한다.
 *   (서버 페이즈에서 Replicate 모델 내부로 그대로 이동 가능하도록 React/페이지 의존성 제거)
 */

export const REMOTION_DEFAULT_FPS = 30;

/**
 * 캡션 fontSize의 설계 기준 폭(px).
 * 숏폼 표준 출력 해상도(1080×1920) 기준이라, 9:16 캔버스에서는 이 값이 곧 캔버스의 실제 px가 된다.
 * 컴포지션 폭이 다르면(16:9 = 1920 등) 폭에 비례해 스케일되어 같은 시각 비율을 유지한다.
 */
export const REMOTION_DESIGN_WIDTH = 1080;

/**
 * 씬 단위 자막 세그먼트 (SubtitleSegment와 구조적으로 동일, 의존성 제거용)
 */
export interface RemotionCaptionSegment {
    word: string;
    startSec: number;
    endSec: number;
}

/**
 * 씬 단위 미디어 데이터
 */
export interface RemotionSceneData {
    sceneNumber: number;
    startSec: number; // 절대 시간 기준 씬 시작 시각 (캡션 절대 시간 -> 씬 로컬 시간 변환용)
    videoUrl: string | null;
    voiceUrl: string | null;
    speedMultiplier: number;
}

/**
 * 캡션 활성 단어 애니메이션 종류
 * - pop: 스프링 팝 (Hormozi 스탠다드, 기본값)
 * - swift: 오버슛 없는 스내피 등장
 * - bounce: 오버슛을 크게 키운 과장 팝
 * - fadeSlide: 위로 슬라이드하며 페이드 인 (차분)
 * - colorOnly: 움직임 없이 색/아웃라인만 전환
 * - highlightBar: 단어 뒤 하이라이트 배너가 페이드 인
 */
export type RemotionCaptionAnimation = 'pop' | 'swift' | 'bounce' | 'fadeSlide' | 'colorOnly' | 'highlightBar';

/**
 * 캡션 스타일 설정 (CaptionConfigState와 구조적으로 동일, 의존성 제거용)
 */
export interface RemotionCaptionStyleConfig {
    fontFamilyName: string;
    fontSize: number; // REMOTION_DESIGN_WIDTH 기준 px
    fontWeight: number;
    captionPosition: number; // 세로 위치 퍼센트 (0-100)
    captionChunkSize: 'auto' | 2 | 3 | 4; // 단어 묶음 크기 (auto: Hormozi 기본 2~3단어)
    captionAnimation: RemotionCaptionAnimation; // 활성 단어 애니메이션 종류
    activeColor: string;
    inactiveColor: string;
    activeOutlineColor: string;
    inactiveOutlineColor: string;
    activeOutlineThickness: number; // 0-100
    inactiveOutlineThickness: number; // 0-100
    isActiveOutlineEnabled: boolean;
    isInactiveOutlineEnabled: boolean;
}

/**
 * 씬 컴포지션 Input (에디터 <Player> inputProps)
 */
export interface RemotionSceneInput {
    isCaptionEnabled: boolean;
    scene: RemotionSceneData;
    captionSegments: RemotionCaptionSegment[];
    captionStyle: RemotionCaptionStyleConfig;
}

/**
 * 전체 영상 컴포지션 Input (서버 렌더링 계약 초안)
 * merge/final 이후의 모든 후처리(씬 스티칭/배속/보이스/BGM/자막)가 이 하나로 수렴된다.
 */
export interface RemotionFullVideoInput {
    isCaptionEnabled: boolean;
    width: number;
    height: number;
    fps: number;
    scenes: RemotionSceneData[];
    voiceUrl: string | null; // 씬별 트림은 컴포지션 내부에서 처리
    captions: {
        sceneNumber: number;
        segments: RemotionCaptionSegment[];
    }[];
    captionStyle: RemotionCaptionStyleConfig;
    bgm: {
        audioUrl: string | null;
        startSec: number;
        endSec: number;
        volume: number; // 0-1
    } | null;
}

/**
 * 설정 fontSize -> 컴포지션 픽셀로 환산 (컴포지션 폭 기준 비례)
 */
export function getCaptionFontSizePx(fontSize: number, compositionWidth: number): number {
    return (fontSize / REMOTION_DESIGN_WIDTH) * compositionWidth;
}

/**
 * 설정 outline 두께(0-100) -> 컴포지션 픽셀로 환산
 * (설정 fontSize와 컴포지션 폭에 비례, 기본 72px/1080px 설계 기준)
 */
export function getCaptionOutlinePx(
    thickness: number,
    fontSize: number,
    compositionWidth: number
): number {
    return (thickness / 100) * 36 * (fontSize / 72) * (compositionWidth / REMOTION_DESIGN_WIDTH);
}

/**
 * 자막 단어 위생 처리 (UI와 서버 동일 경로)
 */
export function sanitizeCaptionWord(word: string): string {
    return word.replaceAll('—', '...').replace(/["\u201C\u201D]/g, '');
}