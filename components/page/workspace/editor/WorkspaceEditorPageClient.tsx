'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {useRouter, useSearchParams} from 'next/navigation';
import { ChevronLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { fontMap, type FontName } from "@/lib/fonts";
import FONT_FAMILY_LIST, {FontFamily} from "@/lib/FontFamilyList";
import {videoClientAPI} from "@/lib/api/client/videoClientAPI";
import {imageClientAPI} from "@/lib/api/client/imageClientAPI";
import {
    FinalVideoMergeData,
    MusicData,
    SceneData, SceneGenerationStatus,
    SubtitleSegment,
    VideoGenerationTask,
    VideoGenerationTaskStatus
} from "@/lib/api/types/supabase/VideoGenerationTasks";
import SceneSequencePanel from "@/components/page/workspace/editor/SceneSequencePanel";
import SceneImageLightboxModal from "@/components/page/workspace/editor/SceneImageLightboxModal";
import SceneRegenerateModal, { RegenerateMode } from "@/components/page/workspace/editor/SceneRegenerateModal";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { aiModelDataClientAPI } from "@/lib/api/client/aiModelDataClientAPI";
import CaptionConfigPanel, {ColorPickerType} from "@/components/page/workspace/editor/CaptionConfigPanel";
import VideoPlayerPanel, {VideoPlayerHandle} from "@/components/page/workspace/editor/VideoPlayerPanel";
import MusicPanel from "@/components/page/workspace/editor/MusicPanel";
// import MusicEditPanel from "@/components/page/workspace/editor/MusicEditPanel";
import {musicClientAPI} from "@/lib/api/client/musicClientAPI";
import dynamic from "next/dynamic";
import {useAuth} from "@/context/AuthContext";
import {createBrowserClient} from "@supabase/ssr";
import ColorPickerPopover from "@/components/page/workspace/editor/ColorPickerPopover";
const MusicEditPanel = dynamic(
    () => import('@/components/page/workspace/editor/MusicEditPanel'), // 컴포넌트 경로
    {
        ssr: false, // [핵심] 서버 사이드 렌더링을 끕니다.
        loading: () => <div className="w-full h-40 bg-gray-900 animate-pulse" /> // (선택) 로딩 중 보여줄 UI
    }
)

interface VideoData {
    title: string;
    scenesUrlData: {
        sceneNumber: number;
        videoRawUrl: string | null;
        videoProcessedUrl: string | null;
        voiceUrl: string | null;
    }[];
    captionDataList: CaptionData[];
    sceneBreakdownList: SceneData[];
}

export interface CaptionData {
    sceneNumber: number;
    script: string;
    startSec: number;
    endSec: number;
    subtitleSegmentationList: SubtitleSegment[];
    speedMultiplier?: number; // 2차 배속 설정
}

export interface CaptionConfigState {
    // Font settings state
    fontFamilyName: string;
    fontSize: number;
    fontWeight: number;

    // Caption settings state
    captionPosition: number; // percentage from top (0-100)
    captionHeight: number;
    showCaptionLine: boolean;

    // Shadow settings state
    // isShadowEnabled: boolean;
    // shadowIntensity: number; // 0-100 (maps to opacity)
    // shadowThickness: number; // 0-100 (maps to blur-radius)

    // Color settings state
    activeColor: string;
    inactiveColor: string;
    activeOutlineColor: string;
    inactiveOutlineColor: string;
    activeOutlineThickness: number; // 0-100 (maps to stroke width)
    inactiveOutlineThickness: number; // 0-100 (maps to stroke width)
    isActiveOutlineEnabled: boolean;
    isInactiveOutlineEnabled: boolean;
}

export interface VideoPlayerUIData {
    videoWidth: number;
    videoHeight: number;
    captionAreaTop: number;
    captionAreaVerticalPadding: number;
    captionOneLineHeight: number; // 실질적 fontSize
}

export interface MusicPlayConfig {
    audioUrl?: string;
    startSec: number;
    duration :number;
    volume: number
}

export interface SceneRealTime {
    sceneNumber: number;
    realStartSec: number; // 배속 적용 후 실제 시작 시간 (초)
    realEndSec: number;   // 배속 적용 후 실제 종료 시간 (초)
}

interface ColorPickerState {
    isOpen: boolean;
    type: ColorPickerType | null;
    position: { top: number; left: number };
    color: string;
}

enum ConfigPanelType {
    Caption = 'caption',
    Music = 'music'
}

const INITIAL_CAPTION_CONFIG_STATE: CaptionConfigState = {
    // Font settings state
    fontFamilyName: "Poppins",
    fontSize: 48,
    fontWeight: 900,

    // Caption settings state
    captionPosition: 80,
    captionHeight: 0,
    showCaptionLine: true,

    // Shadow settings state
    // isShadowEnabled: true,
    // shadowIntensity: 80,
    // shadowThickness: 50,

    // Color settings state
    activeColor:'#FFFFFF',
    inactiveColor:'#AAAAAA',
    isActiveOutlineEnabled: true,
    activeOutlineColor:'#000000',
    activeOutlineThickness: 50,
    isInactiveOutlineEnabled: true,
    inactiveOutlineColor:'#000000',
    inactiveOutlineThickness: 50,
}

function WorkspaceEditorPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get('taskId');

    const { user } = useAuth();

    const headerRef = useRef<HTMLDivElement>(null);
    const videoPlayerRef = useRef<VideoPlayerHandle>(null);

    const [headerHeight, setHeaderHeight] = useState(0);
    const [videoPanelHeight, setVideoPanelHeight] = useState(0);
    const [activeConfigPanel, setActiveConfigPanel] = useState<ConfigPanelType>(ConfigPanelType.Caption);

    const [isPublicDataLoading, setIsPublicDataLoading] = useState(true);
    const [isSceneSequencePanelLoading, setIsSceneSequencePanelLoading] = useState(true);
    const [isVideoPlayerPanelLoading, setIsVideoPlayerPanelLoading] = useState(true);

    const musicEditPanelHeight = useMemo(() => {
        return headerHeight !== 0 && videoPanelHeight !== 0
            ? window.innerHeight - (headerHeight + videoPanelHeight)
            : 0;
    }, [headerHeight, videoPanelHeight]);

    const isInitialLoading = useMemo(() => {
        return isPublicDataLoading || isSceneSequencePanelLoading || isVideoPlayerPanelLoading;
    }, [isPublicDataLoading, isSceneSequencePanelLoading, isVideoPlayerPanelLoading]);

    const [isFinishLoading, setIsFinishLoading] = useState(false);
    const [isSaveLoading, setIsSaveLoading] = useState(false);
    const [isSaveSuccess, setIsSaveSuccess] = useState(false);

    const [videoData, setVideoData] = useState<VideoData | null>(null);
    const videoDataRef = useRef(videoData);
    useEffect(() => {
        videoDataRef.current = videoData;
    }, [videoData]);

    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
    const [globalResolution, setGlobalResolution] = useState<'720p' | '1080p' | '2160p'>('1080p');

    // 고화질 원본 씬 라이트박스 모달 상태
    const [lightboxSceneIndex, setLightboxSceneIndex] = useState<number | null>(null);
    const [sceneImageUrlList, setSceneImageUrlList] = useState<string[]>([]);

    // 단건 씬 재생성 모달 상태 & AI 모델 데이터
    const [aiModelList, setAiModelList] = useState<AIModelData[]>([]);
    const [taskAiModelConfig, setTaskAiModelConfig] = useState<{
        sceneImageI2IModelId?: string;
        videoModelId?: string;
    } | null>(null);

    const [regenerateModalState, setRegenerateModalState] = useState<{
        isOpen: boolean;
        mode: RegenerateMode;
        sceneNumber: number;
        sceneDuration: number;
        selectedModelId: string | null;
    }>({
        isOpen: false,
        mode: RegenerateMode.IMAGE,
        sceneNumber: 1,
        sceneDuration: 4,
        selectedModelId: null,
    });

    useEffect(() => {
        const fetchModels = async () => {
            try {
                const models = await aiModelDataClientAPI.getAIModelData();
                setAiModelList(models);
            } catch (error) {
                console.error("Failed to fetch AI models in editor:", error);
            }
        };
        fetchModels();
    }, []);

    // Supabase Realtime 구독 (태스크 & 씬 breakdown_list 실시간 DB 변경 감지)
    useEffect(() => {
        if (!taskId) return;

        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        console.log('[Editor Realtime] Subscribing to task updates:', taskId);

        const channel = supabase
            .channel(`video_task_editor_${taskId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'video_generation_tasks',
                    filter: `id=eq.${taskId}`,
                },
                async (payload) => {
                    console.log('[Editor Realtime] Received UPDATE event:', payload);
                    const updatedTask = payload.new as VideoGenerationTask;
                    const newBreakdownList = updatedTask.scene_breakdown_list;

                    if (!newBreakdownList || newBreakdownList.length === 0) return;

                    const currentBreakdownList = videoDataRef.current?.sceneBreakdownList || [];

                    // 1. SceneData.status 변경이 발생한 씬 정밀 추출
                    const statusChangedScenes = newBreakdownList.filter((newScene) => {
                        const oldScene = currentBreakdownList.find((sceneData) => sceneData.sceneNumber === newScene.sceneNumber);
                        return oldScene && oldScene.status !== newScene.status;
                    });

                    // status 변경 씬이 없으면 헛스윙 연산 방지를 위해 무시
                    if (statusChangedScenes.length === 0) {
                        return;
                    }

                    console.log('[Editor Realtime] Status changed scenes detected:', statusChangedScenes);

                    // 새로 COMPLETED 상태로 전환된 단건 씬 탐지
                    const newlyCompletedScene = newBreakdownList.find((newScene) => {
                        const oldScene = currentBreakdownList.find((sceneData) => sceneData.sceneNumber === newScene.sceneNumber);
                        return oldScene && oldScene.status !== SceneGenerationStatus.COMPLETED && newScene.status === SceneGenerationStatus.COMPLETED;
                    });

                    // 2. COMPLETED 전환 씬이 있는 경우 단건 핀포인트 비동기 처리
                    if (newlyCompletedScene) {
                        const sceneNum = newlyCompletedScene.sceneNumber;
                        const oldScene = currentBreakdownList.find((s) => s.sceneNumber === sceneNum);
                        const isVideoFinished = oldScene?.status === SceneGenerationStatus.GENERATING_VIDEO;

                        // 1) 이미지 URL 최신 갱신
                        const latestUrls = await imageClientAPI.getImages(taskId, newBreakdownList.length);
                        let freshUrls: string[] = [];
                        if (latestUrls && latestUrls.length > 0) {
                            const timestamp = Date.now();
                            freshUrls = latestUrls.map((url) => `${url}${url.includes("?") ? "&" : "?"}t=${timestamp}`);
                        }

                        // 2) 비디오 raw/processed URL 최신 갱신
                        const userId = user?.id || searchParams.get('userId') || "";
                        const taskUrlsResult = await videoClientAPI.getVideoTaskUrls(taskId, userId);
                        const targetSceneUrlData = taskUrlsResult?.scenes?.find(s => s.sceneNumber === sceneNum);
                        const freshVideoUrl = targetSceneUrlData?.videoProcessedUrl || targetSceneUrlData?.videoRawUrl;

                        // 비디오 완공인 경우: 백그라운드 비디오 프리로드로 첫 프레임(loadeddata) 렌더링 준비 대기
                        if (isVideoFinished && freshVideoUrl && typeof window !== 'undefined') {
                            await new Promise<void>((resolve) => {
                                const tempVideo = document.createElement('video');
                                tempVideo.preload = 'auto';
                                tempVideo.muted = true;

                                const onReady = () => {
                                    tempVideo.removeEventListener('loadeddata', onReady);
                                    tempVideo.removeEventListener('error', onError);
                                    resolve();
                                };
                                const onError = () => {
                                    tempVideo.removeEventListener('loadeddata', onReady);
                                    tempVideo.removeEventListener('error', onError);
                                    resolve();
                                };

                                tempVideo.addEventListener('loadeddata', onReady);
                                tempVideo.addEventListener('error', onError);
                                tempVideo.src = freshVideoUrl;
                                tempVideo.load();

                                // 네트워크 지연 고려 3초 타임아웃 가드
                                setTimeout(resolve, 3000);
                            });
                        } else if (!isVideoFinished && freshUrls.length > 0 && typeof window !== 'undefined') {
                            // 이미지 완공인 경우: 해당 씬 이미지 인메모리 프리로드 완료 대기
                            const targetImageUrl = freshUrls[sceneNum - 1] || freshUrls[0];
                            if (targetImageUrl) {
                                await new Promise<void>((resolve) => {
                                    const tempImg = new window.Image();
                                    tempImg.onload = () => resolve();
                                    tempImg.onerror = () => resolve();
                                    tempImg.src = targetImageUrl;
                                    setTimeout(resolve, 3000);
                                });
                            }
                        }

                        // 이미지 및 비디오 URL state 적용 & breakdownList(스피너 해제) 동시에 동기화 갱신
                        if (freshUrls.length > 0) {
                            setSceneImageUrlList(freshUrls);
                        }
                        setVideoData((currentPrev) => {
                            if (!currentPrev) return currentPrev;
                            return {
                                ...currentPrev,
                                scenesUrlData: taskUrlsResult?.scenes || currentPrev.scenesUrlData,
                                sceneBreakdownList: newBreakdownList,
                            };
                        });

                        // 화면 렌더링(Paint) 후 alert() 노출
                        setTimeout(() => {
                            if (isVideoFinished) {
                                alert(`Scene #${sceneNum} video motion rendering has been completed!`);
                            } else {
                                alert(`Scene #${sceneNum} image has been successfully regenerated.`);
                            }
                        }, 200);
                    } else {
                        // COMPLETED 전환이 아닌 경우 (FAILED 또는 GENERATING 상태 등)
                        setVideoData((prev) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                sceneBreakdownList: newBreakdownList,
                            };
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            console.log('[Editor Realtime] Unsubscribing channel:', taskId);
            channel.unsubscribe();
        };
    }, [taskId, user?.id, searchParams]);

    const [isCaptionEnabled, setIsCaptionEnabled] = useState(true);

    const captionDataList = useMemo(() => {
        return videoData?.captionDataList ?? []
    }, [videoData]);

    const onOpenImageRegenerateModal = useCallback((sceneNumber: number) => {
        const targetCaption = captionDataList.find(c => c.sceneNumber === sceneNumber);
        const targetSceneData = videoData?.sceneBreakdownList?.find(s => s.sceneNumber === sceneNumber);
        const duration = targetCaption ? targetCaption.endSec - targetCaption.startSec : 4;
        setRegenerateModalState({
            isOpen: true,
            mode: RegenerateMode.IMAGE,
            sceneNumber,
            sceneDuration: duration,
            selectedModelId: targetSceneData?.selectedI2IAIModelId ?? taskAiModelConfig?.sceneImageI2IModelId ?? null,
        });
    }, [captionDataList, videoData?.sceneBreakdownList, taskAiModelConfig?.sceneImageI2IModelId]);

    const onOpenVideoRegenerateModal = useCallback((sceneNumber: number) => {
        const targetCaption = captionDataList.find(c => c.sceneNumber === sceneNumber);
        const targetSceneData = videoData?.sceneBreakdownList?.find(s => s.sceneNumber === sceneNumber);
        const duration = targetCaption ? targetCaption.endSec - targetCaption.startSec : 4;
        setRegenerateModalState({
            isOpen: true,
            mode: RegenerateMode.VIDEO,
            sceneNumber,
            sceneDuration: duration,
            selectedModelId: targetSceneData?.selectedI2VAIModelId ?? taskAiModelConfig?.videoModelId ?? null,
        });
    }, [captionDataList, videoData?.sceneBreakdownList, taskAiModelConfig?.videoModelId]);

    const handleConfirmRegenerate = useCallback(async (payload: {
        mode: RegenerateMode;
        sceneNumber: number;
        selectedI2IAIModelId?: string;
        selectedI2VAIModelId?: string;
        isAlsoRegenerateVideo?: boolean;
    }) => {
        const {
            mode,
            sceneNumber,
            selectedI2IAIModelId,
            selectedI2VAIModelId,
            isAlsoRegenerateVideo
        } = payload;

        const isImageMode = mode === RegenerateMode.IMAGE;

        setRegenerateModalState((previousState) => ({ ...previousState, isOpen: false }));

        if (!taskId) return;

        // 재생성 시작 시 씬 카드를 즉시 로딩 오버레이 상태로 동기화
        setVideoData((prevVideoData) => {
            if (!prevVideoData) return prevVideoData;

            const updatedBreakdownList = prevVideoData.sceneBreakdownList.map((sceneData) => {
                if (sceneData.sceneNumber === sceneNumber) {
                    return {
                        ...sceneData,
                        ...(selectedI2IAIModelId ? { selectedI2IAIModelId: selectedI2IAIModelId } : {}),
                        ...(selectedI2VAIModelId ? { selectedI2VAIModelId: selectedI2VAIModelId } : {}),
                        status: isImageMode
                            ? SceneGenerationStatus.GENERATING_IMAGE
                            : SceneGenerationStatus.GENERATING_VIDEO,
                    };
                }
                return sceneData;
            });
            return {
                ...prevVideoData,
                sceneBreakdownList: updatedBreakdownList,
            };
        });

        try {
            if (isImageMode) {
                console.log(`[Regenerate Image] Requesting Scene #${sceneNumber}...`);
                const regenerateResult = await imageClientAPI.postImageRegenerate({
                    taskId: taskId,
                    sceneNumber: sceneNumber,
                    selectedI2IAIModelId: selectedI2IAIModelId,
                    selectedI2VAIModelId: isAlsoRegenerateVideo ? selectedI2VAIModelId : taskAiModelConfig?.videoModelId,
                    isAlsoRegenerateVideo: isAlsoRegenerateVideo,
                });

                if (regenerateResult.success) {
                    console.log(`[Regenerate Image Success] Scene #${sceneNumber} Image request submitted successfully.`);
                } else {
                    // 실패 시 status FAILED로 설정
                    setVideoData((prevVideoData) => {
                        if (!prevVideoData) return prevVideoData;
                        const updatedBreakdownList = prevVideoData.sceneBreakdownList.map((sceneData) => {
                            if (sceneData.sceneNumber === sceneNumber) {
                                return {
                                    ...sceneData,
                                    status: SceneGenerationStatus.FAILED,
                                };
                            }
                            return sceneData;
                        });
                        return {
                            ...prevVideoData,
                            sceneBreakdownList: updatedBreakdownList,
                        };
                    });

                    alert(`Failed to regenerate image for Scene #${sceneNumber}: ${regenerateResult.error || 'Unknown error'}`);
                }
            } else {
                console.log(`[Regenerate Video] Requesting Scene #${sceneNumber}...`);
                const regenerateResult = await videoClientAPI.postVideoRegenerate({
                    taskId: taskId,
                    sceneNumber: sceneNumber,
                    selectedI2VAIModelId: selectedI2VAIModelId,
                });

                if (regenerateResult.success) {
                    console.log(`[Regenerate Video Success] Scene #${sceneNumber} Video Request ID:`, regenerateResult.requestId);
                } else {
                    // 실패 시 status FAILED로 설정
                    setVideoData((prevVideoData) => {
                        if (!prevVideoData) return prevVideoData;
                        const updatedBreakdownList = prevVideoData.sceneBreakdownList.map((sceneData) => {
                            if (sceneData.sceneNumber === sceneNumber) {
                                return {
                                    ...sceneData,
                                    status: SceneGenerationStatus.FAILED,
                                };
                            }
                            return sceneData;
                        });
                        return {
                            ...prevVideoData,
                            sceneBreakdownList: updatedBreakdownList,
                        };
                    });

                    alert(`Failed to render video motion for Scene #${sceneNumber}: ${regenerateResult.error || 'Unknown error'}`);
                }
            }
        } catch (error) {
            console.error("Regeneration error:", error);
            setVideoData((prevVideoData) => {
                if (!prevVideoData) return prevVideoData;
                const updatedBreakdownList = prevVideoData.sceneBreakdownList.map((sceneData) => {
                    if (sceneData.sceneNumber === sceneNumber) {
                        return {
                            ...sceneData,
                            status: SceneGenerationStatus.FAILED,
                        };
                    }
                    return sceneData;
                });
                return {
                    ...prevVideoData,
                    sceneBreakdownList: updatedBreakdownList,
                };
            });
        }
    }, [taskId, taskAiModelConfig?.videoModelId]);

    const [captionConfigState, setCaptionConfigState] = useState<CaptionConfigState>(INITIAL_CAPTION_CONFIG_STATE);
    const [sceneSpeedList, setSceneSpeedList] = useState<{ sceneNumber: number; speedMultiplier: number; }[]>([]);

    // 각 씨의 실제 재생 시작/종료 시간 (배속 반영 후) 사전 계산
    // VideoPlayerPanel BGM 싱크 및 SceneSequencePanel 시간 표시에 공유
    const sceneRealStartTimes = useMemo<SceneRealTime[]>(() => {
        let realTime = 0;
        return captionDataList.map((scene) => {
            const realStart = realTime;
            const speed = sceneSpeedList.find(s => s.sceneNumber === scene.sceneNumber)?.speedMultiplier ?? 1.0;
            const duration = scene.endSec - scene.startSec;
            realTime += duration / speed;
            return {
                sceneNumber: scene.sceneNumber,
                realStartSec: parseFloat(realStart.toFixed(3)),
                realEndSec: parseFloat(realTime.toFixed(3)),
            };
        });
    }, [captionDataList, sceneSpeedList]);
    const [fontFamilyList, setFontFamilyList] = useState<FontFamily[]>([]);
    const selectedFontFamily = useMemo(() => {
        return fontFamilyList.find((fontFamily) => {
            return fontFamily.name === captionConfigState.fontFamilyName;
        });
    }, [fontFamilyList, captionConfigState.fontFamilyName]);
    const selectedFontFamilyWeightList = useMemo(() => {
        return selectedFontFamily?.weightList ?? [];
    }, [selectedFontFamily?.weightList]);
    const selectedFontFamilyFullShape = useMemo(() => {
        const fontName = selectedFontFamily?.name as FontName;
        const nextFont = fontMap[fontName];
        return nextFont ? nextFont.style.fontFamily : `'${selectedFontFamily?.name}', '${selectedFontFamily?.generic}'`;
    }, [selectedFontFamily]);


    const [videoPlayerUIData, setVideoPlayerUIData] = useState<VideoPlayerUIData | null>(null);
    const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0.0);
    const currentSceneIndex = useMemo(() => {
        return captionDataList.findIndex((captionData, index) => {
            const nextScene = captionDataList[index + 1];
            if (nextScene) {
                return videoCurrentTime >= captionData.startSec && videoCurrentTime < nextScene.startSec;
            } else {
                return videoCurrentTime >= captionData.startSec && videoCurrentTime <= captionData.endSec;
            }
        });
    }, [captionDataList, videoCurrentTime]);

    const [musicDataList, setMusicDataList] = useState<MusicData[]>([]);
    const videoDuration = useMemo(() => {
        return captionDataList.length > 0
            ? captionDataList[captionDataList.length - 1].endSec
            : 0
    }, [captionDataList]);
    // 배속 반영된 실제 종 재생 시간 (MusicEditPanel 구간 계산 및 백앤드 에 사용)
    const realVideoDuration = useMemo(() => {
        if (sceneRealStartTimes.length === 0) return videoDuration;
        return sceneRealStartTimes[sceneRealStartTimes.length - 1].realEndSec;
    }, [sceneRealStartTimes, videoDuration]);

    const [editingMusicIndex, setEditingMusicIndex] = useState<number>(0);
    const editingMusicData = useMemo(() => {
        return musicDataList.length !== 0
            ? musicDataList[editingMusicIndex]
            : null;
    }, [musicDataList, editingMusicIndex]);

    const [musicStartSec, setMusicStartSec] = useState<number>(0);
    const [musicVolume, setMusicVolume] = useState<number>(1.0);
    const [isMusicMuted, setIsMusicMuted] = useState(false);

    const musicPlayConfig: MusicPlayConfig | null = useMemo(() => {
        return editingMusicData ? {
            audioUrl: editingMusicData.audioUrl,
            startSec: musicStartSec,
            duration: realVideoDuration,
            volume: isMusicMuted ? 0 : musicVolume,
        } : null;
    }, [editingMusicData, musicStartSec, realVideoDuration, musicVolume, isMusicMuted]);

    const finalVideoMergeData: FinalVideoMergeData | null = useMemo(() => {
        if (captionDataList.length !== 0 && taskId && videoPlayerUIData && videoDuration > 0) {
            // 자막 데이터 리스트에 개별 씬의 최신 배속 설정 값을 결합(Join)하여 빌드
            const mergedCaptionDataList = captionDataList.map((caption) => {
                const speedObj = sceneSpeedList.find((s) => s.sceneNumber === caption.sceneNumber);
                return {
                    ...caption,
                    speedMultiplier: speedObj ? speedObj.speedMultiplier : 1.0,
                };
            });

            return {
                isCaptionEnabled: isCaptionEnabled,
                captionDataList: mergedCaptionDataList,
                captionConfigState: captionConfigState,
                videoWidth: videoPlayerUIData.videoWidth,
                videoHeight: videoPlayerUIData.videoHeight,
                captionAreaTop: videoPlayerUIData.captionAreaTop,
                captionAreaVerticalPadding: videoPlayerUIData.captionAreaVerticalPadding,
                captionOneLineHeight: videoPlayerUIData.captionOneLineHeight,

                musicIndex: editingMusicIndex,
                cuttingAreaStartSec: musicStartSec,
                cuttingAreaEndSec: musicStartSec + realVideoDuration,
                volumePercentage: Math.round(musicVolume * 100),
            };
        } else {
            return null;
        }
    }, [isCaptionEnabled, captionDataList, taskId, videoPlayerUIData, videoDuration, realVideoDuration, captionConfigState, editingMusicIndex, musicStartSec, musicVolume, sceneSpeedList]);

    const onClickFinish = useCallback(async () => {
        setIsFinishLoading(true);

        try {
            if (finalVideoMergeData) {
                if (!taskId) {
                    throw Error("taskId must be provided");
                }

                await videoClientAPI.patchVideoTaskByTaskId(taskId, {
                    final_video_merge_data: finalVideoMergeData,
                })
                const result = await videoClientAPI.postVideoMergeFinal(taskId);

                if (result && result.success) {
                    console.log('최종 병합 요청 성공:', result.captionPredictionId);
                    window.location.href = '/workspace/dashboard';
                } else {
                    console.error('최종 병합 요청 실패:', result?.error);
                }

                setIsFinishLoading(false);

                return;
            } else {
                setIsFinishLoading(false);
                alert('Failed to prepare video data. Please try again.');
                return;
            }
        } catch (error) {
            console.error(error);
            setIsFinishLoading(false);
        }
    }, [taskId, finalVideoMergeData]);

    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

    const onClickAutoSave = useCallback(async () => {
        if (!finalVideoMergeData || !taskId || !videoData || isSaveLoading || isFinishLoading) return;
        setSaveStatus('saving');
        try {
            const updatedSceneBreakdownList = videoData.sceneBreakdownList.map((sceneData) => {
                const speedObj = sceneSpeedList.find(s => s.sceneNumber === sceneData.sceneNumber);
                return {
                    ...sceneData,
                    speedMultiplier: speedObj?.speedMultiplier ?? sceneData.speedMultiplier,
                };
            });
            await videoClientAPI.patchVideoTaskByTaskId(taskId, {
                final_video_merge_data: finalVideoMergeData,
                scene_breakdown_list: updatedSceneBreakdownList,
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('[AutoSave] Save failed:', error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        }
    }, [taskId, finalVideoMergeData, videoData, sceneSpeedList, isSaveLoading, isFinishLoading]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (taskId && finalVideoMergeData && videoData && !isSaveLoading && !isFinishLoading) {
                onClickAutoSave();
            }
        }, 30000);
        return () => clearInterval(interval);
    }, [taskId, finalVideoMergeData, videoData, isSaveLoading, isFinishLoading, onClickAutoSave]);

    const onClickSave = useCallback(async () => {
        if (!finalVideoMergeData || !taskId || !videoData) return;
        setIsSaveLoading(true);
        setSaveStatus('saving');
        try {
            // 현재 배속 설정을 scene_breakdown_list에 반영
            const updatedSceneBreakdownList = videoData.sceneBreakdownList.map((sceneData) => {
                const speedObj = sceneSpeedList.find(s => s.sceneNumber === sceneData.sceneNumber);
                return {
                    ...sceneData,
                    speedMultiplier: speedObj?.speedMultiplier ?? sceneData.speedMultiplier,
                };
            });
            await videoClientAPI.patchVideoTaskByTaskId(taskId, {
                final_video_merge_data: finalVideoMergeData,
                scene_breakdown_list: updatedSceneBreakdownList,
            });
            setIsSaveSuccess(true);
            setSaveStatus('saved');
            setTimeout(() => {
                setIsSaveSuccess(false);
                setSaveStatus('idle');
            }, 2500);
        } catch (error) {
            console.error(error);
            setSaveStatus('error');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } finally {
            setIsSaveLoading(false);
        }
    }, [taskId, finalVideoMergeData, videoData, sceneSpeedList]);

    const onToggleIsCaptionEnabled = useCallback(() => {
        setIsCaptionEnabled(prev => !prev)
    }, []);

    const onClickSceneSequence = useCallback((sceneStartSec: number) => {
        videoPlayerRef.current?.seekTo(sceneStartSec);
        setVideoCurrentTime(sceneStartSec);
    }, []);
    
    const onChangeVideoPanelContainerHeight = useCallback((videoPanelContainerHeight: number) => {
        setVideoPanelHeight(videoPanelContainerHeight);
    }, []);

    const onChangeCaptionConfigState = useCallback((captionConfig: CaptionConfigState) => {
        setCaptionConfigState(captionConfig);
    }, []);

    const onChangeVideoPlayerUIData = useCallback((uiData: VideoPlayerUIData) => {
        setVideoPlayerUIData(uiData);
    }, []);

    const onFinishSceneSequencePanelLoading = useCallback(() => {
        setIsSceneSequencePanelLoading(false);
    }, []);

    const onFinishVideoPlayerPanelLoading = useCallback(() => {
        setIsVideoPlayerPanelLoading(false);
    }, []);

    const onChangeVideoCurrentTime = useCallback((newCurrentTime: number) => {
        setVideoCurrentTime((prevCurrentTime) => {
            return prevCurrentTime !== newCurrentTime
                ? newCurrentTime
                : prevCurrentTime;
        });
    }, []);

    const onChangeSceneSpeed = useCallback((sceneNumber: number, speedMultiplier: number) => {
        setSceneSpeedList((prev) => {
            return prev.map((s) => {
                return s.sceneNumber === sceneNumber
                    ? { ...s, speedMultiplier: speedMultiplier }
                    : s;
            });
        });
    }, []);

    const onChangeMusicStartSec = useCallback((newStartSec: number) => {
        setMusicStartSec(newStartSec);
    }, []);

    const onChangeMusicVolume = useCallback((newVolume: number) => {
        setMusicVolume(newVolume);
    }, []);

    const onChangeIsMusicMuted = useCallback((newIsMuted: boolean) => {
        setIsMusicMuted(newIsMuted);
    }, []);

    const onSelectMusic = useCallback((musicIndex: number) => {
        setEditingMusicIndex(musicIndex);
    }, []);

    // Color Picker Logic
    const [colorPickerState, setColorPickerState] = useState<ColorPickerState>({
        isOpen: false,
        type: null,
        position: { top: 0, left: 0 },
        color: '#FFFFFF'
    });

    const onOpenColorPicker = useCallback((type: ColorPickerType, anchor: HTMLElement) => {
        const rect = anchor.getBoundingClientRect();

        // 현재 선택된 색상 가져오기
        let currentColor = '#FFFFFF';

        switch (type) {
            case 'activeColor': {
                currentColor = captionConfigState.activeColor;
                break;
            }
            case 'inactiveColor': {
                currentColor = captionConfigState.inactiveColor;
                break;
            }
            case 'activeOutlineColor': {
                currentColor = captionConfigState.activeOutlineColor;
                break;
            }
            case 'inactiveOutlineColor': {
                currentColor = captionConfigState.inactiveOutlineColor;
                break;
            }
        }

        setColorPickerState({
            isOpen: true,
            type: type,
            position: {
                top: rect.bottom + 8,
                left: rect.left
            },
            color: currentColor
        });
    }, [captionConfigState]);

    const onCloseColorPicker = useCallback(() => {
        setColorPickerState(prev => ({ ...prev, isOpen: false }));
    }, []);

    const onChangeColorPickerColor = useCallback((newColor: string) => {
        setColorPickerState(prev => ({ ...prev, color: newColor }));

        if (!colorPickerState.type) return;

        setCaptionConfigState(prev => {
            const newState = { ...prev };

            switch (colorPickerState.type) {
                case 'activeColor': {
                    newState.activeColor = newColor.toUpperCase();
                    break;
                }
                case 'inactiveColor': {
                    newState.inactiveColor = newColor.toUpperCase();
                    break;
                }
                case 'activeOutlineColor': {
                    newState.activeOutlineColor = newColor.toUpperCase();
                    break;
                }
                case 'inactiveOutlineColor': {
                    newState.inactiveOutlineColor = newColor.toUpperCase();
                    break;
                }
            }

            return newState;
        });
    }, [colorPickerState.type]);

    useEffect(() => {
        if (taskId) {
            const loadData = async () => {
                setIsPublicDataLoading(true);

                // Font Initialization
                const newFamilyList = FONT_FAMILY_LIST.sort((a, b) => {
                    return a.name.localeCompare(b.name);
                });
                setFontFamilyList(newFamilyList);

                // Task Data Initialization
                const userId = user?.id || searchParams.get('userId') || "";
                const [urlsResult, videoGenerationTask] = await Promise.all([
                    videoClientAPI.getVideoTaskUrls(taskId, userId),
                    videoClientAPI.getVideoTaskByTaskId(taskId)
                ]);

                if (!urlsResult || !videoGenerationTask) {
                    throw new Error("There is no video generation task");
                }

                if (videoGenerationTask.status !== VideoGenerationTaskStatus.EDITOR) {
                    throw new Error("Invalid task status for editor")
                }

                // 종횡비 및 해상도, AI 모델 설정 적용
                setAspectRatio(videoGenerationTask.aspect_ratio ?? '9:16');
                setGlobalResolution(videoGenerationTask.resolution ?? '1080p');
                if (videoGenerationTask.ai_model_config) {
                    setTaskAiModelConfig({
                        sceneImageI2IModelId: videoGenerationTask.ai_model_config.sceneImageI2IModelId,
                        videoModelId: videoGenerationTask.ai_model_config.videoModelId,
                    });
                }

                // 각 씬의 시작/종료 시간 및 자막 세그먼트 계산
                let accumulatedTime = 0;
                const initialSpeedList: { sceneNumber: number; speedMultiplier: number; }[] = [];
                const captionDataList = videoGenerationTask.scene_breakdown_list.map((sceneData, index, array) => {
                    const subtitleSegmentationList = sceneData.sceneSubtitleSegments ?? [];
                    const startSec = subtitleSegmentationList[0]?.startSec ?? accumulatedTime;

                    // DB 데이터 오염 방지 및 1.0배속 순수 원본 sceneDuration 도출
                    let originalSceneDuration: number;
                    if (subtitleSegmentationList.length > 0) {
                        const isLastScene = index === array.length - 1;
                        if (isLastScene) {
                            originalSceneDuration = subtitleSegmentationList[subtitleSegmentationList.length - 1].endSec - subtitleSegmentationList[0].startSec + 0.75;
                        } else {
                            const nextSubtitleList = array[index + 1]?.sceneSubtitleSegments ?? [];
                            if (nextSubtitleList.length > 0) {
                                originalSceneDuration = nextSubtitleList[0].startSec - subtitleSegmentationList[0].startSec;
                            } else {
                                originalSceneDuration = sceneData.sceneDuration;
                            }
                        }
                    } else {
                        originalSceneDuration = sceneData.sceneDuration;
                    }

                    const endSec = startSec + originalSceneDuration;
                    accumulatedTime = endSec;

                    const speed = sceneData.speedMultiplier ?? 1.0;

                    initialSpeedList.push({
                        sceneNumber: sceneData.sceneNumber,
                        speedMultiplier: speed,
                    });

                    return {
                        sceneNumber: sceneData.sceneNumber,
                        script: sceneData.narration,
                        startSec: startSec,
                        endSec: endSec,
                        subtitleSegmentationList: subtitleSegmentationList,
                        speedMultiplier: speed,
                    };
                });

                setSceneSpeedList(initialSpeedList);

                setVideoData({
                    title: videoGenerationTask.video_title ?? "",
                    scenesUrlData: urlsResult.scenes,
                    captionDataList: captionDataList,
                    sceneBreakdownList: videoGenerationTask.scene_breakdown_list,
                });

                const musicDataList = await musicClientAPI.getMusicData(taskId);

                if (!musicDataList) {
                    throw new Error(`Failed to load music data for task: ${taskId}`);
                }

                setMusicDataList(musicDataList);

                // final_video_merge_data가 있으면 이전 편집 설정을 초기 상태로 복원 (1회)
                const savedData = videoGenerationTask.final_video_merge_data;
                if (savedData) {
                    setIsCaptionEnabled(savedData.isCaptionEnabled);
                    setCaptionConfigState(savedData.captionConfigState);
                    setMusicStartSec(savedData.cuttingAreaStartSec);
                    setMusicVolume(savedData.volumePercentage / 100);
                    setEditingMusicIndex(savedData.musicIndex);
                }
            }

            loadData().then(() => {
                setIsPublicDataLoading(false);
            }).catch((error) => {
                console.error(error);

                if (window.history.length > 1) {
                    console.log("back")
                    window.history.back()
                } else {
                    console.log("href")
                    window.location.href = '/workspace/dashboard'
                }
            });
        } else {
            if (window.history.length > 1) {
                console.log("back")
                window.history.back()
            } else {
                console.log("href")
                window.location.href = '/workspace/dashboard'
            }
        }
    }, [router, taskId]);

    useEffect(() => {
        if (headerRef.current) {
            setHeaderHeight(headerRef.current.offsetHeight);
        }
    }, []);

    useEffect(() => {
        let timeout: NodeJS.Timeout;

        if (!user) {
            timeout = setTimeout(() => {
                router.push('/');
            }, 10000);
        }

        return () => {
            clearTimeout(timeout);
        };
    }, [user, router]);

    return (
        <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden">
            {/* Premium Loading Overlay */}
            {(isInitialLoading || isFinishLoading) && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center animate-in fade-in duration-300">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl">
                        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
                        <p className="text-sm font-medium text-zinc-300">
                            {isFinishLoading ? 'Rendering Final Video...' : 'Loading Editor...'}
                        </p>
                    </div>
                </div>
            )}

            {/* Floating Save Status Pill */}
            {saveStatus !== 'idle' && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full border backdrop-blur-md shadow-lg transition-all ${
                        saveStatus === 'saving' ? 'bg-zinc-900/80 border-white/10 text-zinc-300' :
                        saveStatus === 'saved' ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-300' :
                        'bg-red-900/20 border-red-500/20 text-red-300'
                    }`}>
                        {saveStatus === 'saving' && <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />}
                        {saveStatus === 'saved' && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                        {saveStatus === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-[13px] font-medium">
                            {saveStatus === 'saving' ? 'Auto-saving...' :
                             saveStatus === 'saved' ? 'Saved' :
                             'Connection lost'}
                        </span>
                    </div>
                </div>
            )}
            {/* Top Header */}
            <div
                ref={headerRef}
                className="flex items-center justify-between pl-3 pr-6 py-4 border-b border-white/5 bg-zinc-950/80 backdrop-blur-sm"
            >
                <div className="flex items-center">
                    <Link 
                        href="/workspace/dashboard"
                        className="text-zinc-500 hover:text-zinc-300 transition-colors"
                        title="Back to Dashboard"
                    >
                        <ChevronLeft size={40} />
                    </Link>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={64}
                        height={64}
                        className="w-16 h-16 cursor-pointer"
                        onClick={() => {
                            router.push('/');
                        }}
                    />
                    <div className="flex flex-col ml-4">
                        <span className="text-2xl font-bold text-zinc-100 cursor-default leading-none">
                            Video Editor
                        </span>
                        <p className="text-zinc-500 text-[13px] mt-0.5 cursor-default pl-0.5">
                            We&#39;re almost there.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onClickSave}
                        disabled={isSaveLoading || isFinishLoading}
                        className={`border px-5 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                            isSaveSuccess
                                ? 'border-green-500/50 text-green-400'
                                : 'border-white/20 hover:border-white/40 text-zinc-300 hover:text-white'
                        }`}
                    >
                        {isSaveLoading ? 'Saving...' : isSaveSuccess ? 'Saved ✓' : 'Save'}
                    </button>
                    <button
                        onClick={onClickFinish}
                        disabled={isFinishLoading || isSaveLoading}
                        className="bg-white hover:bg-zinc-200 text-black px-5 py-2 rounded-lg text-sm font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFinishLoading ? 'Finishing...' : 'Finish'}
                    </button>
                </div>
            </div>

            <div
                className="flex"
                style={{ height: headerHeight > 0 ? `calc(100vh - ${headerHeight}px)` : '100vh' }}
            >
                {/* Sequences Panel */}
                {taskId && <div className="flex-[0.24] h-full px-3 bg-zinc-900/30 backdrop-blur-sm border-r border-white/5 overflow-y-auto">
                    <SceneSequencePanel
                        taskId={taskId}
                        captionDataList={captionDataList}
                        sceneBreakdownList={videoData?.sceneBreakdownList}
                        imageUrlList={sceneImageUrlList}
                        currentSceneIndex={currentSceneIndex}
                        aspectRatio={aspectRatio}
                        sceneRealStartTimes={sceneRealStartTimes}
                        onClickSceneSequence={onClickSceneSequence}
                        onFinishLoading={onFinishSceneSequencePanelLoading}
                        onImagesLoaded={(urls) => setSceneImageUrlList(urls)}
                        onClickZoomImage={(index) => setLightboxSceneIndex(index)}
                        onOpenImageRegenerateModal={onOpenImageRegenerateModal}
                        onOpenVideoRegenerateModal={onOpenVideoRegenerateModal}
                    />
                </div>}

                {/* Config + Video + Music Edit Panel Column */}
                <div className="flex-[0.76] h-full flex flex-col">
                    {/* Config + Video Row */}
                    {/*<div className="flex-[0.65] flex">*/}
                    <div className="flex flex-[0.83] flex-row min-h-0">
                        {/* Config Panel */}
                        {/*<div className="flex-[0.34] h-full bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 flex flex-col">*/}
                        <div className="flex-[0.34] bg-zinc-900/30 backdrop-blur-sm border-r border-white/5 flex flex-col">
                            {/* Tab Navigation */}
                            <div className="flex items-end px-4 pt-4">
                                <button
                                    onClick={() => setActiveConfigPanel(ConfigPanelType.Caption)}
                                    className={`px-6 py-2 text-[15px] font-medium transition-all relative ${
                                        activeConfigPanel === ConfigPanelType.Caption
                                            ? 'text-zinc-100 border-b-2 border-white'
                                            : 'text-zinc-500 border-b-2 border-transparent hover:text-zinc-300'
                                    }`}
                                >
                                    Caption
                                </button>
                                <button
                                    onClick={() => setActiveConfigPanel(ConfigPanelType.Music)}
                                    className={`px-6 py-2 text-[15px] font-medium transition-all relative ${
                                        activeConfigPanel === ConfigPanelType.Music
                                            ? 'text-zinc-100 border-b-2 border-white'
                                            : 'text-zinc-500 border-b-2 border-transparent hover:text-zinc-300'
                                    }`}
                                >
                                    Music
                                </button>
                            </div>

                            {/* Tab Border Line */}
                            <div className="border-t border-white/5 mx-4 -mt-[2px]"></div>

                            {/* Panel Content */}
                            <div className="flex-1 px-3 overflow-y-auto">
                                {activeConfigPanel === ConfigPanelType.Caption && (
                                    <CaptionConfigPanel
                                        isCaptionEnabled={isCaptionEnabled}
                                        captionConfigState={captionConfigState}
                                        fontFamilyList={fontFamilyList}
                                        selectedFontFamilyWeightList={selectedFontFamilyWeightList}
                                        selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                                        onToggleIsCaptionEnabled={onToggleIsCaptionEnabled}
                                        onChangeCaptionConfigState={onChangeCaptionConfigState}
                                        onOpenColorPicker={onOpenColorPicker}
                                        showPositionSelector={true}
                                        aspectRatio={aspectRatio}
                                    />
                                )}
                                {activeConfigPanel === ConfigPanelType.Music && (
                                    <MusicPanel
                                        musicDataList={musicDataList}
                                        videoDuration={videoDuration}
                                        onSelectMusic={onSelectMusic}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Video Player */}
                        {/*{videoData && <div className="flex-[0.66] h-full">*/}
                        {videoData && musicPlayConfig && <div className="flex-[0.66] h-full">
                            <VideoPlayerPanel
                                ref={videoPlayerRef}
                                scenesUrlData={videoData.scenesUrlData}
                                currentTime={videoCurrentTime}
                                isCaptionEnabled={isCaptionEnabled}
                                captionDataList={captionDataList}
                                captionConfigState={captionConfigState}
                                musicPlayConfig={musicPlayConfig}
                                selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                                sceneSpeedList={sceneSpeedList}
                                sceneRealStartTimes={sceneRealStartTimes}
                                onChangeVideoPanelContainerHeight={onChangeVideoPanelContainerHeight}
                                onChangeCaptionConfigState={onChangeCaptionConfigState}
                                onChangeVideoPlayerUIData={onChangeVideoPlayerUIData}
                                onChangeCurrentTime={onChangeVideoCurrentTime}
                                onChangeSceneSpeed={onChangeSceneSpeed}
                                onFinishLoading={onFinishVideoPlayerPanelLoading}
                            />
                        </div>}
                    </div>

                    {/* Music Edit Panel */}
                    {musicEditPanelHeight && editingMusicData && <div
                        className="flex-[0.17]"
                        style={{ width: '100%', height: `${musicEditPanelHeight}px` }}
                    >
                        <MusicEditPanel
                            musicData={editingMusicData}
                            videoDuration={realVideoDuration}
                            initialVolume={musicVolume}
                            initialStartSec={musicStartSec}
                            panelHeight={musicEditPanelHeight}
                            onChangeMusicStartSec={onChangeMusicStartSec}
                            onChangeMusicVolume={onChangeMusicVolume}
                            onChangeIsMuted={onChangeIsMusicMuted}
                        />
                    </div>}
                </div>
            </div>
            {/* Color Picker Popover */}
            {colorPickerState.isOpen && (
                <ColorPickerPopover
                    color={colorPickerState.color}
                    onChange={onChangeColorPickerColor}
                    position={colorPickerState.position}
                    onClose={onCloseColorPicker}
                />
            )}

            {/* 고화질 원본 씬 이미지 라이트박스 모달 (페이지 최상위 정석 아키텍처) */}
            <SceneImageLightboxModal
                isOpen={lightboxSceneIndex !== null}
                currentIndex={lightboxSceneIndex}
                captionDataList={captionDataList}
                imageUrlList={sceneImageUrlList}
                aspectRatio={aspectRatio}
                onClose={() => setLightboxSceneIndex(null)}
                onChangeIndex={(newIndex) => setLightboxSceneIndex(newIndex)}
            />

            {/* 단건 씬 재생성 통합 모달 (페이지 최상위 정석 아키텍처) */}
            <SceneRegenerateModal
                isOpen={regenerateModalState.isOpen}
                mode={regenerateModalState.mode}
                sceneNumber={regenerateModalState.sceneNumber}
                sceneDuration={regenerateModalState.sceneDuration}
                aiModelList={aiModelList}
                globalResolution={globalResolution}
                defaultModelId={regenerateModalState.selectedModelId}
                defaultVideoModelId={taskAiModelConfig?.videoModelId}
                onClose={() => setRegenerateModalState(prev => ({ ...prev, isOpen: false }))}
                onConfirmRegenerate={handleConfirmRegenerate}
            />
        </div>
    )
}

export default memo(WorkspaceEditorPageClient);