'use client'

import { ChangeEvent, memo, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Loader2 } from 'lucide-react';
import { openAIClientAPI } from '@/lib/api/client/openAIClientAPI';
import { Style } from "@/lib/api/types/supabase/Styles";
import { SceneData, VideoGenerationTask, VideoGenerationTaskStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { videoClientAPI } from "@/lib/api/client/videoClientAPI";
import { StoryboardData } from "@/lib/api/types/api/open-ai/scene/PostOpenAISceneResponse";
import VoiceSelectionPanel from "@/components/page/workspace/create/voice-selection-panel/VoiceSelectionPanel";
import { useRouter, useSearchParams } from "next/navigation";
import { PostOpenAISceneRequest } from "@/lib/api/types/api/open-ai/scene/PostOpenAISceneRequest";
import DefaultModal from "@/components/public/DefaultModal";
import { useAuth } from "@/context/AuthContext";
import { STYLE_DATA_LIST } from "@/lib/styles";
import { voiceClientAPI } from "@/lib/api/client/voiceClientAPI";
import ResultPanel from "@/components/page/workspace/create/result-panel/ResultPanel";
import ScriptGenerationModal from "@/components/page/workspace/create/ScriptGenerationModal";
import CreateFormPanel from "@/components/page/workspace/create/create-form-panel/CreateFormPanel";
import WorkspaceSidebar from "@/components/public/WorkspaceSidebar";
import { WorkspaceSidebarItem } from "@/components/public/WorkspaceSidebarItem";
import { aiModelDataClientAPI } from "@/lib/api/client/aiModelDataClientAPI";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

function WorkspaceCreatePageClient() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const { user } = useAuth();

    const isFalAiKeyMissing = useMemo(() => {
        return !user?.fal_ai_api_key;
    }, [user?.fal_ai_api_key]);

    const [isVoiceLoading, setIsVoiceLoading] = useState(true);
    const [isAiModelLoading, setIsAiModelLoading] = useState(true);
    const [isGenerationTaskLoading, setIsGenerationTaskLoading] = useState(true);
    const isLoading = useMemo(() => {
        return isVoiceLoading || isGenerationTaskLoading || isAiModelLoading;
    }, [isVoiceLoading, isGenerationTaskLoading, isAiModelLoading]);

    const taskId = useMemo(() => {
        return searchParams.get("taskId") ?? undefined;
    }, [searchParams]);

    // AI Model states
    const [aiModelList, setAiModelList] = useState<AIModelData[]>([]);
    const [selectedReferenceId, setSelectedReferenceId] = useState<string | null>(null);
    const [selectedI2iId, setSelectedI2iId] = useState<string | null>(null);
    const [selectedI2vId, setSelectedI2vId] = useState<string | null>(null);

    // Section states
    const [script, setScript] = useState<string>('');
    const [selectedStyleId, setSelectedStyleId] = useState<string>('realistic');
    const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
    
    // Storyboard states
    const [sceneDataList, setSceneDataList] = useState<SceneData[]>([]);
    const [videoTitle, setVideoTitle] = useState<string | null>(null);
    const [videoDescription, setVideoDescription] = useState<string | null>(null);
    const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
    const [estimatedCharacterCount, setEstimatedCharacterCount] = useState<number>(0);

    // Video Spec states
    const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('9:16');
    const [resolution, setResolution] = useState<'720p' | '1080p' | '2160p'>('1080p');

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
    const [pendingVoiceId, setPendingVoiceId] = useState<string | null>(null);
    
    // Collapse states for sections
    const [isStyleExpanded, setIsStyleExpanded] = useState(true);

    const expectedVideoTotalDuration = useMemo(() => {
        if (sceneDataList.length === 0) return 0;

        // 장면 사이 간격 포함
        const lastSceneSegmentList = sceneDataList[sceneDataList.length - 1].sceneSubtitleSegments;

        if (!lastSceneSegmentList || lastSceneSegmentList.length === 0) return 0;

        return lastSceneSegmentList[lastSceneSegmentList.length - 1].endSec;
    }, [sceneDataList]);

    const expectedVideoSceneCount = useMemo(() => {
        return sceneDataList.length;
    }, [sceneDataList]);

    // Style examples for preview
    const styleList = useMemo((): Style[] => STYLE_DATA_LIST, []);

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
                estimatedCharacterCount: newEstimatedCharacterCount,
            }: StoryboardData = storyboardData;

            window.history.pushState(null, "", `/workspace/create?taskId=${newTaskId}`);
            setSceneDataList(newSceneDataList);
            setVideoTitle(newVideoTitle);
            setVideoDescription(newVideoDescription);
            setEstimatedCharacterCount(newEstimatedCharacterCount ?? 0);

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

            // Patch ai_model_config and specs before generation
            if (selectedReferenceId && selectedI2iId && selectedI2vId) {
                const selectedI2iModel = aiModelList.find(m => m.id === selectedI2iId);
                const companionT2iModel = aiModelList.find(
                    m => m.category === 'text-to-image' && m.display_name === selectedI2iModel?.display_name
                );
                const inferredSceneT2iId = companionT2iModel?.id ?? '1bd90bd4-e476-40e9-8a1e-1649288786e7';

                await videoClientAPI.patchVideoTaskByTaskId(taskId, {
                    aspect_ratio: aspectRatio,
                    resolution: resolution,
                    ai_model_config: {
                        referenceImageModelId: selectedReferenceId,
                        sceneImageT2IModelId: inferredSceneT2iId,
                        sceneImageI2IModelId: selectedI2iId,
                        videoModelId: selectedI2vId
                    }
                });
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
    }, [script, taskId, user?.id, selectedStyleId, selectedReferenceId, selectedI2iId, selectedI2vId, aiModelList, aspectRatio, resolution]);

    const onClickGenerateVideo = useCallback(async () => {
        await generateVideo();
    }, [generateVideo]);

    const onClickSaveDraft = useCallback(async () => {
        setIsSaving(true);

        try {
            let inferredSceneT2iId = '1bd90bd4-e476-40e9-8a1e-1649288786e7';
            if (selectedI2iId) {
                const selectedI2iModel = aiModelList.find(m => m.id === selectedI2iId);
                const companionT2iModel = aiModelList.find(
                    m => m.category === 'text-to-image' && m.display_name === selectedI2iModel?.display_name
                );
                if (companionT2iModel?.id) inferredSceneT2iId = companionT2iModel?.id;
            }

            const request: Partial<VideoGenerationTask> = {
                narration_script: script.length !== 0 ? script : undefined,
                scene_breakdown_list: sceneDataList.length !== 0 ? sceneDataList : undefined,
                video_title: videoTitle ?? undefined,
                video_description: videoDescription ?? undefined,
                selected_style_id: selectedStyleId.length !== 0 ? selectedStyleId : undefined,
                selected_voice_id: selectedVoiceId.length !== 0 ? selectedVoiceId : undefined,
                aspect_ratio: aspectRatio,
                resolution: resolution,
                estimated_character_count: estimatedCharacterCount,
                ai_model_config: (selectedReferenceId && inferredSceneT2iId && selectedI2iId && selectedI2vId) ? {
                    referenceImageModelId: selectedReferenceId,
                    sceneImageT2IModelId: inferredSceneT2iId,
                    sceneImageI2IModelId: selectedI2iId,
                    videoModelId: selectedI2vId
                } : undefined,
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
    }, [selectedI2iId, script, sceneDataList, videoTitle, videoDescription, selectedStyleId, selectedVoiceId, aspectRatio, resolution, estimatedCharacterCount, selectedReferenceId, selectedI2vId, taskId, aiModelList]);

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

    useEffect(() => {
        const fetchAIModels = async () => {
            try {
                const models = await aiModelDataClientAPI.getAIModelData();
                setAiModelList(models);

                // Set default models using user preferences or specific hardcoded fallback IDs
                const defaultReference = user?.preferred_ai_model_config?.referenceImageModelId || 'ca637a97-f060-4b81-a7d4-118a6f4aac0c';
                const defaultI2i = user?.preferred_ai_model_config?.sceneImageI2IModelId || '79a506ac-eced-4643-b017-c8a2bb0f028b';
                const defaultI2v = user?.preferred_ai_model_config?.videoModelId || '326a9a71-26a9-4142-8371-5467f316bcd6';

                setSelectedReferenceId(prev => prev ?? defaultReference);
                setSelectedI2iId(prev => prev ?? defaultI2i);
                setSelectedI2vId(prev => prev ?? defaultI2v);
            } catch (error) {
                console.error("Failed to load AI models:", error);
            } finally {
                setIsAiModelLoading(false);
            }
        };

        fetchAIModels().then();
    }, [user]);

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
                    const aiModelConfig = videoGenerationTask.ai_model_config;
                    const dbEstimatedCharacterCount = videoGenerationTask.estimated_character_count;

                    setScript(script);
                    setSceneDataList(sceneDataList);
                    setVideoTitle(videoTitle ?? '');
                    setVideoDescription(videoDescription ?? '');
                    setSelectedVoiceId(voiceId ?? '');
                    setSelectedStyleId(styleId ?? '');
                    setEstimatedCharacterCount(dbEstimatedCharacterCount ?? 0);
                    
                    if (videoGenerationTask.aspect_ratio) setAspectRatio(videoGenerationTask.aspect_ratio);
                    if (videoGenerationTask.resolution) setResolution(videoGenerationTask.resolution);
                    
                    if (aiModelConfig) {
                        setSelectedReferenceId(aiModelConfig.referenceImageModelId);
                        setSelectedI2iId(aiModelConfig.sceneImageI2IModelId);
                        setSelectedI2vId(aiModelConfig.videoModelId);
                    }

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
                const newVoiceUrl = await voiceClientAPI.getVoiceUrl(taskId, user?.id || "");

                setVoiceUrl(newVoiceUrl);
            }

            loadVoiceUrl().then();
        } else {
            setVoiceUrl(null);
        }
    }, [taskId, sceneDataList]);

    // 해상도가 변경될 때 미지원 비디오 모델을 호환되는 모델로 자동 스위칭해 주는 효과
    useEffect(() => {
        if (aiModelList.length === 0 || !selectedI2vId) return;

        // 현재 선택된 비디오 모델 조회
        const currentI2vModel = aiModelList.find(m => m.id === selectedI2vId);
        if (!currentI2vModel || !currentI2vModel.ai_model_price_list) return;

        const targetUnit = resolution === '720p' ? 'video_720p' : resolution === '1080p' ? 'video_1080p' : 'video_2160p';
        const supportsCurrentRes = currentI2vModel.ai_model_price_list.some(p => p.unit === targetUnit);

        // 현재 비디오 모델이 해상도를 지원하지 않는다면 다른 호환되는 비디오 모델로 변경
        if (!supportsCurrentRes) {
            const compatibleI2vModel = aiModelList.find(m => {
                if (m.category !== 'image-to-video' || !m.ai_model_price_list) return false;
                return m.ai_model_price_list.some(p => p.unit === targetUnit);
            });

            if (compatibleI2vModel && compatibleI2vModel.id) {
                setSelectedI2vId(compatibleI2vModel.id);
            }
        }
    }, [resolution, aiModelList, selectedI2vId]);

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
            {/* Loading Overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 p-8 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl">
                        <Loader2 className="w-10 h-10 animate-spin text-zinc-400" />
                        <p className="text-sm font-medium text-zinc-300">Loading Workspace...</p>
                    </div>
                </div>
            )}

            {/* Top Header - Matched to Autopilot & Dashboard */}
            <div className="flex items-center py-3 border-b border-white/5 bg-zinc-950/80 backdrop-blur-md relative z-20">
                <div className="flex items-center" style={{paddingLeft: '16px'}}>
                    <Image
                        src="/logo/logo-64.png"
                        alt="Short Real"
                        width={48}
                        height={48}
                        className="w-12 h-12 cursor-pointer"
                        onClick={() => {
                            router.push('/');
                        }}
                    />
                    <div className="flex flex-col ml-3">
                        <span className="text-2xl font-bold bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent cursor-default leading-none">
                            Create Video
                        </span>
                        <p className="text-zinc-500 text-[13px] mt-0.5 cursor-default">
                            Tell AI what you want to create.
                        </p>
                    </div>
                </div>
            </div>

            {/* Background Effects - Toned down significantly */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0">
                <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-500 rounded-full blur-[120px]"></div>
            </div>

            <div className="flex h-[calc(100vh-73px)] relative z-10">
                {/* Left Virtual Tab Sidebar */}
                <WorkspaceSidebar activeItem={WorkspaceSidebarItem.CREATE} />

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
                    aiModelList={aiModelList}
                    selectedReferenceId={selectedReferenceId}
                    selectedI2iId={selectedI2iId}
                    selectedI2vId={selectedI2vId}
                    aspectRatio={aspectRatio}
                    resolution={resolution}
                    isFalAiKeyMissing={isFalAiKeyMissing}
                    onChangeScript={onChangeScript}
                    onClickGenerateWithAI={onClickGenerateWithAI}
                    onClickGenerateStoryboard={onClickGenerateStoryboardInCreateFormPanel}
                    onChangeReferenceId={setSelectedReferenceId}
                    onChangeI2iId={setSelectedI2iId}
                    onChangeI2vId={setSelectedI2vId}
                    onChangeAspectRatio={setAspectRatio}
                    onChangeResolution={setResolution}
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
                    expectedVideoSceneCount={expectedVideoSceneCount}
                    script={script}
                    selectedVoiceId={selectedVoiceId}
                    selectedStyleId={selectedStyleId}
                    isSaving={isSaving}
                    isSubmitting={isSubmitting}
                    isVideoGenerationEnabled={isVideoGenerationEnabled}
                    aiModelList={aiModelList}
                    selectedReferenceId={selectedReferenceId}
                    selectedI2iId={selectedI2iId}
                    selectedI2vId={selectedI2vId}
                    resolution={resolution}
                    isFalAiKeyMissing={isFalAiKeyMissing}
                    estimatedCharacterCount={estimatedCharacterCount}
                    onClickSaveDraft={onClickSaveDraft}
                    onClickGenerateVideo={onClickGenerateVideo}
                />

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