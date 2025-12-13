'use client'

import {ChangeEvent, memo, useCallback, useEffect, useMemo, useState} from "react";
import Link from "next/link";
import Image from "next/image";
import {
    Coins,
    ListTodo,
    Plus,
    Sparkles,
} from 'lucide-react';
import {openAIClientAPI} from '@/api/client/openAIClientAPI';
import {Style} from "@/api/types/supabase/Styles";
import {SceneData, VideoGenerationTask, VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {videoClientAPI} from "@/api/client/videoClientAPI";
import {StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import VoiceSelectionPanel from "@/components/page/workspace/create/voice-selection-panel/VoiceSelectionPanel";
import {useRouter, useSearchParams} from "next/navigation";
import {PostOpenAISceneRequest} from "@/api/types/api/open-ai/scene/PostOpenAISceneRequest";
import DefaultModal from "@/components/public/DefaultModal";
import {useAuth} from "@/context/AuthContext";
import {STYLE_DATA_LIST} from "@/lib/styles";
import {voiceClientAPI} from "@/api/client/voiceClientAPI";
import ResultPanel from "@/components/page/workspace/create/result-panel/ResultPanel";
import ScriptGenerationModal from "@/components/page/workspace/create/ScriptGenerationModal";
import CreateFormPanel from "@/components/page/workspace/create/create-form-panel/CreateFormPanel";

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
    const [selectedStyleId, setSelectedStyleId] = useState<string>('realistic');
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    
    // Storyboard states
    const [sceneDataList, setSceneDataList] = useState<SceneData[]>([]);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [videoDescription, setVideoDescription] = useState<string | null>(null);
    const [voiceUrl, setVoiceUrl] = useState<string | null>(null);

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
    const [isSaving, setIsSaving] = useState(false);
    const [showSaveSuccessModal, setShowSaveSuccessModal] = useState(false);
    const [showVoiceChangeWarningModal, setShowVoiceChangeWarningModal] = useState(false);
    const [showInsufficientCreditModal, setShowInsufficientCreditModal] = useState(false);
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

    const expectedDurationUsage = useMemo(() => {
        const exceededVideoTotalDuration = expectedVideoTotalDuration - 30;
        return exceededVideoTotalDuration > 0
            ? Math.ceil(exceededVideoTotalDuration / 2) * 5
            : 0;
    }, [expectedVideoTotalDuration]);

    const expectedSceneCountUsage = useMemo(() => {
        const exceededVideoSceneCount = expectedVideoSceneCount - 6;

        return exceededVideoSceneCount > 0
            ? exceededVideoSceneCount * 5
            : 0;
    }, [expectedVideoSceneCount]);

    const expectedCreditUsage = useMemo(() => {
        return 100 + (expectedDurationUsage + expectedSceneCountUsage);
    }, [expectedDurationUsage, expectedSceneCountUsage]);

    const isCreditInsufficient = useMemo(() => {
        return userCreditCount < expectedCreditUsage;
    }, [userCreditCount, expectedCreditUsage]);

    // Style examples for preview
    const styleList = useMemo((): Style[] => STYLE_DATA_LIST, []);

    // Virtual tabs for navigation consistency
    const virtualTabs = useMemo(() => [
        { id: 'dashboard', icon: ListTodo, name: 'Dashboard', href: '/workspace/dashboard' },
        { id: 'create', icon: Plus, name: 'Create', href: '/workspace/create', active: true }
    ], []);

    const onChangeScript = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
        setScript(e.target.value);
    }, []);
    
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

    const onClickGenerateStoryboardInCreateFormPanel = useCallback(async () => {
        await onClickGenerateStoryboard(selectedVoiceId);
    }, [onClickGenerateStoryboard, selectedVoiceId]);
    
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

    const onClickGenerateWithAI = useCallback(() => {
        setShowAIModal(true);
    }, []);

    const onChangeIsGeneratingScript = useCallback((isGenerating: boolean) => {
        setIsGeneratingScript(isGenerating);
    }, []);

    const onClickCloseScriptGenerationModal = useCallback(() => {
        if (!isGeneratingScript) {
            setShowAIModal(false);
            // setAiPrompt('');
            setIsGeneratingScript(false);
        }
    }, [isGeneratingScript]);

    const onFinishGeneratingScript = useCallback((newScript: string) => {
        setScript(newScript);
        setIsGeneratingScript(false);
        setShowAIModal(false);
    }, []);

    const generateVideo = useCallback(async () => {
        if (!script.trim()) {
            alert('Please enter a script.');
            return;
        }

        setIsSubmitting(true);

        try {
            if (!taskId || !selectedStyleId || !user?.id) {
                throw new Error("User Id or Task Id or selected style was not found.");
            }

            // Video API 호출
            const postVideoResult = await videoClientAPI.postVideo(taskId, user.id as string, selectedStyleId);

            if (postVideoResult) {
                console.log('Video data generation succeed.');
                // setVideoDataResponse(result.data);

                // 성공 시 대시보드로 이동
                alert('Your video is now being generated!');
                window.location.href = '/workspace/dashboard';
            } else {
                console.error('Video data generation failed.');
                alert('Failed to create video project. Please try again.');
                throw Error('Video data generation failed.');
            }

        } catch (error) {
            console.error('Error creating video project:', error);
            alert('An error occurred while creating the video project. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [script, taskId, user?.id, selectedStyleId]);

    const onClickGenerateVideo = useCallback(async () => {
        if (isCreditInsufficient) {
            setShowInsufficientCreditModal(true);
        } else {
            await generateVideo();
        }
    }, [generateVideo, isCreditInsufficient]);

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
            setSelectedVoiceId(pendingVoiceId);

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
                <CreateFormPanel
                    script={script}
                    sceneDataList={sceneDataList}
                    videoTitle={videoTitle}
                    videoDescription={videoDescription}
                    voiceUrl={voiceUrl}
                    selectedVoiceId={selectedVoiceId}
                    expectedVideoTotalDuration={expectedVideoTotalDuration}
                    isGeneratingStoryboardData={isGeneratingStoryboardData}
                    onChangeScript={onChangeScript}
                    onClickGenerateWithAI={onClickGenerateWithAI}
                    onClickGenerateStoryboard={onClickGenerateStoryboardInCreateFormPanel}
                />

                {/* Voice Selection Panel */}
                <VoiceSelectionPanel
                    selectedVoiceId={selectedVoiceId}
                    onSelectVoice={onSelectVoice}
                    onChangeIsLoading={onChangeVoiceLoading}
                />

                {/* Result Panel */}
                <ResultPanel
                    isStoryboardGenerated={sceneDataList.length !== 0}
                    videoTitle={videoTitle}
                    videoDescription={videoDescription}
                    expectedVideoTotalDuration={expectedVideoTotalDuration}
                    expectedDurationUsage={expectedDurationUsage}
                    expectedVideoSceneCount={expectedVideoSceneCount}
                    expectedSceneCountUsage={expectedSceneCountUsage}
                    expectedCreditUsage={expectedCreditUsage}
                    script={script}
                    selectedVoiceId={selectedVoiceId}
                    selectedStyleId={selectedStyleId}
                    isSaving={isSaving}
                    isSubmitting={isSubmitting}
                    isCreditInsufficient={isCreditInsufficient}
                    isVideoGenerationEnabled={isVideoGenerationEnabled}
                    onClickSaveDraft={onClickSaveDraft}
                    onClickGenerateVideo={onClickGenerateVideo}
                />

                {/* Insufficient Credit Modal */}
                {showInsufficientCreditModal && (
                    <DefaultModal
                        title="Insufficient Credits"
                        message={`You need ${expectedCreditUsage} credits to generate this video,\nbut you only have ${userCreditCount} credits.\n\nPlease top up your credits to continue.`}
                        cancelText="Close"
                        onClickCancel={() => setShowInsufficientCreditModal(false)}
                    />
                )}

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
                {showAIModal && (<ScriptGenerationModal
                    isGeneratingScript={isGeneratingScript}
                    onClickClose={onClickCloseScriptGenerationModal}
                    onChangeIsGeneratingScript={onChangeIsGeneratingScript}
                    onFinishGeneratingScript={onFinishGeneratingScript}
                />)}
            </div>
        </div>
    )
}

export default memo(WorkspaceCreatePageClient);