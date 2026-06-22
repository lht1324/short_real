import {ChangeEvent, memo, useMemo} from "react";
import {Sparkles, MonitorPlay} from "lucide-react";
import {SceneData} from "@/lib/api/types/supabase/VideoGenerationTasks";
import StoryboardSection from "@/components/page/workspace/create/create-form-panel/StoryboardSection";
import BYOKModelSelector from "@/components/page/workspace/create/create-form-panel/BYOKModelSelector";
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
    // Supported Resolutions for selected video model
    const supportedResolutions = useMemo(() => {
        const model = aiModelList.find(m => m.id === selectedI2vId);
        if (!model || !model.ai_model_price_list) return ['1080p']; // fallback default
        
        return model.ai_model_price_list.map(p => {
            if (p.unit.includes('720p')) return '720p';
            if (p.unit.includes('1080p')) return '1080p';
            if (p.unit.includes('2160p')) return '2160p';
            return null;
        }).filter(Boolean) as string[];
    }, [aiModelList, selectedI2vId]);

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

                    {/* AI Model Selection Section */}
                    <BYOKModelSelector
                        aiModelList={aiModelList}
                        selectedReferenceId={selectedReferenceId}
                        selectedI2iId={selectedI2iId}
                        selectedI2vId={selectedI2vId}
                        isFalAiKeyMissing={isFalAiKeyMissing}
                        onChangeReferenceId={onChangeReferenceId}
                        onChangeI2iId={onChangeI2iId}
                        onChangeI2vId={onChangeI2vId}
                    />

                    {/* Video Specs Section */}
                    <section className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
                        <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                            <MonitorPlay size={18} className="text-zinc-400" />
                            <span>Video Specs</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Aspect Ratio</label>
                                <select 
                                    value={aspectRatio} 
                                    onChange={(e) => onChangeAspectRatio(e.target.value as '16:9' | '9:16')}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                                >
                                    <option value="9:16" className="bg-zinc-900">Vertical (9:16)</option>
                                    <option value="16:9" className="bg-zinc-900">Horizontal (16:9)</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Resolution</label>
                                <select 
                                    value={resolution} 
                                    onChange={(e) => onChangeResolution(e.target.value as '720p' | '1080p' | '2160p')}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                                >
                                    <option value="720p" disabled={!supportedResolutions.includes('720p')} className={!supportedResolutions.includes('720p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}>
                                        720p {!supportedResolutions.includes('720p') && "(Not supported)"}
                                    </option>
                                    <option value="1080p" disabled={!supportedResolutions.includes('1080p')} className={!supportedResolutions.includes('1080p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}>
                                        1080p {!supportedResolutions.includes('1080p') && "(Not supported)"}
                                    </option>
                                    <option value="2160p" disabled={!supportedResolutions.includes('2160p')} className={!supportedResolutions.includes('2160p') ? "bg-zinc-900 text-zinc-600" : "bg-zinc-900"}>
                                        4K (2160p) {!supportedResolutions.includes('2160p') && "(Not supported)"}
                                    </option>
                                </select>
                            </div>
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