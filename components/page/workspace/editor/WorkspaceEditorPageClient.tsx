'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {useRouter, useSearchParams} from 'next/navigation';
import { Image as ImageIcon, Type, Music, RotateCcw, ChevronLeft } from 'lucide-react';
import { fontMap, type FontName } from "@/lib/fonts";
import FONT_FAMILY_LIST, {FontFamily} from "@/lib/FontFamilyList";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {SubtitleSegment} from "@/api/types/supabase/VideoGenerationTasks";
import SceneSequencePanel from "@/components/page/workspace/editor/SceneSequencePanel";
import CaptionConfigPanel from "@/components/page/workspace/editor/CaptionConfigPanel";
import VideoPlayerPanel, {VideoPlayerHandle} from "@/components/page/workspace/editor/VideoPlayerPanel";
import MusicPanel from "@/components/page/workspace/editor/MusicPanel";

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
    isShadowEnabled: boolean;
    shadowIntensity: number; // 0-100 (maps to opacity)
    shadowThickness: number; // 0-100 (maps to blur-radius)

    // Color settings state
    activeColor: string;
    inactiveColor: string;
    activeOutlineColor: string;
    inactiveOutlineColor: string;
    activeOutlineEnabled: boolean;
    inactiveOutlineEnabled: boolean;
}

enum SidebarType {
    Scene = 'scene',
    Caption = 'caption',
    Music = 'music'
}

const INITIAL_CAPTION_CONFIG_STATE: CaptionConfigState = {
    // Font settings state
    fontFamilyName: "Roboto",
    fontSize: 60,
    fontWeight: 900,

    // Caption settings state
    captionPosition: 80,
    captionHeight: 0,
    showCaptionLine: true,

    // Shadow settings state
    isShadowEnabled: true,
    shadowIntensity: 80,
    shadowThickness: 50,

    // Color settings state
    activeColor:'#FFFFFF',
    inactiveColor:'#A0A0A0',
    activeOutlineEnabled: false,
    activeOutlineColor:'#000000',
    inactiveOutlineEnabled:false,
    inactiveOutlineColor:'#404040',
}

function WorkspaceEditorPageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const taskId = searchParams.get('taskId');

    const videoPlayerRef = useRef<VideoPlayerHandle>(null);

    const sidebarItems = useMemo(() => [
        { id: SidebarType.Scene, icon: ImageIcon, name: 'Scene' },
        { id: SidebarType.Caption, icon: Type, name: 'Caption' },
        { id: SidebarType.Music, icon: Music, name: 'Music' }
    ], []);
    const [activeSidebar, setActiveSidebar] = useState<SidebarType>(SidebarType.Scene);

    const [isPublicDataLoading, setIsPublicDataLoading] = useState(true);
    const [isSceneSequencePanelLoading, setIsSceneSequencePanelLoading] = useState(true);
    const [isVideoPlayerPanelLoading, setIsVideoPlayerPanelLoading] = useState(true);

    const isLoading = useMemo(() => {
        return isPublicDataLoading || isSceneSequencePanelLoading || isVideoPlayerPanelLoading;
    }, [isPublicDataLoading, isSceneSequencePanelLoading, isVideoPlayerPanelLoading]);

    const [videoData, setVideoData] = useState<VideoData | null>(null);

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

    const [videoCurrentTime, setVideoCurrentTime] = useState<number>(0.0);
    const currentSceneIndex = useMemo(() => {
        return captionDataList.findIndex((captionData, index) => {
            return index === 0
                ? 0.00 <= videoCurrentTime && captionData.endSec >= videoCurrentTime
                : captionData.startSec <= videoCurrentTime && captionData.endSec >= videoCurrentTime;
        });
    }, [captionDataList, videoCurrentTime]);

    const onClickSceneSequence = useCallback((sceneStartSec: number) => {
        videoPlayerRef.current?.seekTo(sceneStartSec);
        setVideoCurrentTime(sceneStartSec);
    }, []);

    const onChangeCaptionConfigState = useCallback((captionConfig: CaptionConfigState) => {
        setCaptionConfigState(captionConfig);
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

    const onExportVideo = useCallback(async () => {
        console.log('Exporting video...');
        // Download or redirect logic
    }, []);

    useEffect(() => {
        if (taskId) {
            try {
                const loadData = async () => {
                    setIsPublicDataLoading(true);

                    // Font Initialization
                    const newFamilyList = FONT_FAMILY_LIST.sort((a, b) => {
                        return a.name.localeCompare(b.name);
                    });
                    setFontFamilyList(newFamilyList);

                    // Task Data Initialization
                    const [taskVideoUrl, videoGenerationTask] = await Promise.all([
                        videoClientAPI.getVideoUrl(taskId),
                        videoClientAPI.getVideoTaskByTaskId(taskId)
                    ]);

                    if (!taskVideoUrl || !videoGenerationTask) {
                        throw new Error("There is no video generation task");
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
                        title: videoGenerationTask.video_main_subject ?? "",
                        videoUrl: taskVideoUrl,
                        captionDataList: captionDataList,
                    });
                }

                loadData().then(() => {
                    setIsPublicDataLoading(false);
                });
            } catch (error) {
                console.error(error);
                setIsPublicDataLoading(false);
                router.back();
            }
        }
    }, [router, taskId]);

    useEffect(() => {
        console.log("videoCurrentTime", videoCurrentTime);
    }, [videoCurrentTime]);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Top Header */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center pl-3">
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
                        className="w-16 h-16"
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
                <div className="flex items-center space-x-4 px-6">
                    <button className="text-gray-400 hover:text-pink-400 transition-colors">
                        <RotateCcw size={20} />
                    </button>
                    <button className="text-gray-400 hover:text-pink-400 transition-colors">
                        <RotateCcw size={20} className="transform scale-x-[-1]" />
                    </button>
                    <div className="flex items-center space-x-2 text-gray-400">
                        <span className="text-sm">Watermark</span>
                        <button className="w-10 h-6 bg-gray-800 rounded-full relative border border-purple-500/30">
                            <div className="w-4 h-4 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full absolute top-1 right-1"></div>
                        </button>
                    </div>
                    <button 
                        onClick={onExportVideo}
                        className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all"
                    >
                        Export / Share
                    </button>
                </div>
            </div>

            <div className="flex h-[calc(100vh-73px)]">
                {/* Left Sidebar */}
                <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4">
                    {sidebarItems.map((item) => {
                        const IconComponent = item.icon;
                        return (
                            <button
                                key={item.id}
                                onClick={() => setActiveSidebar(item.id)}
                                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border ${
                                    activeSidebar === item.id 
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                                }`}
                                title={item.name}
                            >
                                <IconComponent size={24} />
                                <span className="text-sm mt-1 leading-tight">{item.name}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Sequences Panel */}
                {taskId && <div className="flex-1 bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
                    {activeSidebar === SidebarType.Scene && (<SceneSequencePanel
                        taskId={taskId}
                        captionDataList={captionDataList}
                        currentSceneIndex={currentSceneIndex}
                        onClickSceneSequence={onClickSceneSequence}
                        onFinishLoading={onFinishSceneSequencePanelLoading}
                    />)}

                    {activeSidebar === SidebarType.Caption && (<CaptionConfigPanel
                        captionConfigState={captionConfigState}
                        fontFamilyNameList={fontFamilyList.map(font => font.name)}
                        selectedFontFamilyWeightList={selectedFontFamilyWeightList}
                        selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                        onChangeCaptionConfigState={onChangeCaptionConfigState}
                    />)}

                    {activeSidebar === SidebarType.Music && (<MusicPanel/>)}
                </div>}

                {/* Video Player */}
                {videoData && <VideoPlayerPanel
                    ref={videoPlayerRef}
                    videoUrl={videoData.videoUrl}
                    currentTime={videoCurrentTime}
                    captionDataList={captionDataList}
                    captionConfigState={captionConfigState}
                    selectedFontFamilyFullShape={selectedFontFamilyFullShape}
                    onChangeCaptionConfigState={onChangeCaptionConfigState}
                    onChangeCurrentTime={onChangeVideoCurrentTime}
                    onFinishLoading={onFinishVideoPlayerPanelLoading}
                />}
            </div>
            {/* Loading Overlay */}
            {isLoading && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"/>
                    <p className="text-gray-400">Loading your pure video...</p>
                </div>
            </div>)}
        </div>
    )
}

export default memo(WorkspaceEditorPageClient);