import {ChangeEvent, memo, useMemo} from "react";
import {Sparkles} from "lucide-react";
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
    userCredit: number;
    isGeneratingStoryboardData: boolean;
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    onChangeScript: (e: ChangeEvent<HTMLTextAreaElement>) => void;
    onClickGenerateWithAI: () => void;
    onClickGenerateStoryboard: () => void;
    onChangeReferenceId: (id: string) => void;
    onChangeI2iId: (id: string) => void;
    onChangeI2vId: (id: string) => void;
}

function CreateFormPanel({
    script,
    sceneDataList,
    videoTitle,
    videoDescription,
    voiceUrl,
    selectedVoiceId,
    expectedVideoTotalDuration,
    userCredit,
    isGeneratingStoryboardData,
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    onChangeScript,
    onClickGenerateWithAI,
    onClickGenerateStoryboard,
    onChangeReferenceId,
    onChangeI2iId,
    onChangeI2vId,
}: CreateFormPanelProps) {
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
                        onChangeReferenceId={onChangeReferenceId}
                        onChangeI2iId={onChangeI2iId}
                        onChangeI2vId={onChangeI2vId}
                    />

                    {/* Storyboard Section */}
                    <StoryboardSection
                        script={script}
                        sceneDataList={sceneDataList}
                        videoTitle={videoTitle}
                        videoDescription={videoDescription}
                        voiceUrl={voiceUrl}
                        expectedVideoTotalDuration={expectedVideoTotalDuration}
                        userCredit={userCredit}
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