import {memo, useMemo} from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {
    getCaptionFontSizePx,
    getCaptionOutlinePx,
    RemotionCaptionAnimation,
    RemotionCaptionSegment,
    RemotionCaptionStyleConfig,
    sanitizeCaptionWord
} from '@/components/remotion/remotionTypes';
import {getFontFamilyByWeight} from '@/components/remotion/fonts';

// 묶음 교체 간격 목표치(초). Hormozi 기본: 빠른 말은 3단어, 느린 말은 2단어로 자동 조절
const TARGET_CHUNK_CADENCE_SEC = 0.9;

// 애니메이션 종류별 스프링 설정
const ANIMATION_SPRING_CONFIGS: Record<RemotionCaptionAnimation, { damping: number; stiffness: number; mass: number; } | null> = {
    pop: { damping: 12, stiffness: 200, mass: 0.7 },
    swift: { damping: 18, stiffness: 280, mass: 0.6 },
    bounce: { damping: 6, stiffness: 150, mass: 0.9 },
    fadeSlide: { damping: 14, stiffness: 160, mass: 0.8 },
    colorOnly: null,
    highlightBar: { damping: 12, stiffness: 200, mass: 0.7 },
};

// 애니메이션 종류별 변환 목표값 (progress 0 -> 1)
const ANIMATION_TRANSFORM_MAPS: Record<RemotionCaptionAnimation, { scale: [number, number]; translateY: [number, number]; }> = {
    pop: { scale: [0.9, 1.1], translateY: [14, 0] },
    swift: { scale: [0.6, 1.0], translateY: [6, 0] },
    bounce: { scale: [0.8, 1.15], translateY: [18, 0] },
    fadeSlide: { scale: [1.0, 1.0], translateY: [12, 0] },
    colorOnly: { scale: [1.0, 1.0], translateY: [0, 0] },
    highlightBar: { scale: [1.0, 1.0], translateY: [0, 0] },
};

interface CaptionLayerProps {
    captionSegments: RemotionCaptionSegment[];
    captionStyle: RemotionCaptionStyleConfig;
    isCaptionEnabled: boolean;
}

// 장면 평균 단어 길이 기준 묶음 단어 수 산출 (auto: 2~3단어, 타깃 캐던스 유지)
function getChunkSizeForScene(
    segments: RemotionCaptionSegment[],
    selected: 'auto' | 2 | 3 | 4 | undefined
): number {
    if (segments.length === 0) {
        return 3;
    }

    if (selected && selected !== 'auto') {
        return Math.min(selected, segments.length);
    }

    const totalSec = segments[segments.length - 1].endSec - segments[0].startSec;
    const avgWordSec = Math.max(0.1, totalSec / segments.length);
    const wordsPerChunk = Math.round(TARGET_CHUNK_CADENCE_SEC / avgWordSec);
    return Math.min(3, Math.max(2, wordsPerChunk));
}

function CaptionLayer({
    captionSegments,
    captionStyle,
    isCaptionEnabled,
}: CaptionLayerProps) {
    const frame = useCurrentFrame();
    const { fps, width } = useVideoConfig();

    const currentSec = useMemo(() => {
        return frame / fps;
    }, [frame, fps]);

    // 현재 발화 중인 단어 인덱스 (발화 중이 아니면 -1)
    const activeIndex = useMemo(() => {
        return captionSegments.findIndex((segment) => {
            return currentSec >= segment.startSec && currentSec < segment.endSec;
        });
    }, [captionSegments, currentSec]);

    // 단어 사이 갭에서도 묶음이 유지되도록 하는 논리 활성 인덱스
    const logicalActiveIndex = useMemo(() => {
        if (captionSegments.length === 0) {
            return -1;
        }
        if (activeIndex !== -1) {
            return activeIndex;
        }
        if (currentSec < captionSegments[0].startSec) {
            return 0;
        }
        return captionSegments.length - 1;
    }, [captionSegments, activeIndex, currentSec]);

    // 표시 단어 묶음 인덱스 (묶음 크기 기준 고정 경계, 만료 시 통째 교체)
    const visibleIndexes = useMemo(() => {
        if (logicalActiveIndex === -1 || captionSegments.length === 0) {
            return [];
        }

        const chunkSize = getChunkSizeForScene(captionSegments, captionStyle.captionChunkSize);
        const chunkStart = Math.floor(logicalActiveIndex / chunkSize) * chunkSize;
        const chunkEnd = Math.min(captionSegments.length - 1, chunkStart + chunkSize - 1);

        const indexes: number[] = [];
        for (let index = chunkStart; index <= chunkEnd; index += 1) {
            indexes.push(index);
        }
        return indexes;
    }, [captionSegments, logicalActiveIndex, captionStyle.captionChunkSize]);

    const fontFamilyFullShape = useMemo(() => {
        const family = getFontFamilyByWeight(captionStyle.fontFamilyName, captionStyle.fontWeight);
        return family;
    }, [captionStyle.fontFamilyName, captionStyle.fontWeight]);

    const fontSizePx = useMemo(() => {
        return getCaptionFontSizePx(captionStyle.fontSize, width);
    }, [captionStyle.fontSize, width]);

    const activeOutlinePx = useMemo(() => {
        return getCaptionOutlinePx(
            captionStyle.activeOutlineThickness,
            captionStyle.fontSize,
            width
        );
    }, [captionStyle.activeOutlineThickness, captionStyle.fontSize, width]);

    const inactiveOutlinePx = useMemo(() => {
        return getCaptionOutlinePx(
            captionStyle.inactiveOutlineThickness,
            captionStyle.fontSize,
            width
        );
    }, [captionStyle.inactiveOutlineThickness, captionStyle.fontSize, width]);

    if (!isCaptionEnabled || captionSegments.length === 0) {
        return null;
    }

    const getWordStyle = (index: number) => {
        const isActive = index === activeIndex;

        if (!isActive) {
            return {
                color: captionStyle.inactiveColor,
                WebkitTextStroke: captionStyle.isInactiveOutlineEnabled
                    ? `${inactiveOutlinePx}px ${captionStyle.inactiveOutlineColor}`
                    : '0px transparent',
                paintOrder: 'stroke fill',
                opacity: 0.45,
                transform: 'translateY(0px) scale(1)',
            } as const;
        }

        const animationType: RemotionCaptionAnimation = captionStyle.captionAnimation ?? 'pop';
        const springConfig = ANIMATION_SPRING_CONFIGS[animationType];
        const transformMap = ANIMATION_TRANSFORM_MAPS[animationType];

        // colorOnly: 움직임 없는 색 전환만
        if (!springConfig) {
            return {
                color: captionStyle.activeColor,
                WebkitTextStroke: captionStyle.isActiveOutlineEnabled
                    ? `${activeOutlinePx}px ${captionStyle.activeOutlineColor}`
                    : '0px transparent',
                paintOrder: 'stroke fill',
                opacity: 1,
                transform: 'translateY(0px) scale(1)',
            } as const;
        }

        // 활성 단어: 애니메이션 종류별 스프링 + 변환
        const startFrame = captionSegments[index].startSec * fps;
        const progress = spring({
            frame: frame - startFrame,
            fps,
            config: springConfig,
        });
        const scale = interpolate(progress, [0, 1], transformMap.scale);
        const translateY = interpolate(progress, [0, 1], transformMap.translateY);

        return {
            color: captionStyle.activeColor,
            WebkitTextStroke: captionStyle.isActiveOutlineEnabled
                ? `${activeOutlinePx}px ${captionStyle.activeOutlineColor}`
                : '0px transparent',
            paintOrder: 'stroke fill',
            opacity: 1,
            transform: `translateY(${translateY}px) scale(${scale})`,
        } as const;
    };

    const isHighlightBarActive = (index: number) => {
        return index === activeIndex && (captionStyle.captionAnimation ?? 'pop') === 'highlightBar';
    };

    // highlightBar: 활성 단어 뒤 하이라이트 배너 페이드 인
    const getHighlightBarStyle = (index: number) => {
        const startFrame = captionSegments[index].startSec * fps;
        const progress = spring({
            frame: frame - startFrame,
            fps,
            config: ANIMATION_SPRING_CONFIGS.highlightBar!,
        });
        const opacity = interpolate(progress, [0, 1], [0, 0.28]);

        return {
            position: 'absolute',
            top: '-8%',
            bottom: '-8%',
            left: '-12%',
            right: '-12%',
            backgroundColor: captionStyle.activeColor,
            opacity: opacity,
            borderRadius: '0.18em',
            zIndex: -1,
        } as const;
    };

    return (
        <AbsoluteFill
            style={{
                justifyContent: 'center',
                alignItems: 'center',
                pointerEvents: 'none',
            }}
        >
            <div
                style={{
                    position: 'absolute',
                    top: `${captionStyle.captionPosition}%`,
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: width * 0.92,
                    textAlign: 'center',
                }}
            >
                <p
                    style={{
                        fontFamily: fontFamilyFullShape,
                        fontSize: fontSizePx,
                        fontWeight: captionStyle.fontWeight,
                        lineHeight: 1.2,
                        margin: 0,
                        padding: 0,
                        textAlign: 'center',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'keep-all',
                        overflowWrap: 'break-word',
                    }}
                >
                    {visibleIndexes.map((index) => {
                        const segment = captionSegments[index];
                        const word = sanitizeCaptionWord(segment.word);

                        return (
                            <span
                                key={index}
                                style={{
                                    display: 'inline-block',
                                    marginRight: '0.22em',
                                    position: 'relative',
                                    ...getWordStyle(index),
                                }}
                            >
                                {isHighlightBarActive(index) && (
                                    <span style={getHighlightBarStyle(index)} />
                                )}
                                {word}
                            </span>
                        );
                    })}
                </p>
            </div>
        </AbsoluteFill>
    );
}

export default memo(CaptionLayer);