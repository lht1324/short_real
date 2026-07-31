'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState, MouseEvent, forwardRef, useImperativeHandle} from "react";
import {Play, Pause, RotateCcw, ChevronLeft, ChevronRight} from "lucide-react";
import {
    CaptionConfigState,
    CaptionData,
    MusicPlayConfig,
    SceneRealTime,
    VideoPlayerUIData
} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {Properties} from "csstype";

export interface PairedSegment {
    word: string;
    startSec: number;
    endSec: number;
    isActive: boolean;
}

export interface CaptionPair {
    displayStartSec: number;
    displayEndSec: number;
    words: {
        word: string;
        startSec: number;
        endSec: number;
    }[];
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
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
    const voiceAudioRefs = useRef<(HTMLAudioElement | null)[]>([]);
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
    const [sideCardWidth, setSideCardWidth] = useState<number>(251);
    const [sideCardHeight, setSideCardHeight] = useState<number>(446);

    // 현재 활성 씬 인덱스 상태 (0-indexed)
    const [activeSceneIndex, setActiveSceneIndex] = useState<number>(0);

    // activeSceneIndex 동기화 (외부 currentTime 변경 시 해당하는 씬으로 맞춤)
    const currentSceneIndex = useMemo(() => {
        if (!captionDataList || captionDataList.length === 0) return 0;
        const index = captionDataList.findIndex((scene, idx) => {
            const nextScene = captionDataList[idx + 1];
            if (nextScene) {
                return currentTime >= scene.startSec && currentTime < nextScene.startSec;
            } else {
                return currentTime >= scene.startSec;
            }
        });
        return index !== -1 ? index : 0;
    }, [captionDataList, currentTime]);

    // 외부에서 드래그/seek로 currentTime이 급격히 바뀔 때 activeSceneIndex 맞춰주기
    useEffect(() => {
        if (!isPlaying) {
            setActiveSceneIndex(currentSceneIndex);
        }
    }, [currentSceneIndex, isPlaying]);

    const activeScene = captionDataList[activeSceneIndex];
    const activeSceneUrlData = scenesUrlData.find(s => s.sceneNumber === activeScene?.sceneNumber);

    // 활성 씬 배속
    const activeSceneSpeed = useMemo(() => {
        const speedObj = sceneSpeedList?.find(s => s.sceneNumber === activeScene?.sceneNumber);
        return speedObj ? speedObj.speedMultiplier : 1.0;
    }, [sceneSpeedList, activeScene?.sceneNumber]);

    // 비디오/보이스 배속 실시간 반영
    useEffect(() => {
        const activeVideo = videoRefs.current[activeSceneIndex];
        const activeVoice = voiceAudioRefs.current[activeSceneIndex];
        if (activeVideo) {
            activeVideo.playbackRate = activeSceneSpeed;
            activeVideo.defaultPlaybackRate = activeSceneSpeed;
        }
        if (activeVoice) {
            activeVoice.playbackRate = activeSceneSpeed;
            activeVoice.defaultPlaybackRate = activeSceneSpeed;
        }
    }, [activeSceneIndex, activeSceneSpeed]);

    // Font settings
    const fontSize = useMemo(() => captionConfigState.fontSize, [captionConfigState.fontSize]);
    const captionHeight = useMemo(() => captionConfigState.captionHeight, [captionConfigState.captionHeight]);

    const [captionLineCount, setCaptionLineCount] = useState<1 | 2>(1);
    const twoLineTextHeight = useMemo(() => {
        return captionLineCount === 2 ? captionHeight : captionHeight * 2;
    }, [captionHeight, captionLineCount]);

    const captionAreaTop = useMemo(() => {
        return videoContainerHeight * (captionConfigState.captionPosition / 100.0);
    }, [videoContainerHeight, captionConfigState.captionPosition]);

    const captionStyle = useMemo(() => {
        return {
            fontFamily: selectedFontFamilyFullShape,
            fontSize: `${captionConfigState.fontSize * 0.7}px`,
            fontWeight: captionConfigState.fontWeight,
        };
    }, [selectedFontFamilyFullShape, captionConfigState.fontSize, captionConfigState.fontWeight]);

    const getPairedCaptionStyle = useCallback((isActive: boolean) => {
        const { activeColor, inactiveColor, isActiveOutlineEnabled, isInactiveOutlineEnabled, activeOutlineColor, inactiveOutlineColor, activeOutlineThickness, inactiveOutlineThickness } = captionConfigState;

        return {
            position: 'relative',
            color: isActive ? activeColor : inactiveColor,
            WebkitTextStroke: isActive
                ? isActiveOutlineEnabled ? `${(activeOutlineThickness / 100) * 12}px ${activeOutlineColor}` : '0px transparent'
                : isInactiveOutlineEnabled ? `${(inactiveOutlineThickness / 100) * 12}px ${inactiveOutlineColor}` : '0px transparent',
            paintOrder: 'stroke fill',
        } as Properties;
    }, [captionConfigState]);

    // [Pre-compute] 자막 2단어 1쌍 미리 조립 (재생 중 프레임마다 배열 재할당 0회)
    const precomputedCaptionPairs = useMemo<CaptionPair[]>(() => {
        if (!activeScene || !activeScene.subtitleSegmentationList || activeScene.subtitleSegmentationList.length === 0) {
            return [];
        }

        const segments = activeScene.subtitleSegmentationList;
        const pairs: CaptionPair[] = [];

        for (let i = 0; i < segments.length; i += 2) {
            const firstWord = segments[i];
            const secondWord = segments[i + 1];

            const words = secondWord ? [firstWord, secondWord] : [firstWord];
            const displayStartSec = firstWord.startSec;

            // 다음 페어가 있으면 다음 페어의 시작 시간까지, 없으면 activeScene.endSec까지 노출
            const nextPairFirstWord = segments[i + 2];
            const displayEndSec = nextPairFirstWord ? nextPairFirstWord.startSec : activeScene.endSec;

            pairs.push({
                displayStartSec,
                displayEndSec,
                words: words.map(w => ({
                    word: w.word,
                    startSec: w.startSec,
                    endSec: w.endSec,
                })),
            });
        }

        return pairs;
    }, [activeScene]);

    // 현재 시간에 활성화된 자막 페어 탐색 (화면에서 사라지지 않고 유지)
    const currentActivePair = useMemo(() => {
        if (precomputedCaptionPairs.length === 0) return null;
        
        // 현재 씬에서의 비디오 재생 시간
        const activeVideo = videoRefs.current[activeSceneIndex];
        const localTime = activeVideo ? activeVideo.currentTime : 0;
        const sceneAbsTime = (activeScene?.startSec ?? 0) + localTime * activeSceneSpeed;

        // 1. 현재 sceneAbsTime이 속해있는 페어 탐색
        let foundPair = precomputedCaptionPairs.find(
            pair => sceneAbsTime >= pair.displayStartSec && sceneAbsTime < pair.displayEndSec
        );

        // 2. 씬 시작 직전이거나 갭인 경우 첫/마지막 페어 유지
        if (!foundPair) {
            if (sceneAbsTime < precomputedCaptionPairs[0].displayStartSec) {
                foundPair = precomputedCaptionPairs[0];
            } else {
                foundPair = precomputedCaptionPairs[precomputedCaptionPairs.length - 1];
            }
        }

        return foundPair;
    }, [precomputedCaptionPairs, activeSceneIndex, activeSceneSpeed, activeScene?.startSec, currentTime]);

    const formatTime = useCallback((seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }, []);

    // 스토리 타임 -> BGM 타임 매핑
    const storyTimeToRealTime = useCallback((storyTime: number): number => {
        if (sceneRealStartTimes.length === 0) return storyTime;
        const sceneIndex = captionDataList.findIndex((s, idx) => {
            const nextScene = captionDataList[idx + 1];
            const startLimit = idx === 0 ? 0 : s.startSec;
            return nextScene ? (storyTime >= startLimit && storyTime < nextScene.startSec) : (storyTime >= startLimit);
        });
        if (sceneIndex === -1) {
            return sceneRealStartTimes[sceneRealStartTimes.length - 1]?.realEndSec ?? storyTime;
        }
        const realStart = sceneRealStartTimes[sceneIndex]?.realStartSec ?? 0;
        const speed = sceneSpeedList.find(s => s.sceneNumber === captionDataList[sceneIndex].sceneNumber)?.speedMultiplier ?? 1.0;
        const localOffset = (storyTime - captionDataList[sceneIndex].startSec) / speed;
        return realStart + localOffset;
    }, [captionDataList, sceneRealStartTimes, sceneSpeedList]);

    // BGM 볼륨 실시간 동기화 (초기 저장값 & 슬라이더 조작값 100% 즉시 반영)
    useEffect(() => {
        if (bgmAudioRef.current && musicPlayConfig?.volume !== undefined) {
            bgmAudioRef.current.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
        }
    }, [musicPlayConfig?.volume]);

    // 안전한 BGM 시간 이동 헬퍼 (오디오 파일 duration 경계 초과 방지)
    const safeSeekBgm = useCallback((targetSec: number) => {
        const bgm = bgmAudioRef.current;
        if (!bgm) return;
        if (!isNaN(bgm.duration) && bgm.duration > 0) {
            bgm.currentTime = Math.max(0, Math.min(targetSec, bgm.duration - 0.1));
        } else {
            bgm.currentTime = Math.max(0, targetSec);
        }
    }, []);

    // [단일 씬 전환 핸들러] 씬 전환을 오직 한 곳에서 제어
    const goToScene = useCallback((targetIndex: number, localSeekSec: number = 0) => {
        if (targetIndex < 0 || targetIndex >= captionDataList.length) return;

        // 모든 이전/다른 비디오 정지
        videoRefs.current.forEach((v, idx) => {
            if (v && idx !== targetIndex) {
                v.pause();
                v.currentTime = 0;
            }
        });
        voiceAudioRefs.current.forEach((a, idx) => {
            if (a && idx !== targetIndex) {
                a.pause();
                a.currentTime = 0;
            }
        });

        setActiveSceneIndex(targetIndex);

        const targetVideo = videoRefs.current[targetIndex];
        const targetVoice = voiceAudioRefs.current[targetIndex];
        const targetScene = captionDataList[targetIndex];
        const targetUrlData = scenesUrlData.find(s => s.sceneNumber === targetScene?.sceneNumber);
        const bgm = bgmAudioRef.current;
        const targetSpeed = sceneSpeedList.find(s => s.sceneNumber === targetScene?.sceneNumber)?.speedMultiplier ?? 1.0;

        if (targetVideo) {
            targetVideo.currentTime = localSeekSec;
            targetVideo.defaultPlaybackRate = targetSpeed;
            targetVideo.playbackRate = targetSpeed;
            if (isPlaying) {
                targetVideo.play().catch(() => null);
            }
        }
        if (targetVoice) {
            targetVoice.currentTime = localSeekSec;
            targetVoice.defaultPlaybackRate = targetSpeed;
            targetVoice.playbackRate = targetSpeed;
            if (isPlaying && targetUrlData?.voiceUrl) {
                targetVoice.play().catch(() => null);
            }
        }

        const newVirtualTime = targetScene.startSec + localSeekSec * targetSpeed;
        onChangeCurrentTime(newVirtualTime);

        if (bgm && musicPlayConfig.audioUrl) {
            bgm.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
            const bgmTargetTime = storyTimeToRealTime(newVirtualTime) + musicPlayConfig.startSec;
            safeSeekBgm(bgmTargetTime);
            if (isPlaying) {
                bgm.play().catch(() => null);
            }
        }
    }, [captionDataList, scenesUrlData, isPlaying, musicPlayConfig, sceneSpeedList, storyTimeToRealTime, safeSeekBgm, onChangeCurrentTime]);

    // [Native TimeUpdate] 비디오 재생 시 부드럽게 프로그레스 바 & 시간 갱신
    const onTimeUpdate = useCallback((index: number) => {
        if (index !== activeSceneIndex) return;
        const activeVideo = videoRefs.current[index];
        const activeVoice = voiceAudioRefs.current[index];
        if (!activeVideo) return;

        // 보이스 오버 오차 싱크 보정 (0.15초 초과 시 동기화)
        if (activeVoice && !activeVoice.paused && Math.abs(activeVoice.currentTime - activeVideo.currentTime) > 0.15) {
            activeVoice.currentTime = activeVideo.currentTime;
        }

        const localTime = activeVideo.currentTime;
        const newVirtualTime = activeScene ? activeScene.startSec + localTime * activeSceneSpeed : 0;
        onChangeCurrentTime(parseFloat(newVirtualTime.toFixed(3)));
    }, [activeSceneIndex, activeScene, activeSceneSpeed, onChangeCurrentTime]);

    // [Native Video Ended] 비디오 실제 재생 종료 시 다음 씬으로 전환
    const onVideoEnded = useCallback((index: number) => {
        if (index !== activeSceneIndex) return;
        const isLastScene = index === captionDataList.length - 1;
        if (isLastScene) {
            bgmAudioRef.current?.pause();
            setIsEnded(true);
            setIsPlaying(false);
        } else {
            goToScene(index + 1, 0);
        }
    }, [activeSceneIndex, captionDataList.length, goToScene]);

    // 재생 / 일시정지 버튼
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
            try {
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
                    bgm.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
                    const bgmTargetTime = storyTimeToRealTime(currentTime) + musicPlayConfig.startSec;
                    safeSeekBgm(bgmTargetTime);
                    bgm.play().catch(() => null);
                }
                setIsPlaying(true);
            } catch (err) {
                console.error("Play failed:", err);
            }
        }
    }, [isPlaying, activeSceneIndex, activeSceneSpeed, activeSceneUrlData, currentTime, musicPlayConfig, storyTimeToRealTime, safeSeekBgm]);

    const recalculateVideoSize = useCallback(() => {
        const ratio = videoNaturalAspectRatioRef.current;
        const carousel = carouselRef.current;
        if (!ratio || !carousel) return;

        const carouselWidth = carousel.offsetWidth;
        const carouselHeight = carousel.offsetHeight;

        const ACTIVE_HEIGHT_RATIO = 0.84;
        const SIDE_HEIGHT_RATIO = 0.65;
        const isHorizontal = ratio > 1;

        if (isHorizontal) {
            const activeWidth = Math.round(carouselWidth * 0.60);
            const activeHeight = Math.round(activeWidth / ratio);
            const sideWidth = Math.round(carouselWidth * 0.44);
            const sideHeight = Math.round(sideWidth / ratio);
            setVideoContainerWidth(activeWidth);
            setVideoContainerHeight(activeHeight);
            setSideCardWidth(sideWidth);
            setSideCardHeight(sideHeight);
        } else {
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

    const onClickPrevScene = useCallback(() => {
        if (activeSceneIndex > 0) {
            goToScene(activeSceneIndex - 1, 0);
        }
    }, [activeSceneIndex, goToScene]);

    const onClickNextScene = useCallback(() => {
        if (activeSceneIndex < captionDataList.length - 1) {
            goToScene(activeSceneIndex + 1, 0);
        }
    }, [activeSceneIndex, captionDataList.length, goToScene]);

    const onClickResetSceneSpeed = useCallback(() => {
        onChangeSceneSpeed(activeScene?.sceneNumber ?? 1, 1.0);
    }, [activeScene?.sceneNumber, onChangeSceneSpeed]);

    // 타임라인 위치 탐색 (클릭/드래그)
    const updateTimelinePosition = useCallback((clientX: number, element: HTMLDivElement) => {
        const activeVideo = videoRefs.current[activeSceneIndex];
        if (!activeVideo || !activeVideo.duration) return;

        const rect = element.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;

        const targetLocalTime = percentage * activeVideo.duration;
        goToScene(activeSceneIndex, targetLocalTime);

        if (isEnded) {
            setIsEnded(false);
        }
    }, [activeSceneIndex, isEnded, goToScene]);

    const onClickTimeline = useCallback((e: MouseEvent<HTMLDivElement>) => {
        updateTimelinePosition(e.clientX, e.currentTarget);
    }, [updateTimelinePosition]);

    const onMouseDownTimeline = useCallback((e: MouseEvent<HTMLDivElement>) => {
        setIsDraggingTimeline(true);
        updateTimelinePosition(e.clientX, e.currentTarget);
    }, [updateTimelinePosition]);

    const onClickReplay = useCallback(async () => {
        goToScene(0, 0);
        setIsEnded(false);
        try {
            const firstVideo = videoRefs.current[0];
            const firstVoice = voiceAudioRefs.current[0];
            const bgm = bgmAudioRef.current;
            if (firstVideo) await firstVideo.play();
            if (firstVoice) await firstVoice.play();
            if (bgm && musicPlayConfig.audioUrl) {
                bgm.currentTime = musicPlayConfig.startSec;
                await bgm.play();
            }
            setIsPlaying(true);
        } catch (err) {
            console.error("Replay failed:", err);
        }
    }, [goToScene, musicPlayConfig]);

    const setCaptionRef = useCallback((node: HTMLParagraphElement | null) => {
        captionRef.current = node;
        if (node) {
            const computedStyle = window.getComputedStyle(node);
            const lineHeight = parseFloat(computedStyle.lineHeight);
            const lineCount = Math.round(node.offsetHeight / lineHeight);

            if (lineCount === 1 || lineCount === 2) {
                setCaptionLineCount(lineCount);
            }
            if (captionConfigState.captionHeight !== node.offsetHeight) {
                onChangeCaptionConfigState({
                    ...captionConfigState,
                    captionHeight: node.offsetHeight,
                });
            }
        }
    }, [captionConfigState, onChangeCaptionConfigState]);

    // [Native Progress] 현재 비디오 실제 재생 비율 (0% ~ 100%)
    const progressPercentage = useMemo(() => {
        const activeVideo = videoRefs.current[activeSceneIndex];
        if (!activeVideo || !activeVideo.duration || activeVideo.duration <= 0) return 0;
        return Math.max(0, Math.min((activeVideo.currentTime / activeVideo.duration) * 100, 100));
    }, [activeSceneIndex, currentTime]);

    const timelineCurrentSec = useMemo(() => {
        const activeVideo = videoRefs.current[activeSceneIndex];
        return formatTime(activeVideo ? activeVideo.currentTime : 0);
    }, [activeSceneIndex, currentTime, formatTime]);

    const timelineEndSec = useMemo(() => {
        const activeVideo = videoRefs.current[activeSceneIndex];
        return formatTime(activeVideo && activeVideo.duration ? activeVideo.duration : 0);
    }, [activeSceneIndex, formatTime]);

    // Imperative handles
    useImperativeHandle(ref, () => ({
        seekTo: (time: number) => {
            const sceneIdx = captionDataList.findIndex((s, idx) => {
                const nextScene = captionDataList[idx + 1];
                return nextScene ? (time >= s.startSec && time < nextScene.startSec) : (time >= s.startSec);
            });
            const actualIdx = sceneIdx !== -1 ? sceneIdx : 0;
            const scene = captionDataList[actualIdx];
            const speed = sceneSpeedList.find(s => s.sceneNumber === scene?.sceneNumber)?.speedMultiplier ?? 1.0;
            const localOffset = Math.max(0, (time - scene.startSec) / speed);
            goToScene(actualIdx, localOffset);
        },
        play: () => {
            const activeVideoElement = videoRefs.current[activeSceneIndex];
            const activeVoiceElement = voiceAudioRefs.current[activeSceneIndex];
            const bgm = bgmAudioRef.current;
            activeVideoElement?.play().catch(() => null);
            activeVoiceElement?.play().catch(() => null);
            bgm?.play().catch(() => null);
            setIsPlaying(true);
        },
        pause: () => {
            videoRefs.current.forEach(v => v?.pause());
            voiceAudioRefs.current.forEach(a => a?.pause());
            bgmAudioRef.current?.pause();
            setIsPlaying(false);
        },
    }), [captionDataList, activeSceneIndex, sceneSpeedList, goToScene]);

    useEffect(() => {
        if (!isDraggingTimeline) return;
        const onMouseMove = (e: globalThis.MouseEvent) => {
            if (timelineRef.current) {
                updateTimelinePosition(e.clientX, timelineRef.current);
            }
        };
        const onMouseUp = () => setIsDraggingTimeline(false);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    }, [isDraggingTimeline, updateTimelinePosition]);

    useEffect(() => {
        if (containerRef.current) {
            onChangeVideoPanelContainerHeight(containerRef.current.offsetHeight);
        }
    }, [onChangeVideoPanelContainerHeight, videoContainerHeight, sceneSpeedList]);

    useEffect(() => {
        onChangeVideoPlayerUIData({
            videoWidth: videoContainerWidth,
            videoHeight: videoContainerHeight,
            captionAreaTop: captionAreaTop,
            captionAreaVerticalPadding: 10,
            captionOneLineHeight: captionLineCount === 1 ? captionHeight : captionHeight / 2,
        });
    }, [videoContainerWidth, videoContainerHeight, captionAreaTop, captionLineCount, captionHeight, onChangeVideoPlayerUIData]);

    return (
        <div
            className="h-full bg-zinc-950 flex flex-col relative"
            style={{ pointerEvents: isDraggingTimeline ? 'none' : 'auto' }}
            ref={containerRef}
        >
            <div className="flex flex-row p-8 justify-center items-center flex-1 z-10 w-full relative">
                <div
                    ref={carouselRef}
                    className="relative w-full h-full overflow-hidden flex items-center justify-center"
                >
                    {scenesUrlData && scenesUrlData.length > 0 ? (
                        <div className="relative w-full h-full">
                            {scenesUrlData.map((sceneUrl, index) => {
                                const diff = index - activeSceneIndex;
                                const isActive = diff === 0;
                                const isHovered = hoveredSceneIndex === index;
                                const distance = Math.abs(diff);
                                const isVisible = distance <= 1;

                                const cardWidth = isActive ? videoContainerWidth : sideCardWidth;
                                const cardHeight = isActive ? videoContainerHeight : sideCardHeight;
                                const overlapFactor = 0.60;
                                const shiftX = diff * (videoContainerWidth * overlapFactor);

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
                                            goToScene(index, 0);
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
                                            onTimeUpdate={() => onTimeUpdate(index)}
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
                                onLoadedMetadata={(e) => {
                                    if (musicPlayConfig?.volume !== undefined) {
                                        e.currentTarget.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
                                    }
                                }}
                                onCanPlay={(e) => {
                                    if (musicPlayConfig?.volume !== undefined) {
                                        e.currentTarget.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
                                    }
                                }}
                            />

                            {/* 컨트롤 오버레이 */}
                            <div
                                className="absolute top-1/2 left-1/2 pointer-events-auto"
                                style={{ width: `${videoContainerWidth}px`, height: `${videoContainerHeight}px`, transform: 'translate(-50%, -50%)', zIndex: 50 }}
                                onMouseEnter={() => setIsHoveringVideo(true)}
                                onMouseLeave={() => setIsHoveringVideo(false)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none rounded-xl"></div>
                                
                                {/* [상단 HUD]: 장면 횡이동 버튼 캡슐 (마우스 호버 / 정지 시 노출) */}
                                <div className={`absolute top-4 left-0 right-0 z-30 flex justify-center pointer-events-auto select-none transition-opacity duration-200 ${
                                    (currentTime === 0 || isHoveringVideo || isEnded || !isPlaying) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                }`}>
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

                                {/* [중앙]: 재생 / 일시정지 버튼 */}
                                <div className={`absolute inset-0 flex items-center justify-center z-30 pointer-events-none transition-opacity duration-200 ${
                                    (currentTime === 0 || isHoveringVideo || isEnded || !isPlaying) ? 'opacity-100' : 'opacity-0'
                                }`}>
                                    <button
                                        onClick={isEnded ? onClickReplay : onClickPlayAndPause}
                                        className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-black/60 transition-all border border-white/10 pointer-events-auto shadow-xl active:scale-95"
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

                                <div className="absolute bottom-4 left-4 right-4 z-30 pointer-events-auto">
                                    {/* [2층]: 속도 조절 슬라이더 캡슐 (마우스 호버 / 정지 시 노출) */}
                                    <div className={`flex justify-center mb-2 px-0.5 select-none transition-opacity duration-200 ${
                                        (currentTime === 0 || isHoveringVideo || isEnded || !isPlaying) ? 'opacity-100' : 'opacity-0 pointer-events-none'
                                    }`}>
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
                                                className="flex items-center justify-center w-4 h-4 text-zinc-400 hover:text-white transition-colors shrink-0 active:scale-90"
                                            >
                                                <RotateCcw size={10} />
                                            </button>
                                        </div>
                                    </div>

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

                    {/* 자막 영역 */}
                    {isCaptionEnabled && fontSize > 0 && (
                        <div
                            className="absolute flex flex-col z-40 pointer-events-none"
                            style={{
                                top: `${captionConfigState.captionPosition}%`,
                                left: '50%',
                                transform: 'translate(-50%, -50%)',
                                width: `${videoContainerWidth}px`,
                                height: 'fit-content',
                            }}
                        >
                            {currentActivePair ? (
                                <div
                                    className="mx-auto z-20"
                                    style={{
                                        width: `${videoContainerWidth}px`,
                                        height: `${twoLineTextHeight}px`,
                                    }}
                                >
                                    <p
                                        ref={setCaptionRef}
                                        className="text-center leading-tight px-2 cursor-default"
                                        style={captionStyle}
                                    >
                                        {currentActivePair.words.map((wordData, index) => {
                                            const activeVideo = videoRefs.current[activeSceneIndex];
                                            const localTime = activeVideo ? activeVideo.currentTime : 0;
                                            const sceneAbsTime = (activeScene?.startSec ?? 0) + localTime * activeSceneSpeed;

                                            // 단어별 하이라이트 여부
                                            const isWordActive = sceneAbsTime >= wordData.startSec && sceneAbsTime <= wordData.endSec;

                                            return (
                                                <span
                                                    key={index}
                                                    style={{
                                                        ...getPairedCaptionStyle(isWordActive),
                                                    }}
                                                >
                                                    {wordData.word
                                                        .replaceAll('—', '...')
                                                        .replace(/["\u201C\u201D]/g, '')
                                                    }{(index + 1) % 2 === 1 ? ' ' : ''}
                                                </span>
                                            );
                                        })}
                                    </p>
                                </div>
                            ) : (
                                <div style={{ height: `${twoLineTextHeight}px` }} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

VideoPlayerPanel.displayName = 'VideoPlayerPanel';

export default memo(VideoPlayerPanel);