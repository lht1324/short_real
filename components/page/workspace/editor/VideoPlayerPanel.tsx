'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState, MouseEvent, ChangeEvent, forwardRef, useImperativeHandle} from "react";
import {Eye, EyeOff, Play, Pause, RotateCcw, ChevronLeft, ChevronRight} from "lucide-react";
import {
    CaptionConfigState,
    CaptionData,
    MusicPlayConfig,
    SceneRealTime,
    VideoPlayerUIData
} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {Properties} from "csstype";

const CAPTION_AREA_LINE_TOGGLE_BUTTON_SIZE = 24;
const CAPTION_AREA_LINE_HEIGHT = 2;
const CAPTION_POSITION_SLIDER_TRACK_SIZE_PX = 20;
const CAPTION_POSITION_SLIDER_PADDING_PX = 2;

export interface PairedSegment {
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
    scenesUrlData: {
        sceneNumber: number;
        videoRawUrl: string | null;
        videoProcessedUrl: string | null;
        voiceUrl: string | null;
    }[];
    currentTime: number;
    isCaptionEnabled: boolean;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    selectedFontFamilyFullShape: string;
    musicPlayConfig: MusicPlayConfig;
    sceneSpeedList: { sceneNumber: number; speedMultiplier: number; }[];
    sceneRealStartTimes: SceneRealTime[];
    onChangeVideoPanelContainerHeight: (containerHeight: number) => void;
    onChangeCaptionConfigState: (captionConfigState: CaptionConfigState) => void;
    onChangeVideoPlayerUIData: (uiData: VideoPlayerUIData) => void;
    onChangeCurrentTime: (currentTime: number) => void;
    onChangeSceneSpeed: (sceneNumber: number, speedMultiplier: number) => void;
    onFinishLoading: () => void;
}

const VideoPlayerPanel = forwardRef<VideoPlayerHandle, VideoPlayerPanelProps>(({
    scenesUrlData,
    currentTime,
    isCaptionEnabled,
    captionDataList,
    captionConfigState,
    selectedFontFamilyFullShape,
    musicPlayConfig,
    sceneSpeedList,
    sceneRealStartTimes,
    onChangeVideoPanelContainerHeight,
    onChangeCaptionConfigState,
    onChangeVideoPlayerUIData,
    onChangeCurrentTime,
    onChangeSceneSpeed,
    onFinishLoading,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const currentTimeRef = useRef(currentTime);
    
    // Props currentTime을 최신 ref에 실시간 동기화 (Stale Closure 차단)
    useEffect(() => {
        currentTimeRef.current = currentTime;
    }, [currentTime]);
    
    // 멀티 비디오 레퍼런스 배열
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    
    // 씬 나레이션 오디오 레퍼런스 배열 (1:1 매핑)
    const voiceAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
    
    // 씬 전환 중복 트리거 차단용 잠금 플래그 Ref
    const lastSwitchedIndexRef = useRef<number>(-1);
    
    // 씬 스크롤 애니메이션 도중 가상 시간 및 자막 동결용 플래그 Ref
    const isTransitioningRef = useRef<boolean>(false);
    
    // BGM 레퍼런스
    const bgmAudioRef = useRef<HTMLAudioElement>(null);
    
    const captionRef = useRef<HTMLParagraphElement>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const videoNaturalAspectRatioRef = useRef<number | null>(null);

    // 재생 제어 상태
    const [isPlaying, setIsPlaying] = useState<boolean>(false);
    const [isEnded, setIsEnded] = useState(false);
    const [isDraggingTimeline, setIsDraggingTimeline] = useState(false);
    const [isHoveringVideo, setIsHoveringVideo] = useState(false);
    const [hoveredSceneIndex, setHoveredSceneIndex] = useState<number | null>(null);
    const [videoContainerWidth, setVideoContainerWidth] = useState<number>(324);
    const [videoContainerHeight, setVideoContainerHeight] = useState<number>(576);
    // 사이드 카드 물리 크기 (캐러셀 높이의 65% 기준, 초기값은 기본 비율로 산정)
    const [sideCardWidth, setSideCardWidth] = useState<number>(251);
    const [sideCardHeight, setSideCardHeight] = useState<number>(446);

    // 씬별 캐싱 및 탐색 제어
    const currentSceneIndex = useMemo(() => {
        return captionDataList.findIndex((scene, index) => {
            const nextScene = captionDataList[index + 1];
            if (nextScene) {
                return currentTime >= scene.startSec && currentTime < nextScene.startSec;
            } else {
                return currentTime >= scene.startSec && currentTime <= scene.endSec;
            }
        });
    }, [captionDataList, currentTime]);

    // Props 비동기 업데이트 딜레이 중 장면 1(인덱스 0)로 튕겨나가는 것을 막는 Lock Guard
    const activeSceneIndex = useMemo(() => {
        if (lastSwitchedIndexRef.current !== -1) {
            return lastSwitchedIndexRef.current;
        }
        return currentSceneIndex !== -1 ? currentSceneIndex : 0;
    }, [currentSceneIndex]);

    const activeScene = captionDataList[activeSceneIndex];
    const activeSceneUrlData = scenesUrlData.find(s => s.sceneNumber === activeScene?.sceneNumber);

    const videoDuration = useMemo(() => {
        return captionDataList.length > 0
            ? captionDataList[captionDataList.length - 1].endSec
            : 0;
    }, [captionDataList]);

    // 현재 활성 씬의 사용자 지정 배속 획득
    const activeSceneSpeed = useMemo(() => {
        const speedObj = sceneSpeedList?.find(s => s.sceneNumber === activeScene?.sceneNumber);
        return speedObj ? speedObj.speedMultiplier : 1.0;
    }, [sceneSpeedList, activeScene?.sceneNumber]);

    // 비디오/나레이션 오디오의 재생 배속(playbackRate) 실시간 갱신 적용
    useEffect(() => {
        const activeVideo = videoRefs.current[activeSceneIndex];
        const activeVoice = voiceAudioRefs.current[activeSceneIndex];
        if (activeVideo) {
            activeVideo.playbackRate = activeSceneSpeed;
        }
        if (activeVoice) {
            activeVoice.playbackRate = activeSceneSpeed;
        }
    }, [activeSceneIndex, activeSceneSpeed]);

    // Font settings state
    const fontSize = useMemo(() => {
        return captionConfigState.fontSize;
    }, [captionConfigState.fontSize]);


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

    const captionAreaTop = useMemo(() => {
        return videoContainerHeight * (captionConfigState.captionPosition / 100.0);
    }, [videoContainerHeight, captionConfigState.captionPosition]);

    const captionStyle = useMemo(() => {
        return {
            fontFamily: selectedFontFamilyFullShape,
            fontSize: `${captionConfigState.fontSize * 0.7}px`,
            fontWeight: captionConfigState.fontWeight,
        }
    }, [
        selectedFontFamilyFullShape,
        captionConfigState.fontSize,
        captionConfigState.fontWeight,
    ]);

    const getPairedCaptionStyle = useCallback((isActive: boolean) => {
        const activeColor = captionConfigState.activeColor;
        const inactiveColor = captionConfigState.inactiveColor;
        const activeOutlineEnabled = captionConfigState.isActiveOutlineEnabled;
        const inactiveOutlineEnabled = captionConfigState.isInactiveOutlineEnabled;
        const activeOutlineColor = captionConfigState.activeOutlineColor;
        const inactiveOutlineColor = captionConfigState.inactiveOutlineColor;
        const activeOutlineThickness = captionConfigState.activeOutlineThickness;
        const inactiveOutlineThickness = captionConfigState.inactiveOutlineThickness;

        return {
            position: 'relative',
            color: isActive ? activeColor : inactiveColor,
            // Stroke를 두 배로 설정 (절반이 Fill에 가려지므로)
            WebkitTextStroke: isActive
                ? activeOutlineEnabled
                    ? `${(activeOutlineThickness / 100) * 12}px ${activeOutlineColor}`
                    : '0px transparent'
                : inactiveOutlineEnabled
                    ? `${(inactiveOutlineThickness / 100) * 12}px ${inactiveOutlineColor}`
                    : '0px transparent',
            paintOrder: 'stroke fill',
        } as Properties
    }, [
        captionConfigState.activeColor,
        captionConfigState.inactiveColor,
        captionConfigState.isActiveOutlineEnabled,
        captionConfigState.isInactiveOutlineEnabled,
        captionConfigState.activeOutlineColor,
        captionConfigState.inactiveOutlineColor,
        captionConfigState.activeOutlineThickness,
        captionConfigState.inactiveOutlineThickness,
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

    const onChangeCaptionHeight = useCallback((newCaptionHeight: number) => {
        if (captionConfigState.captionHeight !== newCaptionHeight) {
            onChangeCaptionConfigState({
                ...captionConfigState,
                captionHeight: newCaptionHeight,
            });
        }
    }, [captionConfigState, onChangeCaptionConfigState]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // 스토리 타임(대본 기준) → 실제 재생 시간(배속 반영) 변환 헬퍼
    const storyTimeToRealTime = useCallback((storyTime: number): number => {
        if (sceneRealStartTimes.length === 0) return storyTime;
        const sceneIndex = captionDataList.findIndex((s, index) => {
            const nextScene = captionDataList[index + 1];
            const startLimit = index === 0 ? 0 : s.startSec;
            return nextScene 
                ? (storyTime >= startLimit && storyTime < nextScene.startSec)
                : (storyTime >= startLimit);
        });
        if (sceneIndex === -1) {
            return sceneRealStartTimes[sceneRealStartTimes.length - 1]?.realEndSec ?? storyTime;
        }
        const realStart = sceneRealStartTimes[sceneIndex]?.realStartSec ?? 0;
        const speed = sceneSpeedList.find(s => s.sceneNumber === captionDataList[sceneIndex].sceneNumber)?.speedMultiplier ?? 1.0;
        const localOffset = (storyTime - captionDataList[sceneIndex].startSec) / speed;
        return realStart + localOffset;
    }, [captionDataList, sceneRealStartTimes, sceneSpeedList]);

    const onClickPlayAndPause = useCallback(async () => {
        const activeVideoElement = videoRefs.current[activeSceneIndex];
        const activeVoiceElement = voiceAudioRefs.current[activeSceneIndex];
        const bgm = bgmAudioRef.current;

        if (!activeVideoElement) return;

        if (isPlaying) {
            videoRefs.current.forEach(v => v?.pause());
            voiceAudioRefs.current.forEach(a => a?.pause());
            bgm?.pause();
            setIsPlaying(false);
        } else {
            if (activeScene) {
                const localOffset = currentTime - activeScene.startSec;
                activeVideoElement.currentTime = localOffset;
                if (activeVoiceElement) {
                    activeVoiceElement.currentTime = localOffset;
                }
            }
            
            try {
                // 재생 시작 직전에 배속 멱살 고정 주입!
                activeVideoElement.defaultPlaybackRate = activeSceneSpeed;
                activeVideoElement.playbackRate = activeSceneSpeed;
                if (activeVoiceElement) {
                    activeVoiceElement.defaultPlaybackRate = activeSceneSpeed;
                    activeVoiceElement.playbackRate = activeSceneSpeed;
                }

                await activeVideoElement.play();
                if (activeSceneUrlData?.voiceUrl && activeVoiceElement) {
                    await activeVoiceElement.play();
                }
                if (bgm && musicPlayConfig.audioUrl) {
                    bgm.currentTime = storyTimeToRealTime(currentTime) + musicPlayConfig.startSec;
                    await bgm.play();
                }
                setIsPlaying(true);
            } catch (err) {
                console.error("Play failed:", err);
            }
        }
    }, [isPlaying, activeSceneIndex, activeScene, activeSceneUrlData, currentTime, musicPlayConfig, storyTimeToRealTime]);

    const recalculateVideoSize = useCallback(() => {
        const ratio = videoNaturalAspectRatioRef.current;
        const carousel = carouselRef.current;
        if (!ratio || !carousel) return;

        const carouselWidth = carousel.offsetWidth;
        const carouselHeight = carousel.offsetHeight;

        // 비율 상수: 액티브 카드는 캐러셀 높이의 84%, 사이드 카드는 65%
        const ACTIVE_HEIGHT_RATIO = 0.84;
        const SIDE_HEIGHT_RATIO = 0.65;

        const isHorizontal = ratio > 1;

        if (isHorizontal) {
            // 가로 영상: 너비 기준으로 비율 계산
            const activeWidth = Math.round(carouselWidth * 0.60);
            const activeHeight = Math.round(activeWidth / ratio);
            const sideWidth = Math.round(carouselWidth * 0.44);
            const sideHeight = Math.round(sideWidth / ratio);
            setVideoContainerWidth(activeWidth);
            setVideoContainerHeight(activeHeight);
            setSideCardWidth(sideWidth);
            setSideCardHeight(sideHeight);
        } else {
            // 세로 영상: 높이 기준으로 비율 계산
            const activeHeight = Math.round(carouselHeight * ACTIVE_HEIGHT_RATIO);
            const activeWidth = Math.round(activeHeight * ratio);
            const sideHeight = Math.round(carouselHeight * SIDE_HEIGHT_RATIO);
            const sideWidth = Math.round(sideHeight * ratio);
            setVideoContainerWidth(activeWidth);
            setVideoContainerHeight(activeHeight);
            setSideCardWidth(sideWidth);
            setSideCardHeight(sideHeight);
        }
    }, []);

    const onLoadedMetadata = useCallback(() => {
        const video = videoRefs.current[0];
        if (video) {
            const videoNaturalWidth = video.videoWidth;
            const videoNaturalHeight = video.videoHeight;

            if (videoNaturalWidth > 0 && videoNaturalHeight > 0) {
                videoNaturalAspectRatioRef.current = videoNaturalWidth / videoNaturalHeight;
                recalculateVideoSize();
            }
        }
        onFinishLoading();
    }, [onFinishLoading, recalculateVideoSize]);

    const performSeek = useCallback((time: number) => {
        const bgm = bgmAudioRef.current;

        const targetSceneIndex = captionDataList.findIndex((scene, index) => {
            const nextScene = captionDataList[index + 1];
            if (nextScene) {
                return time >= scene.startSec && time < nextScene.startSec;
            } else {
                return time >= scene.startSec && time <= scene.endSec;
            }
        });
        const actualSceneIndex = targetSceneIndex !== -1 ? targetSceneIndex : 0;
        const targetScene = captionDataList[actualSceneIndex];
        const targetUrlData = scenesUrlData.find(s => s.sceneNumber === targetScene?.sceneNumber);

        const localOffset = time - targetScene.startSec;

        // 1. 내부 가상 시간 Ref 강제 동기화 (루프 엇박자 폭주 방지)
        currentTimeRef.current = time;

        const targetSpeed = sceneSpeedList.find(s => s.sceneNumber === targetScene?.sceneNumber)?.speedMultiplier ?? 1.0;

        videoRefs.current.forEach((v, idx) => {
            if (!v) return;
            if (idx === actualSceneIndex) {
                v.currentTime = localOffset;
                // 재생 직전에 배속을 강제로 주입!
                v.defaultPlaybackRate = targetSpeed;
                v.playbackRate = targetSpeed;
                if (isPlaying) {
                    v.play().catch(() => null);
                }
            } else {
                v.pause();
                v.currentTime = 0;
            }
        });

        voiceAudioRefs.current.forEach((a, idx) => {
            if (!a) return;
            if (idx === actualSceneIndex) {
                a.currentTime = localOffset;
                // 재생 직전에 배속을 강제로 주입!
                a.defaultPlaybackRate = targetSpeed;
                a.playbackRate = targetSpeed;
                if (isPlaying && targetUrlData?.voiceUrl) {
                    a.play().catch(() => null);
                }
            } else {
                a.pause();
                a.currentTime = 0;
            }
        });

        // 잠금 플래그를 타겟 인덱스로 동기화
        lastSwitchedIndexRef.current = actualSceneIndex;

        if (bgm && musicPlayConfig.audioUrl) {
            bgm.currentTime = storyTimeToRealTime(time) + musicPlayConfig.startSec;
            if (isPlaying) {
                bgm.play().catch(() => null);
            }
        }

        onChangeCurrentTime(time);
    }, [captionDataList, scenesUrlData, isPlaying, musicPlayConfig, storyTimeToRealTime, onChangeCurrentTime]);

    const onClickPrevScene = useCallback(() => {
        if (activeSceneIndex > 0) {
            performSeek(captionDataList[activeSceneIndex - 1].startSec);
        }
    }, [activeSceneIndex, captionDataList, performSeek]);

    const onClickNextScene = useCallback(() => {
        if (activeSceneIndex < captionDataList.length - 1) {
            performSeek(captionDataList[activeSceneIndex + 1].startSec);
        }
    }, [activeSceneIndex, captionDataList, performSeek]);

    const onClickResetSceneSpeed = useCallback(() => {
        onChangeSceneSpeed(activeScene?.sceneNumber ?? 1, 1.0);
    }, [activeScene?.sceneNumber, onChangeSceneSpeed]);

    const updateTimelinePosition = useCallback(async (clientX: number, element: HTMLDivElement) => {
        if (!activeScene) return;

        const rect = element.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;

        const activeSceneDuration = activeScene.endSec - activeScene.startSec;
        const newLocalTime = percentage * activeSceneDuration;
        const newVirtualTime = activeScene.startSec + newLocalTime;

        performSeek(parseFloat(newVirtualTime.toFixed(3)));

        if (isEnded) {
            setIsEnded(false);
        }
    }, [activeScene, isEnded, performSeek]);

    const onClickTimeline = useCallback((e: MouseEvent<HTMLDivElement>) => {
        updateTimelinePosition(e.clientX, e.currentTarget);
    }, [updateTimelinePosition]);

    const onMouseDownTimeline = useCallback((e: MouseEvent<HTMLDivElement>) => {
        setIsDraggingTimeline(true);
        updateTimelinePosition(e.clientX, e.currentTarget);
    }, [updateTimelinePosition]);

    const onVideoEnded = useCallback((index: number) => {
        if (index === activeSceneIndex) {
            const isLastScene = index === captionDataList.length - 1;
            if (isLastScene) {
                const bgm = bgmAudioRef.current;
                bgm?.pause();
                setIsEnded(true);
                setIsPlaying(false);
            } else {
                const nextSceneIndex = index + 1;
                if (lastSwitchedIndexRef.current === nextSceneIndex) return;

                // 다음 씬 재생 유도
                const nextVideo = videoRefs.current[nextSceneIndex];
                const nextVoice = voiceAudioRefs.current[nextSceneIndex];
                const nextScene = captionDataList[nextSceneIndex];
                const nextUrlData = scenesUrlData.find(s => s.sceneNumber === nextScene?.sceneNumber);
                const bgm = bgmAudioRef.current;

                if (nextVideo) {
                    lastSwitchedIndexRef.current = nextSceneIndex;
                    isTransitioningRef.current = true;
                    
                    // 현재 활성 비디오 및 오디오 일시 정지 (정지/호흡)
                    const currentVideo = videoRefs.current[index];
                    currentVideo?.pause();
                    const currentVoice = voiceAudioRefs.current[index];
                    currentVoice?.pause();
                    bgm?.pause();

                    nextVideo.currentTime = 0;
                    if (nextVoice) {
                        nextVoice.currentTime = 0;
                    }
                    
                    const animDuration = 350;
                    const animStartTime = performance.now();

                    const executeResume = () => {
                        nextVideo.play().catch(() => null);
                        nextVoice?.play().catch(() => null);
                        if (bgm && musicPlayConfig.audioUrl) {
                            bgm.currentTime = (sceneRealStartTimes[nextSceneIndex]?.realStartSec ?? nextScene.startSec) + musicPlayConfig.startSec;
                            bgm.play().catch(() => null);
                        }
                        currentTimeRef.current = nextScene.startSec;
                        onChangeCurrentTime(nextScene.startSec);
                        isTransitioningRef.current = false;
                        setIsPlaying(true);
                    };

                    const handlePreloadComplete = () => {
                        const elapsed = performance.now() - animStartTime;
                        const remaining = animDuration - elapsed;

                        if (remaining > 0) {
                            nextVideo.pause();
                            setTimeout(executeResume, remaining);
                        } else {
                            executeResume();
                        }
                    };

                    nextVideo.play().then(() => {
                        handlePreloadComplete();
                    }).catch(() => {
                        const onCanPlay = () => {
                            nextVideo.removeEventListener('canplay', onCanPlay);
                            handlePreloadComplete();
                        };
                        nextVideo.addEventListener('canplay', onCanPlay);
                    });
                }
            }
        }
    }, [activeSceneIndex, captionDataList, scenesUrlData, musicPlayConfig, sceneRealStartTimes, onChangeCurrentTime]);

    const onClickReplay = useCallback(async () => {
        const bgm = bgmAudioRef.current;
        const firstVideo = videoRefs.current[0];
        const firstVoice = voiceAudioRefs.current[0];

        // 모든 비디오 일시정지 및 리셋
        videoRefs.current.forEach(v => {
            if (v) {
                v.pause();
                v.currentTime = 0;
            }
        });

        // 모든 나레이션 일시정지 및 리셋
        voiceAudioRefs.current.forEach(a => {
            if (a) {
                a.pause();
                a.currentTime = 0;
            }
        });

        if (firstVideo) {
            firstVideo.currentTime = 0;
        }
        if (firstVoice) {
            firstVoice.currentTime = 0;
        }

        // 씬 전환 잠금 플래그 초기화
        lastSwitchedIndexRef.current = 0;
        isTransitioningRef.current = false;

        onChangeCurrentTime(0);
        setIsEnded(false);

        try {
            if (firstVideo) {
                await firstVideo.play();
            }
            if (firstVoice) {
                await firstVoice.play();
            }
            if (bgm && musicPlayConfig.audioUrl) {
                bgm.currentTime = musicPlayConfig.startSec;
                await bgm.play();
            }
            setIsPlaying(true);
        } catch (err) {
            console.error("Replay failed:", err);
        }
    }, [captionDataList, scenesUrlData, musicPlayConfig, onChangeCurrentTime]);

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
        if (!activeScene) return 0;
        const activeSceneDuration = activeScene.endSec - activeScene.startSec;
        if (activeSceneDuration <= 0) return 0;
        const localTime = currentTime - activeScene.startSec;
        return Math.max(0, Math.min((localTime / activeSceneDuration) * 100, 100));
    }, [currentTime, activeScene]);

    const timelineCurrentSec = useMemo(() => {
        if (!activeScene) return formatTime(0);
        const localTime = Math.max(0, currentTime - activeScene.startSec) / activeSceneSpeed;
        return formatTime(localTime);
    }, [currentTime, activeScene, activeSceneSpeed, formatTime]);

    const timelineEndSec = useMemo(() => {
        if (!activeScene) return formatTime(0);
        const activeSceneDuration = (activeScene.endSec - activeScene.startSec) / activeSceneSpeed;
        return formatTime(activeSceneDuration);
    }, [activeScene, activeSceneSpeed, formatTime]);

    // Expose imperative methods to parent component
    useImperativeHandle(ref, () => ({
        seekTo: performSeek,
        play: () => {
            const bgm = bgmAudioRef.current;
            const activeVideoElement = videoRefs.current[activeSceneIndex];
            const activeVoiceElement = voiceAudioRefs.current[activeSceneIndex];

            activeVideoElement?.play().catch(() => null);
            activeVoiceElement?.play().catch(() => null);
            bgm?.play().catch(() => null);
            setIsPlaying(true);
        },
        pause: () => {
            const bgm = bgmAudioRef.current;

            videoRefs.current.forEach(v => v?.pause());
            voiceAudioRefs.current.forEach(a => a?.pause());
            bgm?.pause();
            setIsPlaying(false);
        },
    }), [captionDataList, scenesUrlData, activeSceneIndex, isPlaying, musicPlayConfig, onChangeCurrentTime]);

    // Measure caption height when fontSize changes
    useEffect(() => {
        if (captionRef.current) {
            onChangeCaptionHeight(captionRef.current.offsetHeight);
        }
    }, [fontSize, onChangeCaptionHeight]);



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



    // 비디오 패널 실제 높이를 실시간으로 측정하여 부모에게 보고 (하단 음악 슬라이더 렌더링용)
    useEffect(() => {
        if (containerRef.current) {
            onChangeVideoPanelContainerHeight(containerRef.current.offsetHeight);
        }
    }, [onChangeVideoPanelContainerHeight, videoContainerHeight, sceneSpeedList]);

    // requestAnimationFrame 기반 가상 타임라인 제어 루프 (Stale Closure 차단)
    useEffect(() => {
        if (!isPlaying) return;

        let animationFrameId: number;
        let lastTime = performance.now();

        const updateLoop = () => {
            // 스크롤 애니메이션 전환 중에는 가상 시간 흐름과 자막을 완전 동결(Freeze)시킴
            if (isTransitioningRef.current) {
                lastTime = performance.now();
                animationFrameId = requestAnimationFrame(updateLoop);
                return;
            }

            const bgm = bgmAudioRef.current;
            const activeVideoElement = videoRefs.current[activeSceneIndex];
            const activeVoiceElement = voiceAudioRefs.current[activeSceneIndex];

            if (!activeVideoElement) return;

            const now = performance.now();
            const elapsed = (now - lastTime) / 1000;
            lastTime = now;

            // 가상 타임라인 시간 계산 (최신 ref를 참조하여 누적함으로써 Stale Closure 방지)
            let nextVirtualTime = currentTimeRef.current + elapsed * activeSceneSpeed;

            if (nextVirtualTime >= videoDuration) {
                nextVirtualTime = videoDuration;
                videoRefs.current.forEach(v => v?.pause());
                voiceAudioRefs.current.forEach(a => a?.pause());
                bgm?.pause();
                setIsEnded(true);
                setIsPlaying(false);
                onChangeCurrentTime(videoDuration);
                return;
            }

            // 가상 시간이 실제 포함된 기대 씬 인덱스를 찾음 (경계 중복 제거)
            const expectedIndex = captionDataList.findIndex((scene, index) => {
                const nextScene = captionDataList[index + 1];
                if (nextScene) {
                    return nextVirtualTime >= scene.startSec && nextVirtualTime < nextScene.startSec;
                } else {
                    return nextVirtualTime >= scene.startSec && nextVirtualTime <= scene.endSec;
                }
            });

            // 씬 교차 시점 감지 (기대 씬이 현재 활성 씬과 다른 경우 전이 처리)
            if (expectedIndex !== -1 && expectedIndex !== activeSceneIndex) {
                const nextSceneIndex = expectedIndex;
                
                if (lastSwitchedIndexRef.current !== nextSceneIndex) {
                    const nextVideoElement = videoRefs.current[nextSceneIndex];
                    const nextVoiceElement = voiceAudioRefs.current[nextSceneIndex];
                    const nextScene = captionDataList[nextSceneIndex];
                    const nextUrlData = scenesUrlData.find(s => s.sceneNumber === nextScene?.sceneNumber);

                    if (nextVideoElement && nextScene && nextUrlData) {
                        // 1. 스위칭 전 잠금 즉시 세팅 & 가상 시간 동결 가동
                        lastSwitchedIndexRef.current = nextSceneIndex;
                        isTransitioningRef.current = true;
                        
                        // 2. 현재 활성 비디오 및 음악 일시정지 (정돈)
                        activeVideoElement.pause();
                        activeVoiceElement?.pause();
                        bgm?.pause();
                        
                        // 3. 선제적 로드 타이밍 제어
                        nextVideoElement.currentTime = 0;
                        if (nextVoiceElement) {
                            nextVoiceElement.currentTime = 0;
                        }
                        const animDuration = 350; // 스크롤 애니메이션 시간
                        const animStartTime = performance.now();

                        const executeResume = () => {
                            // 재생 직전에 배속을 강제로 주입!
                            const targetSpeed = sceneSpeedList.find(s => s.sceneNumber === nextScene.sceneNumber)?.speedMultiplier ?? 1.0;
                            nextVideoElement.defaultPlaybackRate = targetSpeed;
                            nextVideoElement.playbackRate = targetSpeed;
                            if (nextVoiceElement) {
                                nextVoiceElement.defaultPlaybackRate = targetSpeed;
                                nextVoiceElement.playbackRate = targetSpeed;
                            }

                            nextVideoElement.play().catch(() => null);
                            nextVoiceElement?.play().catch(() => null);
                            if (bgm && musicPlayConfig.audioUrl) {
                                bgm.currentTime = (sceneRealStartTimes[nextSceneIndex]?.realStartSec ?? nextScene.startSec) + musicPlayConfig.startSec;
                                bgm.play().catch(() => null);
                            }
                            currentTimeRef.current = nextScene.startSec;
                            onChangeCurrentTime(nextScene.startSec);
                            isTransitioningRef.current = false;
                            setIsPlaying(true);
                        };

                        const handlePreloadComplete = () => {
                            const elapsed = performance.now() - animStartTime;
                            const remaining = animDuration - elapsed;

                            if (remaining > 0) {
                                // 애니메이션 도중에 로딩이 먼저 완료됨 ➡️ 350ms 끝날 때까지 정지하고 대기 후 재생!
                                nextVideoElement.pause();
                                setTimeout(executeResume, remaining);
                            } else {
                                // 애니메이션이 완료된 시점에 로딩이 끝남 ➡️ 즉시 재생!
                                executeResume();
                            }
                        };

                        // 비디오 재생 예약 (로딩 기동 및 예외 처리 완벽 방제 + 재생 직전 배속 주입)
                        const targetSpeed = sceneSpeedList.find(s => s.sceneNumber === nextScene.sceneNumber)?.speedMultiplier ?? 1.0;
                        nextVideoElement.defaultPlaybackRate = targetSpeed;
                        nextVideoElement.playbackRate = targetSpeed;

                        nextVideoElement.play().then(() => {
                            handlePreloadComplete();
                        }).catch(() => {
                            // 브라우저가 재생 요청을 거절하더라도 잠금이 영구히 지속되는 것을 예방하기 위해 즉시 잠금 해제 실행
                            handlePreloadComplete();
                        });
                    }
                }
            } else {
                // 평상시: 보이스오버 싱크 강제 일치
                if (activeVoiceElement && !activeVoiceElement.paused && Math.abs(activeVoiceElement.currentTime - activeVideoElement.currentTime) > 0.15) {
                    activeVoiceElement.currentTime = activeVideoElement.currentTime;
                }
            }

            currentTimeRef.current = nextVirtualTime;
            onChangeCurrentTime(parseFloat(nextVirtualTime.toFixed(3)));
            animationFrameId = requestAnimationFrame(updateLoop);
        };

        animationFrameId = requestAnimationFrame(updateLoop);

        return () => {
            if (animationFrameId) cancelAnimationFrame(animationFrameId);
        };
    }, [isPlaying, activeSceneIndex, activeScene, activeSceneSpeed, captionDataList, scenesUrlData, videoDuration, sceneRealStartTimes, onChangeCurrentTime]);

    // BGM 볼륨 동기화
    useEffect(() => {
        const bgm = bgmAudioRef.current;
        if (!bgm || musicPlayConfig.volume === undefined) return;
        bgm.volume = musicPlayConfig.volume;
    }, [musicPlayConfig.volume]);

    useEffect(() => {
        onChangeVideoPlayerUIData({
            videoWidth: videoContainerWidth,
            videoHeight: videoContainerHeight,
            captionAreaTop: captionAreaTop,
            captionAreaVerticalPadding: 10,
            captionOneLineHeight: captionLineCount === 1
                ? captionHeight
                : captionHeight / 2,
        })
    }, [videoContainerWidth, videoContainerHeight, captionAreaTop, captionLineCount, captionHeight, onChangeVideoPlayerUIData]);

    return (
        <div
            className="h-full bg-zinc-950 flex flex-col relative"
            style={{ pointerEvents: isDraggingTimeline ? 'none' : 'auto' }}
            ref={containerRef}
        >
            <div className="flex flex-row p-8 justify-center items-center flex-1 z-10 w-full relative">
                {/* Video Area (우측 빈 공간 전체를 100% 활용하는 3D 카드 병풍 뷰포트) */}
                <div
                    ref={carouselRef}
                    className="relative w-full h-full overflow-hidden flex items-center justify-center"
                >
                    {scenesUrlData && scenesUrlData.length > 0 ? (
                        <div className="relative w-full h-full">
                            {/* 병풍 Carousel 비디오 정렬 루프 */}
                            {scenesUrlData.map((sceneUrl, index) => {
                                const diff = index - activeSceneIndex;
                                const isActive = diff === 0;
                                const isHovered = hoveredSceneIndex === index;
                                
                                // 메인 기준 카드와의 실질적 물리 거리 (0, 1, 2...)
                                const distance = Math.abs(diff);
                                const isVisible = distance <= 1; // 오직 바로 옆 1단계 인접 카드만 시각 노출

                                // 실제 카드 물리 크기: 액티브는 큰 크기, 사이드는 작은 크기로 깊이감 표현
                                const cardWidth = isActive ? videoContainerWidth : sideCardWidth;
                                const cardHeight = isActive ? videoContainerHeight : sideCardHeight;

                                // shiftX: 액티브 카드 폭 기준으로 사이드 카드 중심 위치 결정
                                const overlapFactor = 0.60;
                                const shiftX = diff * (videoContainerWidth * overlapFactor);

                                // scale: DOM 크기 차이로 깊이감을 표현하므로, hover 시에만 살짝 확대
                                const scaleVal = isHovered && !isActive ? 1.04 : 1;
                                const opacityVal = isActive ? 1 : isHovered ? 0.75 : isVisible ? 0.35 : 0;
                                const blurVal = isActive ? 'none' : isHovered ? 'blur(0.5px)' : 'blur(2px)';
                                const borderClass = isActive ? 'border-white/10' : isHovered ? 'border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.08)]' : 'border-white/10';
                                const zIndexVal = isActive ? 30 : isHovered ? 20 : isVisible ? 10 : 0;

                                return (
                                    <div
                                        key={sceneUrl.sceneNumber}
                                        className={`absolute top-1/2 left-1/2 transition-all duration-300 ease-out origin-center flex items-center justify-center bg-zinc-900 rounded-xl overflow-hidden border shadow-xl ${
                                            !isActive && isVisible ? 'cursor-pointer' : ''
                                        } ${borderClass}`}
                                        style={{
                                            width: `${cardWidth}px`,
                                            height: `${cardHeight}px`,
                                            transform: `translate(calc(-50% + ${shiftX}px), -50%) scale(${scaleVal})`,
                                            opacity: opacityVal,
                                            zIndex: zIndexVal,
                                            pointerEvents: isVisible ? 'auto' : 'none',
                                            filter: blurVal,
                                        }}
                                        onMouseEnter={() => !isActive && isVisible && setHoveredSceneIndex(index)}
                                        onMouseLeave={() => setHoveredSceneIndex(null)}
                                        onClick={!isActive && isVisible ? () => {
                                            setHoveredSceneIndex(null);
                                            const targetScene = captionDataList.find(s => s.sceneNumber === sceneUrl.sceneNumber);
                                            if (targetScene) {
                                                performSeek(targetScene.startSec);
                                            }
                                        } : undefined}
                                    >
                                        <video
                                            ref={(el) => {
                                                videoRefs.current[index] = el;
                                            }}
                                            src={sceneUrl.videoProcessedUrl || ''}
                                            preload="auto"
                                            className="w-full h-full object-contain"
                                            onLoadedMetadata={index === 0 ? onLoadedMetadata : undefined}
                                            onEnded={() => onVideoEnded(index)}
                                        />
                                        <audio
                                            ref={(el) => {
                                                voiceAudioRefs.current[index] = el;
                                            }}
                                            src={sceneUrl.voiceUrl || ''}
                                            preload="auto"
                                        />
                                    </div>
                                );
                            })}

                            <audio
                                ref={bgmAudioRef}
                                src={musicPlayConfig?.audioUrl || ''}
                                preload="auto"
                            />

                            {/* 재생 버튼 및 타임라인 오버레이 (정중앙 메인 비디오 위에 얹힘 - zIndex 최상위 50 부여) */}
                            <div
                                className="absolute top-1/2 left-1/2 pointer-events-auto"
                                style={{ width: `${videoContainerWidth}px`, height: `${videoContainerHeight}px`, transform: 'translate(-50%, -50%)', zIndex: 50 }}
                                onMouseEnter={() => setIsHoveringVideo(true)}
                                onMouseLeave={() => setIsHoveringVideo(false)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none rounded-xl"></div>
                                
                                {/* [상단 HUD]: 장면 횡이동 버튼 캡슐 (카드 상단 중앙 정렬 - 서클 버튼 및 SCENE 01 텍스트 스케일업) */}
                                <div className="absolute top-4 left-0 right-0 z-30 flex justify-center pointer-events-auto select-none">
                                    <div className="flex items-center gap-3 bg-black/70 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/15 shadow-2xl">
                                        <button
                                            onClick={onClickPrevScene}
                                            disabled={activeSceneIndex === 0}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:bg-transparent text-zinc-400 hover:text-white transition-all active:scale-90"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs font-bold tracking-widest text-zinc-100 select-none px-1 font-mono">
                                            SCENE {(activeSceneIndex + 1).toString().padStart(2, '0')}
                                        </span>
                                        <button
                                            onClick={onClickNextScene}
                                            disabled={activeSceneIndex === captionDataList.length - 1}
                                            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 disabled:opacity-20 disabled:bg-transparent text-zinc-400 hover:text-white transition-all active:scale-90"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-opacity duration-200 ${
                                    (currentTime === 0 || isHoveringVideo || isEnded) ? 'opacity-100' : 'opacity-0'
                                }`}>
                                    <button
                                        onClick={isEnded ? onClickReplay : onClickPlayAndPause}
                                        className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-all border border-white/10 pointer-events-auto shadow-xl"
                                    >
                                        {isEnded ? (
                                            <RotateCcw size={24} className="text-zinc-100" />
                                        ) : isPlaying ? (
                                            <Pause size={24} className="text-zinc-100" />
                                        ) : (
                                            <Play size={24} className="text-zinc-100 ml-1" />
                                        )}
                                    </button>
                                </div>

                                {/* 타임라인 및 조작 레이어 (카드 내부에 핏하게 오버레이 정착 - 복층 2층 구조) */}
                                <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-auto">
                                    {/* [2층]: 단독 속도 조절 슬라이더 캡슐 (SPEED 텍스트를 소거해 트랙 길이 2배 획득 & mb-2로 간격 밀착) */}
                                    <div className="flex justify-center mb-2 px-0.5 select-none">
                                        <div className="flex items-center gap-2.5 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-2xl w-fit min-w-[240px] max-w-[80%] mx-auto">
                                            <input
                                                type="range"
                                                min="0.5"
                                                max="2.0"
                                                step="0.1"
                                                value={activeSceneSpeed}
                                                onChange={(e) => {
                                                    const val = parseFloat(parseFloat(e.target.value).toFixed(1));
                                                    onChangeSceneSpeed(activeScene?.sceneNumber ?? 1, val);
                                                }}
                                                className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white hover:bg-zinc-700 transition-all duration-150"
                                                style={{
                                                    WebkitAppearance: 'none',
                                                    outline: 'none',
                                                }}
                                            />
                                            <span className="text-[10px] font-bold text-zinc-100 select-none w-7 text-right font-mono">
                                                {activeSceneSpeed.toFixed(1)}x
                                            </span>
                                            <button
                                                onClick={onClickResetSceneSpeed}
                                                title="Reset to 1.0x"
                                                className="flex items-center justify-center w-4 h-4 text-zinc-400 hover:text-white transition-colors shrink-0"
                                            >
                                                <RotateCcw size={10} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* [1층]: 시간 텍스트 및 타임라인 진행률 바 (mb-1로 위 슬라이더와 촘촘히 조율) */}
                                    <div className="flex items-center justify-between text-zinc-300 text-[10px] font-mono tracking-wide mb-1 px-0.5 select-none">
                                        <span>{timelineCurrentSec}</span>
                                        <span>{timelineEndSec}</span>
                                    </div>
                                    <div
                                        ref={timelineRef}
                                        className="w-full h-2.5 bg-white/20 rounded-full cursor-pointer relative hover:h-3.5 transition-all duration-200 group/timeline"
                                        onClick={onClickTimeline}
                                        onMouseDown={onMouseDownTimeline}
                                    >
                                        <div
                                            className="h-full bg-indigo-500 rounded-full relative"
                                            style={{
                                                width: `${progressPercentage}%`,
                                                transition: 'none',
                                            }}
                                        >
                                            <div
                                                className="absolute top-1/2 left-full w-0 h-0 group-hover/timeline:w-4 group-hover/timeline:h-4 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-200 -translate-x-1/2 -translate-y-1/2"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-500 bg-zinc-900 rounded-2xl border border-white/5">
                            <p className="text-[13px] font-medium">No video generated yet</p>
                        </div>
                    )}

                    {/* Caption Area (백분율 고정 배치로 극단적인 렉 최적화 - 중앙 메인 비디오 가두리) */}
                    {isCaptionEnabled && fontSize > 0 && <div
                        className="absolute flex flex-col z-40 pointer-events-none"
                        style={{
                            top: `${captionConfigState.captionPosition}%`,
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: `${videoContainerWidth}px`,
                            height: 'fit-content',
                        }}
                    >
                        {/* Caption Overlay */}
                        {currentPairedSegmentData ? (
                            <div
                                className="mx-auto z-20"
                                style={{
                                    width: `${videoContainerWidth}px`,
                                    height: `${twoLineTextHeight}px`
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
                                            style={{
                                                ...getPairedCaptionStyle(pairedSegmentData.isActive),
                                            }}
                                        >
                                            {pairedSegmentData.word
                                                .replaceAll('—', '...')
                                                .replace(/["\u201C\u201D]/g, '')
                                            }{(index + 1) % 2 === 1 ? ' ' : ''}
                                        </span>
                                    })}
                                </p>
                            </div>
                        ) : <div style={{ height: `${twoLineTextHeight}px` }} />}
                    </div>}
                </div>
            </div>
        </div>
    );
});

VideoPlayerPanel.displayName = 'VideoPlayerPanel';

export default memo(VideoPlayerPanel);