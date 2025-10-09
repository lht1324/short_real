'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState, MouseEvent, ChangeEvent, forwardRef, useImperativeHandle} from "react";
import {Eye, EyeOff, Play, Pause, RotateCcw} from "lucide-react";
import {CaptionConfigState, CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

interface PairedSegment {
    word: string;
    startSec: number;
    endSec: number;
    isActive: boolean;
}

export interface VideoPlayerHandle {
    seekTo: (time: number) => void;
    play: () => void;
    pause: () => void;
}

interface VideoPlayerPanelProps {
    videoUrl: string;
    currentTime: number;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    selectedFontFamilyFullShape: string;
    onChangeCaptionConfigState: (captionConfigState: CaptionConfigState) => void;
    onChangeCurrentTime: (currentTime: number) => void;
    onFinishLoading: () => void;
}

const VideoPlayerPanel = forwardRef<VideoPlayerHandle, VideoPlayerPanelProps>(({
    videoUrl,
    currentTime,
    captionDataList,
    captionConfigState,
    selectedFontFamilyFullShape,
    onChangeCaptionConfigState,
    onChangeCurrentTime,
    onFinishLoading,
}, ref) => {
    // 첫 자막 0초에 안 걸려도 보이게 해 주기
    const videoRef = useRef<HTMLVideoElement>(null);
    const captionRef = useRef<HTMLParagraphElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);

    const [isPlayingVideo, setIsPlayingVideo] = useState<boolean>(false);
    const [isVideoEnded, setIsVideoEnded] = useState(false);
    const [videoDuration, setVideoDuration] = useState(0);
    const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
    const [videoContainerWidth, setVideoContainerWidth] = useState<number>(324); // 16/9
    const [videoContainerHeight, setVideoContainerHeight] = useState<number>(576); // 16/9

    // Font settings state
    const fontSize = useMemo(() => {
        return captionConfigState.fontSize;
    }, [captionConfigState.fontSize]);

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
        return captionLineCount === 2
            ? captionHeight
            : captionHeight * 2;
    }, [captionHeight, captionLineCount]);

    const captionAreaHeight = useMemo(() => {
        const lineAreaHeight = 24;

        return lineAreaHeight + twoLineTextHeight + lineAreaHeight;
    }, [twoLineTextHeight]);

    const captionAreaTop = useMemo(() => {
        return (captionConfigState.captionPosition / 100) * (videoContainerHeight - captionAreaHeight);
    }, [captionConfigState.captionPosition, videoContainerHeight, captionAreaHeight]);

    const sliderHeight = useMemo(() => {
        return videoContainerHeight - captionAreaHeight;
    }, [videoContainerHeight, captionAreaHeight]);
    const prevSliderHeightRef = useRef(sliderHeight);

    const captionStyle = useMemo(() => {
        return {
            fontFamily: selectedFontFamilyFullShape,
            fontSize: `${captionConfigState.fontSize * 0.7}px`,
            fontWeight: captionConfigState.fontWeight,
            textShadow: captionConfigState.isShadowEnabled
                ? `2px 2px ${(captionConfigState.shadowThickness / 100) * 8}px rgba(0,0,0,${captionConfigState.shadowIntensity / 100})`
                : 'none'
        }
    }, [
        selectedFontFamilyFullShape,
        captionConfigState.fontSize,
        captionConfigState.fontWeight,
        captionConfigState.isShadowEnabled,
        captionConfigState.shadowThickness,
        captionConfigState.shadowIntensity,
    ]);

    const getPairedCaptionStyle = useCallback((isActive: boolean) => {
        const activeColor = captionConfigState.activeColor;
        const inactiveColor = captionConfigState.inactiveColor;
        const activeOutlineEnabled = captionConfigState.activeOutlineEnabled;
        const inactiveOutlineEnabled = captionConfigState.inactiveOutlineEnabled;
        const activeOutlineColor = captionConfigState.activeOutlineColor;
        const inactiveOutlineColor = captionConfigState.inactiveOutlineColor;
        const activeOutlineThickness = captionConfigState.activeOutlineThickness;
        const inactiveOutlineThickness = captionConfigState.inactiveOutlineThickness;

        return {
            color: isActive ? activeColor : inactiveColor,
            WebkitTextStroke: isActive
                ? activeOutlineEnabled
                    ? `${(activeOutlineThickness / 100) * 4}px ${activeOutlineColor}`
                    : '0px transparent'
                : inactiveOutlineEnabled
                    ? `${(inactiveOutlineThickness / 100) * 4}px ${inactiveOutlineColor}`
                    : '0px transparent',
        }
    }, [
        captionConfigState.activeColor,
        captionConfigState.inactiveColor,
        captionConfigState.activeOutlineEnabled,
        captionConfigState.inactiveOutlineEnabled,
        captionConfigState.activeOutlineColor,
        captionConfigState.inactiveOutlineColor,
        captionConfigState.activeOutlineThickness,
        captionConfigState.inactiveOutlineThickness
    ]);

    const currentPairedSegmentDataList = useMemo(() => {
        const currentSceneCaption = currentTime < captionDataList[0]?.startSec
            ? captionDataList[0]
            : captionDataList.find((captionData) => {
                return currentTime >= captionData.startSec && currentTime <= captionData.endSec;
            });

        if (!currentSceneCaption) return null;

        // 두 단어씩 묶기 (개별 단어 정보 유지)
        const pairedSegments: PairedSegment[][] = []; // SubtitleSegment[1~2][]
        const segments = currentSceneCaption.subtitleSegmentationList;

        for (let index = 0; index < segments.length; index += 2) {
            const hasSecondWord = index + 1 < segments.length;
            const words = hasSecondWord
                ? [segments[index], segments[index + 1]]
                : [segments[index]];

            const mappedWords = words.map((word, wordIndex) => {
                const startSec = index === 0 && wordIndex === 0
                    ? 0
                    : word.startSec;

                return {
                    ...word,
                    startSec: startSec,
                    isActive: currentTime >= startSec && currentTime <= word.endSec,
                }
            })
            pairedSegments.push(mappedWords);
        }

        // 현재 시간에 해당하는 세그먼트 찾기
        return pairedSegments
    }, [currentTime, captionDataList]);

    const currentPairedSegmentData: PairedSegment[] | null = useMemo(() => {
        if (!currentPairedSegmentDataList) return null;

        return currentPairedSegmentDataList.find((pairedSegmentData) => {
            return pairedSegmentData.some((segmentData) => {
                return segmentData.isActive;
            })
        }) ?? null;
    }, [currentPairedSegmentDataList]);

    const onChangeCaptionPosition = useCallback((newCaptionPosition: number) => {
        if (captionConfigState.captionPosition !== newCaptionPosition) {
            onChangeCaptionConfigState({
                ...captionConfigState,
                captionPosition: newCaptionPosition,
            });
        }
    }, [captionConfigState, onChangeCaptionConfigState]);
    const onChangeCaptionPositionSlider = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        const newValue = 100 - parseInt(e.target.value);

        if (captionConfigState.captionPosition !== newValue) {
            onChangeCaptionConfigState({
                ...captionConfigState,
                captionPosition: newValue,
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

    const onClickPlayAndPause = useCallback(async () => {
        if (!videoRef.current) return;

        if (isPlayingVideo) {
            videoRef.current.pause();
        } else {
            await videoRef.current.play();
        }
        setIsPlayingVideo(prev => !prev);
    }, [isPlayingVideo]);

    const onLoadedMetadata = useCallback(() => {
        if (videoRef.current) {
            setVideoDuration(videoRef.current.duration);

            // 비디오의 실제 크기를 가져와서 324px 너비 기준으로 높이 계산
            const videoNaturalWidth = videoRef.current.videoWidth;
            const videoNaturalHeight = videoRef.current.videoHeight;

            if (videoNaturalWidth > 0 && videoNaturalHeight > 0) {
                const standardWidth = videoNaturalWidth > videoNaturalHeight
                    ? 576 // horizontal
                    : 324 // vertical or square

                // const containerWidth = 324;
                const calculatedHeight = Math.round((videoNaturalHeight / videoNaturalWidth) * standardWidth);
                setVideoContainerWidth(standardWidth);
                setVideoContainerHeight(calculatedHeight);
            }
        }
        onFinishLoading();
    }, [onFinishLoading]);

    const updateTimelinePosition = useCallback((clientX: number, element: HTMLDivElement) => {
        if (!videoRef.current) return;

        const rect = element.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;
        const newCurrentTime = parseFloat((percentage * videoDuration).toFixed(3));

        videoRef.current.currentTime = newCurrentTime;
        onChangeCurrentTime(newCurrentTime);

        if (isVideoEnded) {
            setIsVideoEnded(false);
        }
    }, [videoDuration, isVideoEnded, onChangeCurrentTime]);

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
        onChangeCurrentTime(0);
        setIsVideoEnded(false);
        await videoRef.current.play();
        setIsPlayingVideo(true);
    }, [onChangeCurrentTime]);

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
        return videoDuration > 0
            ? (currentTime / videoDuration) * 100
            : 0;
    }, [currentTime, videoDuration]);

    const timelineCurrentSec = useMemo(() => {
        return formatTime(currentTime);
    }, [currentTime, formatTime]);

    const timelineEndSec = useMemo(() => {
        return formatTime(videoDuration);
    }, [videoDuration, formatTime]);

    // Expose imperative methods to parent component
    useImperativeHandle(ref, () => ({
        seekTo: (time: number) => {
            if (videoRef.current) {
                videoRef.current.currentTime = time;
                onChangeCurrentTime(time);
            }
        },
        play: () => {
            if (videoRef.current) {
                videoRef.current.play();
                setIsPlayingVideo(true);
            }
        },
        pause: () => {
            if (videoRef.current) {
                videoRef.current.pause();
                setIsPlayingVideo(false);
            }
        },
    }), [onChangeCurrentTime]);

    // Measure caption height when fontSize changes
    useEffect(() => {
        if (captionRef.current) {
            onChangeCaptionHeight(captionRef.current.offsetHeight);
        }
    }, [fontSize, onChangeCaptionHeight]);

    useEffect(() => {
        // Calculate current handle position in pixels
        if (prevSliderHeightRef.current !== sliderHeight) {
            const maxSliderPercentage = (sliderHeight / videoContainerHeight) * 100;

            if (captionPosition > maxSliderPercentage) {
                onChangeCaptionPosition(100);
            }

            prevSliderHeightRef.current = sliderHeight;
        }
    }, [captionPosition, onChangeCaptionPosition, sliderHeight, videoContainerHeight]);

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

                onChangeCurrentTime(newCurrentTime)
                animationFrameId = requestAnimationFrame(updateTime);
            }
        };

        animationFrameId = requestAnimationFrame(updateTime);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [isPlayingVideo, onChangeCurrentTime]);

    return (
        <div
            className="h-full bg-black flex flex-col relative"
            style={{ pointerEvents: isDraggingTimeline ? 'none' : 'auto' }}
        >
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10" style={{ pointerEvents: 'none' }}>
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8 relative z-10">
                <div className="flex items-start space-x-6 relative">
                    {fontSize > 0 && <div
                        className="absolute flex flex-col z-20"
                        style={{
                            top: `${captionAreaTop}px`,
                            left: '-24px',
                            right: '-20px',
                            height: 'fit-content',
                        }}
                    >
                        {/* Row: 버튼 + 윗줄 */}
                        <div className="flex flex-row items-center w-full relative">
                            {/* Caption Position Toggle Button */}
                            <button
                                onClick={onToggleShowCaptionLine}
                                className="flex-shrink-0 z-30 p-[5px] rounded-full bg-gray-800/50 hover:bg-gray-700/70 border border-gray-600/50 transition-all mr-2"
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
                                <div className="flex-1 border-t-2 border-dashed border-gray-300/80"/>
                            )}
                        </div>
                        <div style={{ height: `${twoLineTextHeight}px` }} />
                        {/* 두 줄 텍스트 영역 표시선 */}
                        {showCaptionLine && <div className="pt-[11px] pb-[11px]">
                            <div
                                className="border-t-2 border-dashed border-gray-300/50"
                                style={{
                                    // Eye + Eye's margin right
                                    marginLeft: `${22 + 8}px`,
                                }}
                            />
                        </div>}
                    </div>}

                    {/* Caption Position Slider */}
                    <div
                        className={`relative`}
                        style={{ height: `${sliderHeight}px` }}
                    >
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={100 - captionPosition} // Inverted: top of slider = top of video
                            onChange={onChangeCaptionPositionSlider}
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
                        className="relative bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl"
                        style={{
                            width: `${videoContainerWidth}px`,
                            height: `${videoContainerHeight}px`
                            // aspectRatio: '9/16'
                        }}
                    >
                        {videoUrl ? (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <video
                                    ref={videoRef}
                                    src={videoUrl}
                                    className="w-full h-full object-contain"
                                    style={{ willChange: 'transform' }}
                                    onLoadedMetadata={onLoadedMetadata}
                                    onEnded={onVideoEnded}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent pointer-events-none"></div>

                                {/* Caption Overlay */}
                                {currentPairedSegmentData && fontSize > 0 && (
                                    <div
                                        className="absolute left-4 right-4 z-20"
                                        style={{
                                            // Eye button size
                                            top: `${captionAreaTop + 24}px`
                                        }}
                                    >
                                        <p
                                            ref={setCaptionRef}
                                            className="text-center leading-tight px-2 cursor-default"
                                            style={captionStyle}
                                        >
                                            {currentPairedSegmentData.map((pairedSegmentData, index) => {
                                                return <span
                                                    key={index}
                                                    style={getPairedCaptionStyle(pairedSegmentData.isActive)}
                                                >
                                                    {pairedSegmentData.word}{(index + 1) % 2 === 1 ? ' ' : ''}
                                                </span>
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
                                <div className="absolute bottom-4 left-4 right-4 z-30">
                                    <div className="flex items-center justify-between text-white text-sm mb-2">
                                        <span>{timelineCurrentSec}</span>
                                        <span>{timelineEndSec}</span>
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
                                                width: `${progressPercentage}%`,
                                                transition: 'none',
                                            }}
                                        >
                                            {/* 인디케이터 */}
                                            <div
                                                className="absolute top-1/2 left-full w-4 h-4 bg-white rounded-full shadow-lg"
                                                style={{
                                                    transform: 'translate(-50%, -50%)',
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
    );
});

VideoPlayerPanel.displayName = 'VideoPlayerPanel';

export default memo(VideoPlayerPanel);