'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState, MouseEvent} from "react";
import {Eye, EyeOff, Play, Pause, RotateCcw} from "lucide-react";
import {CaptionConfigState, CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

const VIDEO_WIDTH = 36 * 9;
const VIDEO_HEIGHT = VIDEO_WIDTH / 9 * 16;

interface VideoPlayerPanelProps {
    videoUrl: string;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    selectedFontFamilyFullShape: string;
    onChangeCaptionConfigState: (captionConfigState: CaptionConfigState) => void;
    onChangeVideoCurrentTime: (currentTime: number) => void;
    onFinishLoading: () => void;
}

function VideoPlayerPanel({
    videoUrl,
    captionDataList,
    captionConfigState,
    selectedFontFamilyFullShape,
    onChangeCaptionConfigState,
    onChangeVideoCurrentTime,
    onFinishLoading,
}: VideoPlayerPanelProps) {
    // 첫 자막 0초에 안 걸려도 보이게 해 주기
    const videoRef = useRef<HTMLVideoElement>(null);
    const captionRef = useRef<HTMLParagraphElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
    const [isVideoEnded, setIsVideoEnded] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);

    // Font settings state
    const fontSize = useMemo(() => {
        return captionConfigState.fontSize;
    }, [captionConfigState.fontSize]);
    const fontWeight = useMemo(() => {
        return captionConfigState.fontWeight;
    }, [captionConfigState.fontWeight]);

    // Caption settings state
    const captionPosition = useMemo(() => {
        return captionConfigState.captionPosition;
    }, [captionConfigState.captionPosition]);
    const captionHeight = useMemo(() => {
        return captionConfigState.captionHeight;
    }, [captionConfigState.captionHeight]);
    const showCaptionLine = useMemo(() => {
        return captionConfigState.showCaptionLine;
    }, [captionConfigState.showCaptionLine]);

    const [captionLineCount, setCaptionLineCount] = useState<1 | 2>(1);
    // 두 줄 텍스트 높이 계산
    const twoLineTextHeight = useMemo(() => {
        const totalPadding = 8; // py-1 (위아래 4px씩)

        return captionLineCount === 2
            ? captionHeight
            : captionHeight * 2 - totalPadding;
    }, [captionHeight, captionLineCount]);

    const sliderHeight = useMemo(() => {
        return VIDEO_HEIGHT - twoLineTextHeight;
    }, [twoLineTextHeight]);
    const prevSliderHeightRef = useRef(sliderHeight);

    const currentSegment = useMemo(() => {
        // 현재 씬 찾기
        const currentCaption = currentTime < captionDataList[0]?.startSec
            ? captionDataList[0]
            : captionDataList.find((caption) => {
                return currentTime >= caption.startSec && currentTime < caption.endSec;
            });

        if (!currentCaption) return null;

        // 두 단어씩 묶기 (개별 단어 정보 유지)
        const pairedSegments: { words: { word: string, startSec: number, endSec: number }[], startSec: number, endSec: number }[] = [];
        const segments = currentCaption.subtitleSegmentationList;

        for (let index = 0; index < segments.length; index += 2) {
            const hasSecondWord = index + 1 < segments.length;
            const words = hasSecondWord
                ? [segments[index], segments[index + 1]]
                : [segments[index]];

            pairedSegments.push({
                words: index !== 0
                    ? words
                    : words.map((word, wordIndex) => {
                        return wordIndex === 0
                            ? {
                                ...word,
                                startSec: 0,
                            }
                            : word;
                    }),
                startSec: index !== 0
                    ? segments[index].startSec
                    : 0.0,
                endSec: hasSecondWord
                    ? segments[index + 1].endSec
                    : segments[index].endSec,
            })
        }

        // 현재 시간에 해당하는 세그먼트 찾기
        return pairedSegments.find((segment) => {
            return currentTime >= segment.startSec && currentTime <= segment.endSec;
        });
    }, [captionDataList, currentTime]);

    const captionActualTop = useMemo(() => {
        // Calculate actual top position based on available slider range
        const paddingTop = 16; // px
        const availableHeight = VIDEO_HEIGHT - twoLineTextHeight - paddingTop;
        const actualTopPx = (captionPosition / 100) * availableHeight;

        return (actualTopPx / VIDEO_HEIGHT) * 100;
    }, [twoLineTextHeight, captionPosition]);

    // Shadow settings state
    const isShadowEnabled = useMemo(() => {
        return captionConfigState.isShadowEnabled;
    }, [captionConfigState.isShadowEnabled]);
    const shadowIntensity = useMemo(() => {
        return captionConfigState.shadowIntensity;
    }, [captionConfigState.shadowIntensity]);
    const shadowThickness = useMemo(() => {
        return captionConfigState.shadowThickness;
    }, [captionConfigState.shadowThickness]);

    // Color settings state
    const activeColor = useMemo(() => {
        return captionConfigState.activeColor;
    }, [captionConfigState.activeColor]);
    const inactiveColor = useMemo(() => {
        return captionConfigState.inactiveColor;
    }, [captionConfigState.inactiveColor]);
    const activeOutlineColor = useMemo(() => {
        return captionConfigState.activeOutlineColor;
    }, [captionConfigState.activeOutlineColor]);
    const inactiveOutlineColor = useMemo(() => {
        return captionConfigState.inactiveOutlineColor;
    }, [captionConfigState.inactiveOutlineColor]);
    const activeOutlineEnabled = useMemo(() => {
        return captionConfigState.activeOutlineEnabled;
    }, [captionConfigState.activeOutlineEnabled]);
    const inactiveOutlineEnabled = useMemo(() => {
        return captionConfigState.inactiveOutlineEnabled;
    }, [captionConfigState.inactiveOutlineEnabled]);

    const onChangeCaptionPosition = useCallback((newCaptionPosition: number) => {
        if (captionConfigState.captionPosition !== newCaptionPosition) {
            onChangeCaptionConfigState({
                ...captionConfigState,
                captionPosition: newCaptionPosition,
            });
        }
    }, [captionConfigState, onChangeCaptionConfigState]);

    const onChangeCaptionHeight = useCallback((newCaptionHeight: number) => {
        if (captionConfigState.captionHeight !== newCaptionHeight) {
            onChangeCaptionConfigState({
                ...captionConfigState,
                captionHeight: newCaptionHeight,
            });
        }
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onToggleShowCaptionLine = useCallback(() => {
        onChangeCaptionConfigState({
            ...captionConfigState,
            showCaptionLine: !captionConfigState.showCaptionLine,
        });
    }, [captionConfigState, onChangeCaptionConfigState]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const onClickPlayAndPause = useCallback(() => {
        if (!videoRef.current) return;

        if (isPlayingVideo) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }
        setIsPlayingVideo(prev => !prev);
    }, [isPlayingVideo]);

    const onLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
        onFinishLoading();
    }, [onFinishLoading]);

    const updateTimelinePosition = useCallback((clientX: number, element: HTMLDivElement) => {
        if (!videoRef.current) return;

        const rect = element.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;
        const newCurrentTime = parseFloat((percentage * duration).toFixed(3));

        videoRef.current.currentTime = newCurrentTime;
        setCurrentTime((prevCurrentTime) => {
            if (prevCurrentTime !== newCurrentTime) {
                onChangeVideoCurrentTime(newCurrentTime);
                return newCurrentTime;
            } else {
                return prevCurrentTime;
            }
        });

        if (isVideoEnded) {
            setIsVideoEnded(false);
        }
    }, [duration, isVideoEnded, onChangeVideoCurrentTime]);

    const onClickTimeline = useCallback((e: MouseEvent<HTMLDivElement>) => {
        updateTimelinePosition(e.clientX, e.currentTarget);
    }, [updateTimelinePosition]);

    const onMouseDownTimeline = useCallback((e: MouseEvent<HTMLDivElement>) => {
        setIsDraggingTimeline(true);
        updateTimelinePosition(e.clientX, e.currentTarget);
    }, [updateTimelinePosition]);

    const onVideoEnded = useCallback(() => {
        setIsVideoEnded(true);
        setIsPlayingVideo(false);
    }, []);

    const onClickReplay = useCallback(async () => {
        if (!videoRef.current) return;

        videoRef.current.currentTime = 0;
        setCurrentTime(0);
        onChangeVideoCurrentTime(0);
        setIsVideoEnded(false);
        await videoRef.current.play();
        setIsPlayingVideo(true);
    }, [onChangeVideoCurrentTime]);

    const setCaptionRef = useCallback((node: HTMLParagraphElement | null) => {
        captionRef.current = node;
        if (node) {
            const computedStyle = window.getComputedStyle(node);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            const lineCount = Math.round(node.offsetHeight / lineHeight);

            if (lineCount === 1 || lineCount === 2) {
                setCaptionLineCount(lineCount);
            }
            onChangeCaptionHeight(node.offsetHeight);
        }
    }, [onChangeCaptionHeight]);

    const progressPercentage = useMemo(() => {
        return duration > 0 ? (currentTime / duration) * 100 : 0;
    }, [currentTime, duration]);

    // Measure caption height when fontSize changes
    useEffect(() => {
        if (captionRef.current) {
            onChangeCaptionHeight(captionRef.current.offsetHeight);
        }
    }, [fontSize, onChangeCaptionHeight]);

    useEffect(() => {
        // Calculate current handle position in pixels
        if (prevSliderHeightRef.current !== sliderHeight) {
            const maxSliderPercentage = (sliderHeight / VIDEO_HEIGHT) * 100;

            if (captionPosition > maxSliderPercentage) {
                onChangeCaptionPosition(100);
            }

            prevSliderHeightRef.current = sliderHeight;
        }
    }, [captionPosition, onChangeCaptionPosition, sliderHeight]);

    useEffect(() => {
        if (!isDraggingTimeline) return;

        const onMouseMove = (e: globalThis.MouseEvent) => {
            if (timelineRef.current) {
                updateTimelinePosition(e.clientX, timelineRef.current);
            }
        };

        const onMouseUp = () => {
            setIsDraggingTimeline(false);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDraggingTimeline, updateTimelinePosition]);

    // 드래그 중일 때 다른 요소들의 상호작용 차단
    useEffect(() => {
        if (isDraggingTimeline) {
            document.body.style.userSelect = 'none';
        } else {
            document.body.style.userSelect = '';
        }

        return () => {
            document.body.style.userSelect = '';
        };
    }, [isDraggingTimeline]);

    // requestAnimationFrame으로 currentTime 업데이트 (더 높은 빈도)
    useEffect(() => {
        if (!isPlayingVideo) return;

        let animationFrameId: number;

        const updateTime = () => {
            if (videoRef.current && !videoRef.current.paused) {
                const newCurrentTime = parseFloat(videoRef.current.currentTime.toFixed(3));

                setCurrentTime((prevCurrentTime) => {
                    if (prevCurrentTime !== newCurrentTime) {
                        onChangeVideoCurrentTime(newCurrentTime);
                        return newCurrentTime;
                    } else {
                        return prevCurrentTime;
                    }
                })
                animationFrameId = requestAnimationFrame(updateTime);
            }
        };

        animationFrameId = requestAnimationFrame(updateTime);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlayingVideo, onChangeVideoCurrentTime]);

    return (
        <div className="flex-1 bg-black flex flex-col relative" style={{ pointerEvents: isDraggingTimeline ? 'none' : 'auto' }}>
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10" style={{ pointerEvents: 'none' }}>
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="flex items-start space-x-6 relative">
                    {fontSize > 0 && (
                        <div
                            className="absolute flex flex-col"
                            style={{
                                top: `${16 + (captionPosition / 100) * (VIDEO_HEIGHT - twoLineTextHeight - 16)}px`,
                                left: '-24px',
                                right: '-20px',
                            }}
                        >
                            {/* Row: 버튼 + 윗줄 */}
                            <div className="flex flex-row items-center w-full relative">
                                {/* Caption Position Toggle Button */}
                                <button
                                    onClick={onToggleShowCaptionLine}
                                    className="flex-shrink-0 z-30 p-1 rounded-full bg-gray-800/50 hover:bg-gray-700/70 border border-gray-600/50 transition-all mr-2"
                                    title={showCaptionLine ? "Hide caption guideline" : "Show caption guideline"}
                                >
                                    {showCaptionLine ? (
                                        <Eye size={12} className="text-gray-300" />
                                    ) : (
                                        <EyeOff size={12} className="text-gray-500" />
                                    )}
                                </button>

                                {/* Caption Position Line (첫 줄) */}
                                {showCaptionLine && (
                                    <div className="flex-1 border-t-2 border-dashed border-gray-300/80 z-20"></div>
                                )}
                            </div>

                            {/* 두 줄 텍스트 영역 표시선 */}
                            {showCaptionLine && (
                                <div
                                    className="border-t-2 border-dashed border-gray-300/50 z-20"
                                    style={{
                                        position: 'absolute',
                                        top: `${twoLineTextHeight}px`,
                                        left: '30px',
                                        right: 0,
                                    }}
                                ></div>
                            )}
                        </div>
                    )}

                    {/* Caption Position Slider */}
                    {/*<div className="relative" style={{ height: `${VIDEO_HEIGHT - captionHeight}px` }}>*/}
                    <div className={`relative`} style={{ height: `${sliderHeight}px` }}>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={100 - captionPosition} // Inverted: top of slider = top of video
                            onChange={(e) => {
                                const newCaptionPosition = 100 - parseInt(e.target.value)
                                
                                onChangeCaptionPosition(newCaptionPosition);
                            }}
                            className="w-6 h-full cursor-grab active:cursor-grabbing
                                [&::-webkit-slider-runnable-track]:px-0.5
                                [&::-webkit-slider-runnable-track]:py-0.5
                                [&::-webkit-slider-runnable-track]:bg-white
                                [&::-webkit-slider-runnable-track]:rounded-md
                                [&::-moz-range-track]:px-0.5
                                [&::-moz-range-track]:py-0.5
                                [&::-moz-range-track]:bg-white
                                [&::-moz-range-track]:rounded-md
                            "
                            style={{
                                writingMode: 'vertical-lr',
                                direction: 'rtl',
                                accentColor: "#A855F7",
                            }}
                        />
                    </div>

                    <div
                        className="w-[324px] mt-5 bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl relative"
                        style={{ aspectRatio: '9/16' }}
                    >
                        {videoUrl ? (
                            <div className="w-full h-full flex items-center justify-center relative">
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    className="w-full h-full object-contain"
                                    onLoadedMetadata={onLoadedMetadata}
                                    onEnded={onVideoEnded}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>

                                {/* Caption Overlay */}
                                {currentSegment && fontSize > 0 && (
                                    <div
                                        className="absolute left-4 right-4 z-20"
                                        style={{ top: `${captionActualTop}%` }}
                                    >
                                        <p
                                            ref={setCaptionRef}
                                            className="text-center leading-tight px-2 py-1 cursor-default"
                                            style={{
                                                fontFamily: selectedFontFamilyFullShape,
                                                fontSize: `${fontSize * 0.7}px`,
                                                fontWeight: fontWeight,
                                                textShadow: isShadowEnabled
                                                    ? `2px 2px ${(shadowThickness / 100) * 8}px rgba(0,0,0,${shadowIntensity / 100})`
                                                    : 'none'
                                            }}
                                        >
                                            {currentSegment.words.map((word, index) => {
                                                const isActive = currentTime >= word.startSec && currentTime < word.endSec;
                                                return (
                                                    <span
                                                        key={index}
                                                        style={{
                                                            color: isActive ? activeColor : inactiveColor,
                                                            WebkitTextStroke: isActive
                                                                ? (activeOutlineEnabled ? `1px ${activeOutlineColor}` : '0px transparent')
                                                                : (inactiveOutlineEnabled ? `1px ${inactiveOutlineColor}` : '0px transparent'),
                                                        }}
                                                    >
                                                        {word.word}{index < currentSegment.words.length - 1 ? ' ' : ''}
                                                    </span>
                                                );
                                            })}
                                        </p>
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                                    <button
                                        onClick={isVideoEnded ? onClickReplay : onClickPlayAndPause}
                                        className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-all border border-purple-400/50 pointer-events-auto"
                                    >
                                        {isVideoEnded ? (
                                            <RotateCcw size={24} className="text-white" />
                                        ) : isPlayingVideo ? (
                                            <Pause size={24} className="text-white" />
                                        ) : (
                                            <Play size={24} className="text-white ml-1" />
                                        )}
                                    </button>
                                </div>
                                <div className="absolute bottom-4 left-4 right-4">
                                    <div className="flex items-center justify-between text-white text-sm mb-2">
                                        <span>{formatTime(currentTime)}</span>
                                        <span>{formatTime(duration)}</span>
                                    </div>
                                    <div
                                        ref={timelineRef}
                                        className="w-full h-2 bg-white/20 rounded-full cursor-pointer relative"
                                        onClick={onClickTimeline}
                                        onMouseDown={onMouseDownTimeline}
                                        style={{ pointerEvents: 'auto' }}
                                    >
                                        <div
                                            className="h-full bg-gradient-to-r from-pink-400 to-purple-500 rounded-full relative"
                                            style={{
                                                // video timeline 전용 currentTIme 추가?
                                                width: `${progressPercentage}%`,
                                                transition: isDraggingTimeline ? 'none' : 'width 0.1s ease-out'
                                            }}
                                        >
                                            {/* 인디케이터 */}
                                            <div
                                                className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg"
                                                style={{
                                                    transform: 'translateY(-50%)',
                                                    boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900">
                                <p className="text-sm">No video generated yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
            <div className="p-6 border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-sm relative z-10">
                <p className="text-purple-300 text-sm text-center">
                    <span className="bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent font-medium">
                        Video generation complete!
                    </span>
                </p>
            </div>
        </div>
    )
}

export default memo(VideoPlayerPanel);