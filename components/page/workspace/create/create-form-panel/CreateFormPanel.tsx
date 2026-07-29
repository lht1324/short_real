import {ChangeEvent, memo, useMemo} from "react";
import {useRouter} from "next/navigation";
import {Sparkles, MonitorPlay, AlertTriangle, AlertCircle, ChevronDown} from "lucide-react";
import {SceneData} from "@/lib/api/types/supabase/VideoGenerationTasks";
import StoryboardSection from "@/components/page/workspace/create/create-form-panel/StoryboardSection";
import BYOKModelSelector from "@/components/public/BYOKModelSelector";
import VideoSpecsSelector from "@/components/public/VideoSpecsSelector";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

interface CreateFormPanelProps {
    script: string;
    sceneDataList: SceneData[];
    videoTitle: string | null;
    videoDescription: string | null;
    voiceUrl: string | null;
    selectedVoiceId: string;
    expectedVideoTotalDuration: number;
    isGeneratingStoryboardData: boolean;
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    aspectRatio: '16:9' | '9:16';
    resolution: '720p' | '1080p' | '2160p';
    isFalAiKeyMissing: boolean;
    onChangeScript: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onClickGenerateWithAI: () => void;
    onClickGenerateStoryboard: () => void;
    onChangeReferenceId: (id: string) => void;
    onChangeI2iId: (id: string) => void;
    onChangeI2vId: (id: string) => void;
    onChangeAspectRatio: (ratio: '16:9' | '9:16') => void;
    onChangeResolution: (res: '720p' | '1080p' | '2160p') => void;
}

function CreateFormPanel({
    script,
    sceneDataList,
    videoTitle,
    videoDescription,
    voiceUrl,
    selectedVoiceId,
    expectedVideoTotalDuration,
    isGeneratingStoryboardData,
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    aspectRatio,
    resolution,
    isFalAiKeyMissing,
    onChangeScript,
    onClickGenerateWithAI,
    onClickGenerateStoryboard,
    onChangeReferenceId,
    onChangeI2iId,
    onChangeI2vId,
    onChangeAspectRatio,
    onChangeResolution
}: CreateFormPanelProps) {
    const router = useRouter();

    // Helper function to extract supported resolutions from a model
    const getModelSupportedResolutions = (modelId: string | null) => {
        if (!modelId) return [];
        const model = aiModelList.find(m => m.id === modelId);
        if (!model || !model.ai_model_price_list) return [];
        return model.ai_model_price_list.map(p => {
            if (p.unit.includes('720p')) return '720p';
            if (p.unit.includes('1080p')) return '1080p';
            if (p.unit.includes('2160p')) return '2160p';
            return null;
        }).filter(Boolean) as ('720p' | '1080p' | '2160p')[];
    };

    const isResolutionMismatched = useMemo(() => {
        const refResolutions = getModelSupportedResolutions(selectedReferenceId);
        const i2iResolutions = getModelSupportedResolutions(selectedI2iId);

        const hasRefMismatch = refResolutions.length > 0 && !refResolutions.includes(resolution);
        const hasI2iMismatch = i2iResolutions.length > 0 && !i2iResolutions.includes(resolution);

        return hasRefMismatch || hasI2iMismatch;
    }, [selectedReferenceId, selectedI2iId, resolution, aiModelList]);

    // 예상 영상 시간 계산 (2.5단어/초 기준)
    const estimatedDuration = useMemo(() => {
        if (!script.trim()) return 0;
        const wordCount = script.split(' ').length;
        return Math.round(wordCount / 2.5);
    }, [script]);

    return (
        <div className="flex-[4.3] bg-transparent border-r border-white/5 overflow-y-auto custom-scrollbar">
            <div className="p-8">
                <div className="space-y-8">

                    {/* Script Section */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <label className="block text-[15px] font-medium text-zinc-100 uppercase tracking-wider">
                                    Script
                                </label>
                                {script.trim() && (
                                    <span className="px-2 py-0.5 bg-zinc-800/80 text-zinc-300 text-xs font-medium rounded border border-white/5">
                                        ~{estimatedDuration}s
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={onClickGenerateWithAI}
                                className="px-3 py-1.5 bg-white/5 border border-white/10 text-zinc-300 rounded-lg text-sm font-medium hover:bg-white/10 hover:text-white transition-colors flex items-center space-x-1.5"
                            >
                                <Sparkles size={14} className="text-indigo-400" />
                                <span>Generate with AI</span>
                            </button>
                        </div>
                        <textarea
                            value={script}
                            onChange={onChangeScript}
                            placeholder="Describe what you want to create. Be as detailed as possible..."
                            rows={8}
                            className="w-full px-4 py-3 rounded-xl bg-zinc-900/40 border border-white/10 text-zinc-100 placeholder-zinc-600 focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 focus:outline-none transition-colors resize-none text-[15px] leading-relaxed"
                        />
                    </div>

                    {/* Render Setup Section */}
                    <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                            <MonitorPlay size={18} className="text-zinc-400" />
                            <span>Render Setup</span>
                        </div>

                        <VideoSpecsSelector
                            aspectRatio={aspectRatio}
                            resolution={resolution}
                            isResolutionMismatched={isResolutionMismatched}
                            onChangeAspectRatio={onChangeAspectRatio}
                            onChangeResolution={onChangeResolution}
                        />

                        {/* Notice & Error Banner Area */}
                        <div className="space-y-2">
                            {/* Model Compatibility Info Banner */}
                            <div className="flex items-start gap-2 bg-zinc-900/60 border border-white/5 rounded-lg p-3 text-[12px] text-zinc-400 leading-relaxed">
                                <AlertCircle size={15} className="text-zinc-500 flex-shrink-0 mt-0.5" />
                                <div>
                                    <span className="font-semibold text-zinc-300">Model Compatibility: </span>
                                    The global resolution choice filters and prioritizes compatible models below. Incompatible models will be disabled or fall back to high resolution.
                                </div>
                            </div>

                            {/* API Key Missing Banner */}
                            {isFalAiKeyMissing && (
                                <div className="flex items-start justify-between gap-3 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[12px] text-red-400">
                                    <div className="flex items-start gap-2 leading-relaxed">
                                        <AlertTriangle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <span className="font-semibold">FAL.AI Key Required: </span>
                                            Please configure your API key in the Profile page to generate videos.
                                        </div>
                                    </div>
                                    <button 
                                        type="button"
                                        onClick={() => router.push('/profile')} 
                                        className="text-[11px] font-bold text-red-300 hover:text-red-200 underline whitespace-nowrap"
                                    >
                                        Go to Profile
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* BYOK Model Selector Dropdowns */}
                        <div className="pt-4 border-t border-white/5">
                            <BYOKModelSelector
                                aiModelList={aiModelList}
                                selectedReferenceId={selectedReferenceId}
                                selectedI2iId={selectedI2iId}
                                selectedI2vId={selectedI2vId}
                                globalResolution={resolution}
                                onChangeReferenceId={onChangeReferenceId}
                                onChangeI2iId={onChangeI2iId}
                                onChangeI2vId={onChangeI2vId}
                            />
                        </div>
                    </section>

                    {/* Storyboard Section */}
                    <StoryboardSection
                        script={script}
                        sceneDataList={sceneDataList}
                        videoTitle={videoTitle}
                        videoDescription={videoDescription}
                        voiceUrl={voiceUrl}
                        expectedVideoTotalDuration={expectedVideoTotalDuration}
                        selectedVoiceId={selectedVoiceId}
                        isGeneratingStoryboardData={isGeneratingStoryboardData}
                        onClickGenerateStoryboard={onClickGenerateStoryboard}
                    />
                </div>
            </div>
        </div>
    )
}

export default memo(CreateFormPanel);