'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState, MouseEvent, forwardRef, useImperativeHandle} from "react";
import {Play, Pause, RotateCcw, ChevronLeft, ChevronRight} from "lucide-react";
import {Player, PlayerRef} from "@remotion/player";
import {
    CaptionConfigState,
    CaptionData,
    MusicPlayConfig,
    SceneRealTime,
    VideoPlayerUIData
} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import SceneBlock from "@/components/remotion/SceneBlock";
import {
    REMOTION_DEFAULT_FPS,
    RemotionSceneInput,
    getCaptionFontSizePx
} from "@/components/remotion/remotionTypes";

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
    aspectRatio: '16:9' | '9:16';
    musicPlayConfig: MusicPlayConfig;
    sceneSpeedList: { sceneNumber: number; speedMultiplier: number; }[];
    sceneRealStartTimes: SceneRealTime[];
    onChangeVideoPanelContainerHeight: (containerHeight: number) => void;
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
    aspectRatio,
    musicPlayConfig,
    sceneSpeedList,
    sceneRealStartTimes,
    onChangeVideoPanelContainerHeight,
    onChangeVideoPlayerUIData,
    onChangeCurrentTime,
    onChangeSceneSpeed,
    onFinishLoading,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<PlayerRef>(null);
    const bgmAudioRef = useRef<HTMLAudioElement>(null);

    const timelineRef = useRef<HTMLDivElement>(null);
    const carouselRef = useRef<HTMLDivElement>(null);
    const endedFlagRef = useRef<boolean>(false);

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

    // 컴포지션 크기 (9:16 -> 1080x1920, 16:9 -> 1920x1080) - 미리보기/렌더 공통 설계 기준
    const compositionSize = useMemo(() => {
        return aspectRatio === '16:9'
            ? { width: 1920, height: 1080 }
            : { width: 1080, height: 1920 };
    }, [aspectRatio]);

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

    // 활성 씬 컴포지션 duration (real duration 기준)
    const activeSceneDurationInFrames = useMemo(() => {
        if (!activeScene) return 0;
        return Math.max(
            1,
            Math.round(((activeScene.endSec - activeScene.startSec) / activeSceneSpeed) * REMOTION_DEFAULT_FPS)
        );
    }, [activeScene, activeSceneSpeed]);

    // Remotion Scene 컴포지션 Input
    const remotionSceneInput = useMemo<RemotionSceneInput>(() => {
        const captionStyle = {
            fontFamilyName: captionConfigState.fontFamilyName,
            fontSize: captionConfigState.fontSize,
            fontWeight: captionConfigState.fontWeight,
            captionPosition: captionConfigState.captionPosition,
            captionChunkSize: captionConfigState.captionChunkSize,
            captionAnimation: captionConfigState.captionAnimation,
            activeColor: captionConfigState.activeColor,
            inactiveColor: captionConfigState.inactiveColor,
            activeOutlineColor: captionConfigState.activeOutlineColor,
            inactiveOutlineColor: captionConfigState.inactiveOutlineColor,
            activeOutlineThickness: captionConfigState.activeOutlineThickness,
            inactiveOutlineThickness: captionConfigState.inactiveOutlineThickness,
            isActiveOutlineEnabled: captionConfigState.isActiveOutlineEnabled,
            isInactiveOutlineEnabled: captionConfigState.isInactiveOutlineEnabled,
        };

        return {
            isCaptionEnabled: isCaptionEnabled,
            scene: {
                sceneNumber: activeScene?.sceneNumber ?? 1,
                startSec: activeScene?.startSec ?? 0,
                videoUrl: activeSceneUrlData?.videoProcessedUrl || activeSceneUrlData?.videoRawUrl || null,
                voiceUrl: activeSceneUrlData?.voiceUrl || null,
                speedMultiplier: activeSceneSpeed,
            },
            captionSegments: activeScene?.subtitleSegmentationList ?? [],
            captionStyle: captionStyle,
        };
    }, [activeScene, activeSceneUrlData, activeSceneSpeed, isCaptionEnabled, captionConfigState]);

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

    // BGM 볼륨 실시간 동기화
    useEffect(() => {
        if (bgmAudioRef.current && musicPlayConfig?.volume !== undefined) {
            bgmAudioRef.current.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
        }
    }, [musicPlayConfig?.volume]);

    // 안전한 BGM 시간 이동 헬퍼
    const safeSeekBgm = useCallback((targetSec: number) => {
        const bgm = bgmAudioRef.current;
        if (!bgm) return;
        if (!isNaN(bgm.duration) && bgm.duration > 0) {
            bgm.currentTime = Math.max(0, Math.min(targetSec, bgm.duration - 0.1));
        } else {
            bgm.currentTime = Math.max(0, targetSec);
        }
    }, []);

    const syncBgmToStoryTime = useCallback((storyTime: number) => {
        if (!bgmAudioRef.current || !musicPlayConfig.audioUrl) return;
        bgmAudioRef.current.volume = Math.max(0, Math.min(1, musicPlayConfig.volume));
        safeSeekBgm(storyTimeToRealTime(storyTime) + musicPlayConfig.startSec);
    }, [musicPlayConfig, safeSeekBgm, storyTimeToRealTime]);

    // [단일 씬 전환 핸들러]
    const goToScene = useCallback((targetIndex: number, localSeekSec: number = 0) => {
        if (targetIndex < 0 || targetIndex >= captionDataList.length) return;

        setActiveSceneIndex(targetIndex);
        endedFlagRef.current = false;

        const targetScene = captionDataList[targetIndex];
        const targetSpeed = sceneSpeedList.find(s => s.sceneNumber === targetScene?.sceneNumber)?.speedMultiplier ?? 1.0;
        const newVirtualTime = targetScene.startSec + localSeekSec * targetSpeed;

        playerRef.current?.seekTo(Math.round(localSeekSec * REMOTION_DEFAULT_FPS));

        onChangeCurrentTime(newVirtualTime);

        if (isPlaying && playerRef.current) {
            playerRef.current.play();
        }

        if (bgmAudioRef.current && musicPlayConfig.audioUrl) {
            syncBgmToStoryTime(newVirtualTime);
            if (isPlaying) {
                bgmAudioRef.current.play().catch(() => null);
            }
        }
    }, [captionDataList, sceneSpeedList, isPlaying, musicPlayConfig, syncBgmToStoryTime, onChangeCurrentTime]);

    // Player 프레임 이벤트 -> 외부 시간/진행률 동기화
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const onFrameUpdate = () => {
            const frame = player.getCurrentFrame();
            const localSec = frame / REMOTION_DEFAULT_FPS;
            const virtualTime = (activeScene?.startSec ?? 0) + localSec * activeSceneSpeed;
            onChangeCurrentTime(parseFloat(virtualTime.toFixed(3)));
        };

        player.addEventListener('frameupdate', onFrameUpdate);
        return () => {
            player.removeEventListener('frameupdate', onFrameUpdate);
        };
    }, [activeScene, activeSceneSpeed, onChangeCurrentTime]);

    // [Player 'ended' 이벤트] -> 씬 끝 도달 시 자동으로 다음 씬/영상 종료 처리
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const onPlayerEnded = () => {
            if (endedFlagRef.current) return;
            endedFlagRef.current = true;

            const isLastScene = activeSceneIndex === captionDataList.length - 1;
            if (isLastScene) {
                bgmAudioRef.current?.pause();
                setIsEnded(true);
                setIsPlaying(false);
            } else {
                goToScene(activeSceneIndex + 1, 0);
            }
        };

        player.addEventListener('ended', onPlayerEnded);
        return () => {
            player.removeEventListener('ended', onPlayerEnded);
        };
    }, [activeSceneIndex, captionDataList.length, goToScene]);

    // [씬 전환 후 Player 재마운트 동기화]
    // 활성 씬 카드가 바뀌면 Player 인스턴스가 새로 생성되고(autoPlay=false) 정지 상태로 시작한다.
    // 재생 중이었다면(자동 전환/이전·다음 버튼) 새 Player를 시작점(프레임 0)부터 재생한다.
    useEffect(() => {
        if (!isPlaying) return;
        const player = playerRef.current;
        if (!player) return;
        player.play();
    }, [activeSceneIndex, isPlaying]);

    // [씬 음성 프리로드]
    // 씬 전환 시 새로 마운트되는 음성(Audio)은 콜드 로드라 버퍼링으로 초반부가 잘릴 수 있다.
    // 현재/이전/다음 씬의 음성을 숨은 Audio 요소로 미리 브라우저 캐시에 올려, 전환 시 즉시 재생되도록 한다.
    const preloadedVoiceAudioMapRef = useRef<Map<string, HTMLAudioElement>>(new Map());
    useEffect(() => {
        const preloadSceneVoice = (sceneNumber: number | undefined) => {
            if (sceneNumber === undefined) return;
            const voiceUrl = scenesUrlData.find(data => data.sceneNumber === sceneNumber)?.voiceUrl;
            if (!voiceUrl) return;
            if (preloadedVoiceAudioMapRef.current.has(voiceUrl)) return;

            const audio = new Audio();
            audio.preload = 'auto';
            audio.src = voiceUrl;
            audio.load();
            preloadedVoiceAudioMapRef.current.set(voiceUrl, audio);
        };

        preloadSceneVoice(captionDataList[activeSceneIndex]?.sceneNumber);
        preloadSceneVoice(captionDataList[activeSceneIndex + 1]?.sceneNumber);
        preloadSceneVoice(captionDataList[activeSceneIndex - 1]?.sceneNumber);

        // 더 이상 참조되지 않는 URL(만료된 서명 URL 포함) 프리로드 캐시 정리
        const activeVoiceUrls = new Set<string>();
        for (const relativeIndex of [-1, 0, 1]) {
            const scene = captionDataList[activeSceneIndex + relativeIndex];
            if (!scene) continue;
            const voiceUrl = scenesUrlData.find(data => data.sceneNumber === scene.sceneNumber)?.voiceUrl;
            if (voiceUrl) activeVoiceUrls.add(voiceUrl);
        }
        for (const [url, audio] of preloadedVoiceAudioMapRef.current) {
            if (!activeVoiceUrls.has(url)) {
                audio.removeAttribute('src');
                audio.load();
                preloadedVoiceAudioMapRef.current.delete(url);
            }
        }
    }, [activeSceneIndex, captionDataList, scenesUrlData]);

    // 재생 / 일시정지 버튼
    const onClickPlayAndPause = useCallback(async () => {
        const player = playerRef.current;
        if (!player) return;

        if (isPlaying) {
            player.pause();
            bgmAudioRef.current?.pause();
            setIsPlaying(false);
        } else {
            try {
                syncBgmToStoryTime(currentTime);
                await player.play();
                bgmAudioRef.current?.play().catch(() => null);
                setIsPlaying(true);
            } catch (err) {
                console.error("Play failed:", err);
            }
        }
    }, [isPlaying, currentTime, syncBgmToStoryTime]);

    const recalculateVideoSize = useCallback(() => {
        const carousel = carouselRef.current;
        if (!carousel) return;

        const carouselWidth = carousel.offsetWidth;
        const carouselHeight = carousel.offsetHeight;
        const ratio = compositionSize.width / compositionSize.height;

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
    }, [compositionSize.width, compositionSize.height]);

    useEffect(() => {
        recalculateVideoSize();
    }, [recalculateVideoSize, scenesUrlData]);

    useEffect(() => {
        onFinishLoading();
    }, [onFinishLoading]);

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
        if (!activeSceneDurationInFrames) return;

        const rect = element.getBoundingClientRect();
        const clickX = Math.max(0, Math.min(clientX - rect.left, rect.width));
        const percentage = clickX / rect.width;

        const targetLocalSec = percentage * (activeSceneDurationInFrames / REMOTION_DEFAULT_FPS);
        goToScene(activeSceneIndex, targetLocalSec);

        if (isEnded) {
            setIsEnded(false);
        }
    }, [activeSceneDurationInFrames, activeSceneIndex, isEnded, goToScene]);

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
            const player = playerRef.current;
            const bgm = bgmAudioRef.current;
            if (player) await player.play();
            if (bgm && musicPlayConfig.audioUrl) {
                bgm.currentTime = musicPlayConfig.startSec;
                await bgm.play();
            }
            setIsPlaying(true);
        } catch (err) {
            console.error("Replay failed:", err);
        }
    }, [goToScene, musicPlayConfig]);

    // [Progress] 현재 프레임 기반 실제 재생 비율 (0% ~ 100%)
    const [currentFrame, setCurrentFrame] = useState<number>(0);
    useEffect(() => {
        const player = playerRef.current;
        if (!player) return;

        const onFrameUpdate = () => {
            setCurrentFrame(player.getCurrentFrame());
        };

        player.addEventListener('frameupdate', onFrameUpdate);
        return () => {
            player.removeEventListener('frameupdate', onFrameUpdate);
        };
    }, [activeSceneIndex]);

    const progressPercentage = useMemo(() => {
        if (!activeSceneDurationInFrames) return 0;
        return Math.max(0, Math.min((currentFrame / activeSceneDurationInFrames) * 100, 100));
    }, [currentFrame, activeSceneDurationInFrames]);

    const timelineCurrentSec = useMemo(() => {
        return formatTime(currentFrame / REMOTION_DEFAULT_FPS);
    }, [currentFrame, formatTime]);

    const timelineEndSec = useMemo(() => {
        return formatTime(activeSceneDurationInFrames / REMOTION_DEFAULT_FPS);
    }, [activeSceneDurationInFrames, formatTime]);

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
            playerRef.current?.play();
            bgmAudioRef.current?.play().catch(() => null);
            setIsPlaying(true);
        },
        pause: () => {
            playerRef.current?.pause();
            bgmAudioRef.current?.pause();
            setIsPlaying(false);
        },
    }), [captionDataList, sceneSpeedList, goToScene]);

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

    // 컴포지션 기준 UI 데이터 (서버 ASS 잠정 호환용, 서버 페이즈에서 경로 대체 예정)
    useEffect(() => {
        const captionOneLineHeight = getCaptionFontSizePx(captionConfigState.fontSize, compositionSize.width) * 1.2;
        onChangeVideoPlayerUIData({
            videoWidth: compositionSize.width,
            videoHeight: compositionSize.height,
            captionAreaTop: compositionSize.height * (captionConfigState.captionPosition / 100.0),
            captionAreaVerticalPadding: 10,
            captionOneLineHeight: captionOneLineHeight,
        });
    }, [compositionSize.width, compositionSize.height, captionConfigState.captionPosition, captionConfigState.fontSize, onChangeVideoPlayerUIData]);

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
                                        {isActive ? (
                                            <Player
                                                ref={playerRef}
                                                component={SceneBlock}
                                                inputProps={remotionSceneInput}
                                                durationInFrames={activeSceneDurationInFrames}
                                                fps={REMOTION_DEFAULT_FPS}
                                                compositionWidth={compositionSize.width}
                                                compositionHeight={compositionSize.height}
                                                controls={false}
                                                loop={false}
                                                autoPlay={false}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    backgroundColor: '#000000',
                                                }}
                                            />
                                        ) : (
                                            <video
                                                src={sceneUrl.videoProcessedUrl || ''}
                                                preload="auto"
                                                muted={true}
                                                className="w-full h-full object-contain"
                                            />
                                        )}
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
                                className="absolute top-1/2 left-1/2 pointer-events-auto select-none"
                                style={{ width: `${videoContainerWidth}px`, height: `${videoContainerHeight}px`, transform: 'translate(-50%, -50%)', zIndex: 50 }}
                                onMouseEnter={() => setIsHoveringVideo(true)}
                                onMouseLeave={() => setIsHoveringVideo(false)}
                                onDragStart={(e) => e.preventDefault()}
                            >
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none rounded-xl"></div>

                                {/* [상단 HUD]: 장면 횡이동 버튼 캡슐 */}
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
                                    {/* [2층]: 속도 조절 슬라이더 캡슐 */}
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
                                                    touchAction: 'none',
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
                                        style={{ touchAction: 'none' }}
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
                </div>
            </div>
        </div>
    );
});

VideoPlayerPanel.displayName = 'VideoPlayerPanel';

export default memo(VideoPlayerPanel);