'use client'

import {memo, useCallback, useEffect, useMemo, useRef, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    Coins,
    Film,
    ListTodo,
    Play,
    Plus,
    Save,
    Sparkles,
    Square,
    X,
} from 'lucide-react';
import {openAIClientAPI} from '@/api/client/openAIClientAPI';
import {ScriptGenerationRequest} from "@/api/types/open-ai/ScriptGeneration";
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, VideoGenerationTask, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import StoryboardItem from "@/components/page/workspace/create/StoryboardItem";
import VoiceSelectionPanel from "@/components/page/workspace/create/VoiceSelectionPanel";
import {useRouter, useSearchParams} from "next/navigation";
import {PostOpenAISceneRequest} from "@/api/types/api/open-ai/scene/PostOpenAISceneRequest";
import DefaultModal from "@/components/public/DefaultModal";
import {useAuth} from "@/context/AuthContext";
import {STYLE_DATA_LIST} from "@/lib/styles";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";

function WorkspaceCreatePageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user } = useAuth();

    const [isVoiceLoading, setIsVoiceLoading] = useState(true);
    const [isGenerationTaskLoading, setIsGenerationTaskLoading] = useState(true);
    const isLoading = useMemo(() => {
        return isVoiceLoading || isGenerationTaskLoading;
    }, [isVoiceLoading, isGenerationTaskLoading]);

    const taskId = useMemo(() => {
        return searchParams.get("taskId") ?? undefined;
    }, [searchParams]);

    // Section states
    const [script, setScript] = useState<string>('');
    const [selectedStyleId, setSelectedStyleId] = useState<string>('');
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    
    // Storyboard states
    const [sceneDataList, setSceneDataList] = useState<SceneData[]>([]);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [videoDescription, setVideoDescription] = useState<string | null>(null);
    const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
    const [isPlayingVoice, setIsPlayingVoice] = useState<boolean>(false);
    const [currentPlayTime, setCurrentPlayTime] = useState<number>(0);

    // Audio ref for voice preview
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const isVideoGenerationEnabled = useMemo(() => {
        const isScriptNotEmpty = script.length !== 0;
        const isSceneDataListNotEmpty = sceneDataList.length !== 0;
        const isVideoMainSubjectNotEmpty = !!videoTitle;
        const isStyleSelected = selectedStyleId.length !== 0;
        const isVoiceSelected = selectedVoiceId.length !== 0;
        
        return isScriptNotEmpty &&
            isSceneDataListNotEmpty &&
            isVideoMainSubjectNotEmpty &&
            isVoiceSelected &&
            isStyleSelected;
    }, [script, sceneDataList, videoTitle, selectedVoiceId, selectedStyleId]);
    
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGeneratingScript, setIsGeneratingScript] = useState(false);
    const [isGeneratingStoryboardData, setIsGeneratingStoryboardData] = useState(false);
    const [showAIModal, setShowAIModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
    const [showVoiceChangeWarningModal, setShowVoiceChangeWarningModal] = useState(false);
    const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
    
    // Collapse states for sections
    const [isStyleExpanded, setIsStyleExpanded] = useState(true);

    const userCreditCount = useMemo(() => {
        return user?.credit_count ?? 0;
    }, [user?.credit_count]);

    const expectedVideoTotalDuration = useMemo(() => {
        // 시간
        return sceneDataList.reduce((acc, sceneData) => {
            return acc + sceneData.sceneDuration;
        }, 0);
    }, [sceneDataList]);

    const expectedVideoSceneCount = useMemo(() => {
        return sceneDataList.length;
    }, [sceneDataList]);

    const expectedCreditUsage = useMemo(() => {
        // 장면 재분할 2
        // 영상 5
        // 장면 5
        // 로직 추가

        const exceededVideoTotalDuration = expectedVideoTotalDuration - 30;
        const exceededVideoSceneCount = expectedVideoSceneCount - 6;

        const exceededDurationUsage = exceededVideoTotalDuration > 0
            ? exceededVideoTotalDuration * 5
            : 0;
        const exceededSceneCountUsage = exceededVideoSceneCount > 0
            ? exceededVideoSceneCount * 5
            : 0;

        return 100 + (exceededDurationUsage + exceededSceneCountUsage);
    }, [expectedVideoTotalDuration, expectedVideoSceneCount]);

    // Style examples for preview
    const styleList = useMemo((): Style[] => STYLE_DATA_LIST, []);

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: ListTodo, name: 'Tasks', href: '/workspace/dashboard' },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create', active: true }
    ], []);

    const onClickGenerateScript = useCallback(async () => {
        if (!aiPrompt.trim()) return;
        
        setIsGeneratingScript(true);
        
        try {
            // API 요청 데이터 구성
            const requestData: ScriptGenerationRequest = {
                userPrompt: aiPrompt,
            };

            console.log('Generating script with data:', requestData);

            // OpenAI API 호출
            const result = await openAIClientAPI.postOpenAIScript(requestData);

            if (!result.data) {
                throw new Error("Failed to generate script.");
            }

            setScript(result.data.script);
            setIsGeneratingScript(false);
            setShowAIModal(false);
            setAiPrompt('');

        } catch (error) {
            console.error('Error generating script:', error);
            alert('An error occurred while generating script. Please try again.');
            setIsGeneratingScript(false);
        }
    }, [aiPrompt]);
    
    const onClickGenerateStoryboard = useCallback(async (voiceId?: string) => {
        try {
            if (!user?.id) return;

            if (!script && !voiceId) {
                throw new Error("Write script and select voice first.")
            }
            if (!script) {
                throw new Error("Write script first.")
            }
            if (!voiceId) {
                throw new Error("Select voice first.")
            }

            setIsGeneratingStoryboardData(true);
            setSceneDataList([]);

            console.log(`selectedVoice = ${voiceId}`)
            const request: PostOpenAISceneRequest = {
                userId: user?.id,
                taskId: taskId,
                narrationScript: script,
                styleId: selectedStyleId,
                voiceId: voiceId,
            }
            const storyboardData = await openAIClientAPI.postOpenAIScene(request);
            
            if (!storyboardData) {
                throw new Error("Storyboard generation is failed.")
            }

            const {
                taskId: newTaskId,
                sceneDataList: newSceneDataList,
                videoTitle: newVideoTitle,
                videoDescription: newVideoDescription,
            }: StoryboardData = storyboardData;

            window.history.pushState(null, "", `/workspace/create?taskId=${newTaskId}`);
            setSceneDataList(newSceneDataList);
            setVideoTitle(newVideoTitle);
            setVideoDescription(newVideoDescription);

            setPendingVoiceId(null);
            setIsGeneratingStoryboardData(false);
        } catch (error) {
            console.error('onClickGenerateStoryboard', error);
            alert(error instanceof Error ? error.message : 'Unknown error');
            setIsGeneratingStoryboardData(false);
        }
    }, [user?.id, taskId, script, selectedStyleId]);
    
    const onSelectVoice = useCallback((voiceId: string) => {
        if (voiceId !== selectedVoiceId) {
            // Storyboard가 생성된 상태에서 Voice 변경 시 경고
            const isStoryboardGenerated = sceneDataList.length !== 0 && videoTitle && selectedVoiceId;

            if (isStoryboardGenerated) {
                setPendingVoiceId(voiceId);
                setShowVoiceChangeWarningModal(true);
            } else {
                setSelectedVoiceId(voiceId);
            }
        }
    }, [sceneDataList, videoTitle, selectedVoiceId]);

    const onChangeVoiceLoading = useCallback((isVoiceLoading: boolean) => {
        setIsVoiceLoading(isVoiceLoading);
    }, []);

    const openAIModal = useCallback(() => {
        setShowAIModal(true);
    }, []);

    const closeAIModal = useCallback(() => {
        if (!isGeneratingScript) {
            setShowAIModal(false);
            setAiPrompt('');
            setIsGeneratingScript(false);
        }
    }, [isGeneratingScript]);

    // 예상 영상 시간 계산 (2.5단어/초 기준)
    const estimatedDuration = useMemo(() => {
        if (!script.trim()) return 0;
        const wordCount = script.split(' ').length;
        return Math.round(wordCount / 2.5);
    }, [script]);

    const onClickPlayAndStopButton = useCallback(async () => {
        if (!voiceUrl) return;

        if (isPlayingVoice) {
            // 재생 중일 때: 정지
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            setIsPlayingVoice(false);
            setCurrentPlayTime(0);
        } else {
            // 재생 중이 아닐 때: 재생
            if (!audioRef.current) {
                audioRef.current = new Audio(voiceUrl);
                audioRef.current.onended = () => {
                    setIsPlayingVoice(false);
                    setCurrentPlayTime(0);
                };
                audioRef.current.ontimeupdate = () => {
                    if (audioRef.current) {
                        setCurrentPlayTime(audioRef.current.currentTime);
                    }
                };
            } else {
                // voiceUrl이 변경되었을 수 있으므로 src 업데이트
                audioRef.current.src = voiceUrl;
                audioRef.current.currentTime = 0;
            }
            await audioRef.current.play();
            setIsPlayingVoice(true);
        }
    }, [voiceUrl, isPlayingVoice]);

    useEffect(() => {
        console.log(`voiceUrl = ${voiceUrl}`)
    }, [voiceUrl]);

    const onClickGenerateVideo = useCallback(async () => {
        if (!script.trim()) {
            alert('스크립트를 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        
        try {
            if (!taskId || !selectedStyleId || !user?.id) {
                throw new Error("User Id or Task Id or selected style was not found.");
            }

            // Video API 호출
            const postVideoResult = await videoClientAPI.postVideo(taskId, selectedStyleId);

            if (postVideoResult) {
                console.log('Video data generation succeed.');
                // setVideoDataResponse(result.data);
                
                // 성공 시 대시보드로 이동
                alert('Your video is now being generated!');
                window.location.href = '/workspace/dashboard';
            } else {
                console.error('Video data generation failed.');
                alert('비디오 프로젝트 생성에 실패했습니다. 다시 시도해주세요.');
                throw Error('Video data generation failed.');
            }

        } catch (error) {
            console.error('Error creating video project:', error);
            alert('비디오 프로젝트 생성 중 오류가 발생했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    }, [script, taskId, user?.id, selectedStyleId]);

    const onClickSaveDraft = useCallback(async () => {
        setIsSaving(true);

        try {
            const request: Partial<VideoGenerationTask> = {
                narration_script: script.length !== 0 ? script : undefined,
                scene_breakdown_list: sceneDataList.length !== 0 ? sceneDataList : undefined,
                video_title: videoTitle ?? undefined,
                video_description: videoDescription ?? undefined,
                selected_style_id: selectedStyleId.length !== 0 ? selectedStyleId : undefined,
                selected_voice_id: selectedVoiceId.length !== 0 ? selectedVoiceId : undefined,
            }
            const result: VideoGenerationTask | null = taskId
                ? await videoClientAPI.patchVideoTaskByTaskId(taskId, request)
                : await videoClientAPI.postVideoTask(request);
            
            if (!result) {
                throw new Error("Saving draft was failed. Try again.")
            }

            setShowSaveSuccessModal(true);
        } catch (error) {
            console.error('Error saving draft:', error);
            alert('Saving draft was failed. Try again.');
        } finally {
            setIsSaving(false);
        }
    }, [script, sceneDataList, videoTitle, videoDescription, selectedStyleId, selectedVoiceId, taskId]);

    const onCloseSaveSuccessModal = useCallback(() => {
        setShowSaveSuccessModal(false);
    }, []);

    const onConfirmVoiceChange = useCallback(async () => {
        if (pendingVoiceId) {
            setSelectedVoiceId((prev) => {
                console.log(`prevVoice = ${prev}, newVoice = ${pendingVoiceId}`)
                return pendingVoiceId;
            });

            setShowVoiceChangeWarningModal(false);

            // Storyboard 재생성
            await onClickGenerateStoryboard(pendingVoiceId);
        }
    }, [pendingVoiceId, onClickGenerateStoryboard]);

    const onCancelVoiceChange = useCallback(() => {
        setPendingVoiceId(null);
        setShowVoiceChangeWarningModal(false);
    }, []);

    // 페이지 로드 시: taskId 있으면 데이터 복원
    useEffect(() => {
        if (taskId) {
            const getVideoTaskByTaskId = async () => {
                const videoGenerationTask = await videoClientAPI.getVideoTaskByTaskId(taskId);

                if (videoGenerationTask && (videoGenerationTask.status === VideoGenerationTaskStatus.DRAFTING || videoGenerationTask.status === VideoGenerationTaskStatus.GENERATING_VOICE)) {
                    const script = videoGenerationTask.narration_script;
                    const sceneDataList = videoGenerationTask.scene_breakdown_list;
                    const videoTitle = videoGenerationTask.video_title;
                    const videoDescription = videoGenerationTask.video_description;
                    const voiceId = videoGenerationTask.selected_voice_id;
                    const styleId = videoGenerationTask.selected_style_id;

                    setScript(script);
                    setSceneDataList(sceneDataList);
                    setVideoTitle(videoTitle ?? '');
                    setVideoDescription(videoDescription ?? '');
                    setSelectedVoiceId(voiceId ?? '');
                    setSelectedStyleId(styleId ?? '');

                    setIsGenerationTaskLoading(false);
                } else {
                    setIsGenerationTaskLoading(false);

                    // URL에서 taskId 파라미터만 제거 (리렌더링 없이)
                    const url = new URL(window.location.href);
                    url.searchParams.delete('taskId');
                    window.history.replaceState({}, '', url.toString());
                }
            }

            getVideoTaskByTaskId().then();
        } else {
            setIsGenerationTaskLoading(false);
        }
    }, [taskId]);

    useEffect(() => {
        if (taskId && sceneDataList.length !== 0) {
            const loadVoiceUrl = async () => {
                const newVoiceUrl = await voiceClientAPI.getVoiceUrl(taskId);

                setVoiceUrl(newVoiceUrl);
            }

            loadVoiceUrl().then();
        } else {
            setVoiceUrl(null);
        }
    }, [taskId, sceneDataList]);

    return (
        <div className="min-h-screen bg-black text-white">
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="flex flex-col items-center space-y-6">
                        {/* 로딩 스피너 */}
                        <div className="relative w-24 h-24">
                            {/* 외부 링 */}
                            <div className="absolute inset-0 border-4 border-purple-200/20 rounded-full"></div>
                            {/* 회전하는 그라디언트 링 */}
                            <div className="absolute inset-0 border-4 border-transparent border-t-pink-500 border-r-purple-500 rounded-full animate-spin"></div>
                            {/* 내부 역방향 회전 링 */}
                            <div className="absolute inset-3 border-2 border-transparent border-b-purple-400 border-l-pink-400 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                            {/* 중앙 아이콘 */}
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Sparkles className="w-8 h-8 text-purple-400 animate-pulse" />
                            </div>
                        </div>

                        {/* 로딩 텍스트 */}
                        <div className="text-center space-y-2">
                            <h3 className="text-2xl font-semibold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                                Loading Create Studio
                            </h3>
                            <p className="text-gray-400 text-sm">
                                Preparing your creative workspace...
                            </p>
                        </div>

                        {/* 애니메이션 도트 */}
                        <div className="flex space-x-2">
                            <div className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                            <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Header - Same as Editor */}
            <div className="flex items-center justify-between py-4 border-b border-purple-500/20 bg-gray-900/50 backdrop-blur-sm">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
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
                        <span className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent cursor-default">
                            Create Video
                        </span>
                        <p className="text-gray-400 text-base pl-0.5 cursor-default">
                            Tell AI what you want to create.
                        </p>
                    </div>
                </div>

                <div className="flex items-center space-x-2 mr-6 px-4 py-2 bg-gray-900/50 border border-purple-500/30 rounded-lg backdrop-blur-sm hover:border-purple-400/50 transition-all">
                    <Coins className="w-5 h-5 text-yellow-400" />
                    <div className="flex flex-col">
                        <span className="text-xs text-purple-300">Credits</span>
                        <span className="text-lg font-bold text-yellow-400">{userCreditCount.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10 pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex h-[calc(100vh-97px)]">
                {/* Left Virtual Tab Sidebar */}
                <div className="w-20 bg-gray-900/50 backdrop-blur-sm border-r border-purple-500/20 flex flex-col items-center py-4 space-y-4">
                    {virtualTabs.map((tab) => {
                        const IconComponent = tab.icon;
                        return (
                            <Link
                                key={tab.id}
                                href={tab.href}
                                className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center transition-all border ${
                                    tab.active 
                                        ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white border-purple-400/50 shadow-lg' 
                                        : 'text-gray-400 hover:text-pink-400 hover:bg-gray-800/50 border-transparent hover:border-purple-500/30'
                                }`}
                                title={tab.name}
                            >
                                <IconComponent size={24} />
                                <span className="text-sm mt-1 leading-tight">{tab.name}</span>
                            </Link>
                        );
                    })}
                </div>

                {/* Create Form Panel */}
                <div className="flex-[4.3] bg-gray-900/30 backdrop-blur-sm border-r border-purple-500/20 overflow-y-auto">
                    <div className="p-6">
                        <div className="text-purple-300 text-2xl font-medium mb-6">Create New Video</div>
                        
                        <div className="space-y-6">

                            {/* Script Section */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        <label className="block text-xl font-semibold text-purple-300">
                                            Script
                                        </label>
                                        {script.trim() && (
                                            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 text-sm font-medium rounded border border-blue-400/30">
                                                ~{estimatedDuration}s
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={openAIModal}
                                        className="px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg text-sm font-medium hover:from-purple-600 hover:to-pink-600 transition-all duration-300 flex items-center space-x-1"
                                    >
                                        <Sparkles size={14} />
                                        <span>Generate with AI</span>
                                    </button>
                                </div>
                                <textarea
                                    value={script}
                                    onChange={(e) => setScript(e.target.value)}
                                    placeholder="Describe what you want to create. Be as detailed as possible..."
                                    rows={6}
                                    className="w-full px-4 py-3 rounded-xl bg-gray-800/50 border border-purple-500/30 text-white placeholder-gray-400 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 focus:outline-none transition-all resize-none text-base"
                                />
                            </div>

                            {/* Storyboard Section */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center space-x-2">
                                        <label className="block text-xl font-semibold text-purple-300">
                                            Storyboard
                                        </label>
                                        {voiceUrl && (
                                            <button
                                                className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 transition-colors border border-purple-400/30"
                                                onClick={onClickPlayAndStopButton}
                                            >
                                                {isPlayingVoice ? (
                                                    <Square size={12} className="text-purple-300" />
                                                ) : (
                                                    <Play size={12} className="text-purple-300" />
                                                )}
                                                <span className="text-xs text-purple-300 font-medium">Preview</span>
                                            </button>
                                        )}
                                    </div>
                                    <div className="relative group">
                                        <div className="flex flex-row space-x-2 items-center">
                                            {sceneDataList.length > 0 && videoTitle && (
                                                <div className="flex items-center space-x-1 px-2 py-1 bg-white/10 rounded-lg">
                                                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                                                    <span className="text-xs font-medium">-2</span>
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    await onClickGenerateStoryboard(selectedVoiceId);
                                                }}
                                                disabled={isGeneratingStoryboardData || !script.trim() || !selectedVoiceId}
                                                className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg text-sm font-medium hover:from-green-600 hover:to-blue-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
                                            >
                                                {isGeneratingStoryboardData ? (
                                                    <>
                                                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
                                                        <span>Generating...</span>
                                                    </>
                                                ) : sceneDataList.length === 0 && !videoTitle ? (
                                                    <span>Generate Storyboard</span>
                                                ) : (
                                                    <span>Regenerate Storyboard</span>
                                                )}
                                            </button>
                                        </div>

                                        {/* 툴팁 오버레이 */}
                                        {(!script.trim() || !selectedVoiceId) && (
                                            <div className="absolute top-full right-0 mt-2 w-64 bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-xl">
                                                <div className="text-xs font-medium text-purple-300 mb-2">Requirements</div>
                                                <div className="space-y-1.5">
                                                    <div className="flex items-center space-x-2 text-xs">
                                                        <span>{script.trim() ? '🟢' : '🔴'}</span>
                                                        <span className={script.trim() ? 'text-green-300' : 'text-gray-400'}>
                                                            Script written
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2 text-xs">
                                                        <span>{selectedVoiceId ? '🟢' : '🔴'}</span>
                                                        <span className={selectedVoiceId ? 'text-green-300' : 'text-gray-400'}>
                                                            Voice selected
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Video Metadata Section */}
                                {videoTitle && videoDescription && (
                                    <div className="mb-4 space-y-3">
                                        {/* Title Card */}
                                        <div className="group relative rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/5 via-pink-500/5 to-purple-500/5 p-4 backdrop-blur-sm transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
                                                        <Film className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-purple-300 mb-1.5">Video Title</div>
                                                    <h3 className="text-lg font-bold leading-snug text-white">
                                                        {videoTitle}
                                                    </h3>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description Card */}
                                        <div className="group relative rounded-xl border border-purple-500/30 bg-gradient-to-r from-pink-500/5 via-purple-500/5 to-pink-500/5 p-4 backdrop-blur-sm transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-pink-500/10">
                                            <div className="flex items-start space-x-3">
                                                <div className="flex-shrink-0 mt-0.5">
                                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center shadow-lg">
                                                        <Sparkles className="w-4 h-4 text-white" />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-medium text-purple-300 mb-1.5">Description</div>
                                                    <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-300">
                                                        {videoDescription}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Credit Usage Card */}
                                <div className="group relative mb-6 rounded-xl border border-purple-500/30 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5 p-4 backdrop-blur-sm transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-yellow-500/10">
                                    <div className="flex items-start space-x-3">
                                        <div className="flex-shrink-0 mt-0.5">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                                                <Coins className="w-4 h-4 text-white" />
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-purple-300 mb-1.5">Estimated Credit Usage</div>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-base text-gray-300">Base (30s / 6 scenes)</span>
                                                    <span className="text-base font-semibold text-white">100 credits</span>
                                                </div>
                                                <div className="border-t border-purple-500/20 my-2"></div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400">
                                                        {`Extra Duration (+${expectedVideoTotalDuration > 30 ? Math.ceil(expectedVideoTotalDuration - 30) : 0}s)`}
                                                    </span>
                                                    <span className={`text-sm font-medium ${expectedVideoTotalDuration > 30 ? 'text-yellow-300' : 'text-gray-500'}`}>
                                                        +{expectedVideoTotalDuration > 30 ? (expectedVideoTotalDuration - 30) * 5 : 0} credits
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400">
                                                        {`Extra Scenes (+${expectedVideoSceneCount > 6 ? expectedVideoSceneCount - 6 : 0})`}
                                                    </span>
                                                    <span className={`text-sm font-medium ${expectedVideoSceneCount > 6 ? 'text-yellow-300' : 'text-gray-500'}`}>
                                                        +{expectedVideoSceneCount > 6 ? (expectedVideoSceneCount - 6) * 5 : 0} credits
                                                    </span>
                                                </div>
                                                <div className="border-t border-purple-500/20 my-2"></div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-base font-semibold text-purple-300">Total</span>
                                                    <span className="text-lg font-bold text-yellow-400">{expectedCreditUsage} credits</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Storyboard 그리드 */}
                                {sceneDataList.length !== 0 && videoTitle && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-4xl">
                                        {sceneDataList.sort((a, b) => {
                                            return a.sceneNumber - b.sceneNumber;
                                        }).map((sceneData) => {
                                            const sceneSubtitleSegmentList = sceneData.sceneSubtitleSegments ?? [];
                                            const isVoicePlayingScene = isPlayingVoice && sceneSubtitleSegmentList && sceneSubtitleSegmentList.length > 0
                                                ? currentPlayTime >= sceneSubtitleSegmentList[0].startSec &&
                                                  currentPlayTime <= sceneSubtitleSegmentList[sceneSubtitleSegmentList.length - 1].endSec
                                                : false;

                                            console.log(`currentTime = ${currentPlayTime}, isPlaying = ${isVoicePlayingScene}, start = ${sceneSubtitleSegmentList[0]?.startSec}, end = ${sceneSubtitleSegmentList[sceneSubtitleSegmentList.length - 1]?.endSec}`)

                                            return <StoryboardItem
                                                key={sceneData.sceneNumber}
                                                sceneData={sceneData}
                                                isVoicePlayingScene={isVoicePlayingScene}
                                            />
                                        })}
                                    </div>
                                )}

                                {/* 로딩 상태 또는 빈 상태 메시지 */}
                                {sceneDataList.length === 0 && (
                                    <div className="text-center py-8 px-4 bg-gray-800/30 border border-gray-600/30 rounded-lg">
                                        {isGeneratingStoryboardData ? (
                                            // 로딩 중 상태
                                            <>
                                                <div className="text-purple-400 mb-4">
                                                    <div className="w-16 h-16 mx-auto mb-4 relative">
                                                        <div className="absolute inset-0 border-4 border-purple-200/20 rounded-full"></div>
                                                        <div className="absolute inset-0 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                                                        <div className="absolute inset-2 border-2 border-purple-300/40 border-b-transparent rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
                                                    </div>
                                                </div>
                                                <p className="text-base text-purple-300 font-medium mb-2">AI Screenwriter at Work</p>
                                                <p className="text-sm text-gray-400">Crafting your storyboard with cinematic precision...</p>
                                                <div className="mt-4 flex justify-center space-x-1">
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                                                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                                                </div>
                                            </>
                                        ) : (
                                            // 빈 상태
                                            <>
                                                <div className="text-gray-400 mb-2">
                                                    <Film className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                </div>
                                                <p className="text-base text-gray-400 font-medium">No storyboard generated yet</p>
                                                <p className="text-sm text-gray-500 mt-1">Generate a storyboard to see scene breakdown</p>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Visual Style Selection */}
                            <div>
                                <button
                                    type="button"
                                    onClick={() => setIsStyleExpanded(!isStyleExpanded)}
                                    className="flex items-center text-xl font-semibold text-purple-300 mb-4 hover:text-purple-200 transition-colors"
                                >
                                    <span>Visual Style</span>
                                    <span className="ml-2">
                                        {isStyleExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                    </span>
                                </button>
                                {isStyleExpanded && (
                                    <div className="grid grid-cols-2 gap-3">
                                    {styleList.map((style) => (
                                        <button
                                            key={style.id}
                                            onClick={() => { setSelectedStyleId(style.id); }}
                                            className={`w-full p-3 rounded-lg border transition-all text-left ${
                                                selectedStyleId === style.id
                                                    ? 'border-pink-500 bg-pink-500/10'
                                                    : 'border-purple-500/30 bg-gray-800/30 hover:border-purple-400/50'
                                            }`}
                                        >
                                            <div className="text-white font-medium text-base">{style.name}</div>
                                            <div className="text-gray-400 text-sm mt-1">{style.description}</div>
                                        </button>
                                    ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Voice Selection Panel */}
                <VoiceSelectionPanel
                    selectedVoiceId={selectedVoiceId}
                    onSelectVoice={onSelectVoice}
                    onChangeIsLoading={onChangeVoiceLoading}
                />

                {/* Style Preview Panel */}
                <div className="flex-[3] bg-black flex flex-col relative">
                    {/* Vaporwave Background Effects */}
                    <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                        <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
                    </div>
                    
                    <div className="flex-1 flex items-center justify-center px-8 py-2 relative z-10">
                        <div className="text-center">
                            <h3 className="text-purple-300 text-2xl font-medium mb-6">
                                Style Preview
                            </h3>
                            
                            {/* Selected Style Preview */}
                            <div className="w-[280px] bg-gradient-to-br from-gray-900 to-black rounded-2xl border border-purple-500/30 overflow-hidden shadow-2xl mx-auto" style={{aspectRatio: '9/16'}}>
                                {selectedStyleId ? (
                                    <div className="w-full h-full bg-gradient-to-br from-pink-400 via-purple-500 to-indigo-600 flex items-center justify-center relative">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
                                        
                                        {/* Preview Content */}
                                        <div className="text-center relative z-10">
                                            <div className="w-16 h-16 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto border border-purple-400/50">
                                                <Play size={24} className="text-white ml-1" />
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 bg-gradient-to-br from-gray-800 to-gray-900">
                                        <p className="text-sm">Style preview</p>
                                    </div>
                                )}
                            </div>
                            
                            {/* Style Info */}
                            <div className="mt-6 text-center">
                                <p className="text-purple-300 text-base mb-1">
                                    Selected: <span className="text-white font-medium text-lg">{styleList.find((style) => { return style.id === selectedStyleId; })?.name || selectedStyleId}</span>
                                </p>
                                <p className="text-gray-300 text-sm mb-3">
                                    {styleList.find((style) => { return style.id === selectedStyleId; })?.description}
                                </p>
                                <p className="text-gray-400 text-sm">
                                    This preview shows how your video will look with the selected visual style.
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 border-t border-purple-500/20 bg-gray-900/50 backdrop-blur-sm relative z-10">
                        <div className="flex w-fit items-center space-x-4 max-w-2xl mx-auto">
                            {/* Save Draft 버튼 */}
                            <button
                                onClick={onClickSaveDraft}
                                disabled={isSaving}
                                className="flex items-center space-x-2 px-4 py-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-600/50 hover:border-gray-500/50 text-gray-300 hover:text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-400/30 border-t-gray-400 rounded-full animate-spin"></div>
                                        <span className="text-sm">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        <span className="text-sm">Save Draft</span>
                                    </>
                                )}
                            </button>

                            {/* Generate Video 버튼 */}
                            <div className="relative group">
                                <button
                                    onClick={onClickGenerateVideo}
                                    disabled={!isVideoGenerationEnabled || isSubmitting}
                                    className="flex-1 min-w-[280px] group bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-3 rounded-xl text-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                            <span>Requesting...</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex items-center space-x-1 px-2 py-1 bg-black/40 rounded-lg">
                                                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                                                <span className="text-xs font-medium">-{expectedCreditUsage}</span>
                                            </div>
                                            <span>Generate Video</span>
                                            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                            </svg>
                                        </>
                                    )}
                                </button>

                                {/* 툴팁 오버레이 */}
                                {!isVideoGenerationEnabled && (
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10 shadow-xl">
                                        <div className="text-xs font-medium text-purple-300 mb-2">Requirements</div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center space-x-2 text-xs">
                                                <span>{script.trim() ? '🟢' : '🔴'}</span>
                                                <span className={script.trim() ? 'text-green-300' : 'text-gray-400'}>
                                                    Script written
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs">
                                                <span>{sceneDataList.length !== 0 && videoTitle ? '🟢' : '🔴'}</span>
                                                <span className={sceneDataList.length !== 0 && videoTitle ? 'text-green-300' : 'text-gray-400'}>
                                                    Storyboard generated
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs">
                                                <span>{selectedVoiceId ? '🟢' : '🔴'}</span>
                                                <span className={selectedVoiceId ? 'text-green-300' : 'text-gray-400'}>
                                                    Voice selected
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2 text-xs">
                                                <span>{selectedStyleId ? '🟢' : '🔴'}</span>
                                                <span className={selectedStyleId ? 'text-green-300' : 'text-gray-400'}>
                                                    Style selected
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Save Success Modal */}
                {showSaveSuccessModal && (
                    <DefaultModal
                        title="Draft Saved"
                        message="Your draft has been saved successfully. You can continue editing or come back later."
                        cancelText="Continue"
                        onClickCancel={onCloseSaveSuccessModal}
                    />
                )}

                {/* Voice Change Warning Modal */}
                {showVoiceChangeWarningModal && (
                    <DefaultModal
                        title="Voice Change Warning"
                        message={
                            "Voice change requires storyboard regeneration.\n" +
                            "Current storyboard will be lost.\n" +
                            "Continue?"
                        }
                        confirmText="Regenerate"
                        cancelText="Cancel"
                        onClickConfirm={onConfirmVoiceChange}
                        onClickCancel={onCancelVoiceChange}
                    />
                )}

                {/* AI Generation Modal */}
                {showAIModal && (
                    <div
                        onClick={closeAIModal}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-900/95 backdrop-blur-sm border border-purple-500/30 rounded-xl max-w-lg w-full mx-4 overflow-hidden shadow-2xl"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xl font-semibold text-purple-300">
                                        Generate Script with AI
                                    </h3>
                                    {!isGeneratingScript && <button
                                        onClick={closeAIModal}
                                        className="text-gray-400 hover:text-pink-400 transition-colors p-1 rounded-lg hover:bg-gray-800/50"
                                    >
                                        <X size={18} />
                                    </button>}
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-white mb-2">What do you want to create?</label>
                                        <textarea
                                            placeholder="Tell me about Elon Musk's early SpaceX struggles"
                                            value={aiPrompt}
                                            onChange={(e) => setAiPrompt(e.target.value)}
                                            rows={4}
                                            className="w-full bg-gray-800/50 border border-purple-500/30 rounded-lg px-3 py-2 text-white text-sm focus:border-purple-400 focus:outline-none resize-none placeholder-gray-400 transition-all"
                                        />
                                    </div>

                                    {/* Warning Message - Simplified */}
                                    <div className="bg-amber-500/10 border border-amber-400/30 rounded-lg p-3">
                                        <div className="flex items-start space-x-2">
                                            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <div className="text-sm text-amber-100">
                                                <p className="font-medium">Be specific to avoid wasting credits</p>
                                                <p className="text-xs text-amber-200 mt-1">Vague requests may produce unwanted results.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={onClickGenerateScript}
                                        disabled={isGeneratingScript || !aiPrompt.trim()}
                                        className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white px-4 py-3 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-purple-500/25"
                                    >
                                        {isGeneratingScript ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                <span>Generating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles size={16} />
                                                <span>Generate Script</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default memo(WorkspaceCreatePageClient);