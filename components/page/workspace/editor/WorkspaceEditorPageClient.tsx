'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {useRouter, useSearchParams} from 'next/navigation';
import { RotateCcw, ChevronLeft } from 'lucide-react';
import { fontMap, type FontName } from "@/lib/fonts";
import FONT_FAMILY_LIST, {FontFamily} from "@/lib/FontFamilyList";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {
    FinalVideoMergeData,
    MusicData,
    SubtitleSegment,
    VideoGenerationTaskStatus
} from "@/api/types/supabase/VideoGenerationTasks";
import SceneSequencePanel from "@/components/page/workspace/editor/SceneSequencePanel";
import CaptionConfigPanel, {ColorPickerType} from "@/components/page/workspace/editor/CaptionConfigPanel";
import VideoPlayerPanel, {VideoPlayerHandle} from "@/components/page/workspace/editor/VideoPlayerPanel";
import MusicPanel from "@/components/page/workspace/editor/MusicPanel";
import MusicEditPanel from "@/components/page/workspace/editor/MusicEditPanel";
import {musicClientAPI} from "@/api/client/musicClientAPI";
import ColorPickerPopover from "@/components/page/workspace/editor/ColorPickerPopover";

interface VideoData {
    title: string;
    videoUrl: string;
    captionDataList: CaptionData[];
}

export interface CaptionData {
    sceneNumber: number;
    script: string;
    startSec: number;
    endSec: number;
    subtitleSegmentationList: SubtitleSegment[];
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

    const [videoData, setVideoData] = useState<VideoData | null>(null);

    const [isCaptionEnabled, setIsCaptionEnabled] = useState(true);

    const captionDataList = useMemo(() => {
        return videoData?.captionDataList ?? []
    }, [videoData]);

    const [captionConfigState, setCaptionConfigState] = useState<CaptionConfigState>(INITIAL_CAPTION_CONFIG_STATE);

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
            return index === 0
                ? 0.00 <= videoCurrentTime && captionData.endSec >= videoCurrentTime
                : captionData.startSec <= videoCurrentTime && captionData.endSec >= videoCurrentTime;
        });
    }, [captionDataList, videoCurrentTime]);

    const [musicDataList, setMusicDataList] = useState<MusicData[]>([]);
    const videoDuration = useMemo(() => {
        return captionDataList.length > 0
            ? captionDataList[captionDataList.length - 1].endSec
            : 0
    }, [captionDataList]);

    const [editingMusicIndex, setEditingMusicIndex] = useState<number>(0);
    const editingMusicData = useMemo(() => {
        return musicDataList.length !== 0
            ? musicDataList[editingMusicIndex]
            : null;
    }, [musicDataList, editingMusicIndex]);

    const [musicStartSec, setMusicStartSec] = useState<number>(0);
    const [musicVolume, setMusicVolume] = useState<number>(0);
    const musicPlayConfig: MusicPlayConfig | null = useMemo(() => {
        return editingMusicData ? {
            audioUrl: editingMusicData.audioUrl,
            startSec: musicStartSec,
            duration: videoDuration,
            volume: musicVolume,
        } : null;
    }, [editingMusicData, musicStartSec, videoDuration, musicVolume]);

    const finalVideoMergeData: FinalVideoMergeData | null = useMemo(() => {
        if (captionDataList.length !== 0 && taskId && videoPlayerUIData && videoDuration > 0) {
            return {
                isCaptionEnabled: isCaptionEnabled,
                captionDataList: captionDataList,
                captionConfigState: captionConfigState,
                videoWidth: videoPlayerUIData.videoWidth,
                videoHeight: videoPlayerUIData.videoHeight,
                captionAreaTop: videoPlayerUIData.captionAreaTop,
                captionAreaVerticalPadding: videoPlayerUIData.captionAreaVerticalPadding,
                captionOneLineHeight: videoPlayerUIData.captionOneLineHeight,

                musicIndex: editingMusicIndex,
                cuttingAreaStartSec: musicStartSec,
                cuttingAreaEndSec: musicStartSec + videoDuration,
                volumePercentage: Math.round(musicVolume * 100),
            };
        } else {
            return null;
        }
    }, [isCaptionEnabled, captionDataList, taskId, videoPlayerUIData, videoDuration, captionConfigState, editingMusicIndex, musicStartSec, musicVolume]);

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

    const onChangeMusicStartSec = useCallback((newStartSec: number) => {
        setMusicStartSec(newStartSec);
    }, []);

    const onChangeMusicVolume = useCallback((newVolume: number) => {
        setMusicVolume(newVolume);
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
                const [taskVideoUrl, videoGenerationTask] = await Promise.all([
                    videoClientAPI.getVideoVoiceUrl(taskId),
                    videoClientAPI.getVideoTaskByTaskId(taskId)
                ]);

                if (!taskVideoUrl || !videoGenerationTask) {
                    throw new Error("There is no video generation task");
                }

                if (videoGenerationTask.status !== VideoGenerationTaskStatus.EDITOR) {
                    throw new Error("Invalid task status for editor")
                }

                // 각 씬의 시작/종료 시간 및 자막 세그먼트 계산
                let accumulatedTime = 0;
                const captionDataList = videoGenerationTask.scene_breakdown_list.map((sceneData) => {
                    const subtitleSegmentationList = sceneData.sceneSubtitleSegments ?? [];
                    const startSec = subtitleSegmentationList[0].startSec ?? accumulatedTime;
                    const endSec = subtitleSegmentationList[subtitleSegmentationList.length - 1].endSec;

                    accumulatedTime = endSec;

                    return {
                        sceneNumber: sceneData.sceneNumber,
                        script: sceneData.narration,
                        startSec: startSec,
                        endSec: endSec,
                        subtitleSegmentationList: subtitleSegmentationList
                    }
                });

                setVideoData({
                    title: videoGenerationTask.video_title ?? "",
                    videoUrl: taskVideoUrl,
                    captionDataList: captionDataList,
                });

                const musicDataList = await musicClientAPI.getMusicData(taskId);

                if (!musicDataList) {
                    throw new Error(`Failed to load music data for task: ${taskId}`);
                }

                setMusicDataList(musicDataList);
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

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top Header */}
            <div
                ref={headerRef}
                className="flex items-center justify-between pl-3 pr-6 py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm"
            >
                <div className="flex items-center">
                    <Link 
                        href="/workspace/dashboard"
                        className="text-gray-400 hover:text-pink-400 transition-colors"
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
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                            Video Editor
                        </span>
                        <p className="text-gray-400 text-base pl-0.5">
                            We&#39;re almost there.
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClickFinish}
                    className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                >
                    Finish
                </button>
            </div>

            <div
                className="flex"
                style={{ height: headerHeight > 0 ? `calc(100vh - ${headerHeight}px)` : '100vh' }}
            >
                {/* Sequences Panel */}
                {taskId && <div className="flex-[0.24] h-full px-3 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
                    <SceneSequencePanel
                        taskId={taskId}
                        captionDataList={captionDataList}
                        currentSceneIndex={currentSceneIndex}
                        onClickSceneSequence={onClickSceneSequence}
                        onFinishLoading={onFinishSceneSequencePanelLoading}
                    />
                </div>}

                {/* Config + Video + Music Edit Panel Column */}
                <div className="flex-[0.76] h-full flex flex-col">
                    {/* Config + Video Row */}
                    {/*<div className="flex-[0.65] flex">*/}
                    <div className="flex flex-[0.83] flex-row min-h-0">
                        {/* Config Panel */}
                        {/*<div className="flex-[0.34] h-full bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 flex flex-col">*/}
                        <div className="flex-[0.34] bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 flex flex-col">
                            {/* Tab Navigation */}
                            <div className="flex items-end px-4 pt-4">
                                <button
                                    onClick={() => setActiveConfigPanel(ConfigPanelType.Caption)}
                                    className={`px-6 py-2 text-xl font-medium rounded-t-lg border-t border-l border-r transition-all relative ${
                                        activeConfigPanel === ConfigPanelType.Caption
                                            ? 'text-purple-300 border-purple-400/50 bg-gray-900/30 -mb-px z-10'
                                            : 'text-gray-400 border-transparent bg-gray-800/30 hover:text-purple-200 hover:border-purple-500/30'
                                    }`}
                                >
                                    Caption
                                </button>
                                <button
                                    onClick={() => setActiveConfigPanel(ConfigPanelType.Music)}
                                    className={`px-6 py-2 text-xl font-medium rounded-t-lg border-t border-l border-r transition-all relative ${
                                        activeConfigPanel === ConfigPanelType.Music
                                            ? 'text-purple-300 border-purple-400/50 bg-gray-900/30 -mb-px z-10'
                                            : 'text-gray-400 border-transparent bg-gray-800/30 hover:text-purple-200 hover:border-purple-500/30'
                                    }`}
                                >
                                    Music
                                </button>
                            </div>

                            {/* Tab Border Line */}
                            <div className="border-t border-purple-400/50 mx-4"></div>

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
                        {videoData && musicPlayConfig && <div className="flex-[0.66]">
                            <VideoPlayerPanel
                                ref={videoPlayerRef}
                                videoUrl={videoData.videoUrl}
                                currentTime={videoCurrentTime}
                                isCaptionEnabled={isCaptionEnabled}
                                captionDataList={captionDataList}
                                captionConfigState={captionConfigState}
                                musicPlayConfig={musicPlayConfig}
                                selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                                onChangeVideoPanelContainerHeight={onChangeVideoPanelContainerHeight}
                                onChangeCaptionConfigState={onChangeCaptionConfigState}
                                onChangeVideoPlayerUIData={onChangeVideoPlayerUIData}
                                onChangeCurrentTime={onChangeVideoCurrentTime}
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
                            videoDuration={videoDuration}
                            panelHeight={musicEditPanelHeight}
                            onChangeMusicStartSec={onChangeMusicStartSec}
                            onChangeMusicVolume={onChangeMusicVolume}
                        />
                    </div>}
                </div>
            </div>
            {/* Initial Loading Overlay */}
            {isInitialLoading && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                    <p className="text-gray-400">Loading your pure video...</p>
                </div>
            </div>)}
            {/* Final Loading Overlay */}
            {isFinishLoading && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                    <p className="text-gray-400">Sending your video to the producer...</p>
                </div>
            </div>)}

            {/* Color Picker Popover */}
            {colorPickerState.isOpen && (
                <ColorPickerPopover
                    color={colorPickerState.color}
                    onChange={onChangeColorPickerColor}
                    position={colorPickerState.position}
                    onClose={onCloseColorPicker}
                />
            )}
        </div>
    )
}

export default memo(WorkspaceEditorPageClient);