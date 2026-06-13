import {memo} from "react";
import {AlertTriangle, Coins, Film, Save, Sparkles, Loader2, CheckCircle2, Circle, FileText} from "lucide-react";
import EstimatedCostCard from "@/components/page/workspace/create/result-panel/EstimatedCostCard";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

interface ResultPanelProps {
    isStoryboardGenerated: boolean,
    videoTitle: string | null;
    videoDescription: string | null;
    expectedVideoTotalDuration: number;
    expectedDurationUsage: number;
    expectedVideoSceneCount: number;
    expectedSceneCountUsage: number;
    expectedCreditUsage: number;
    script: string;
    selectedVoiceId: string;
    selectedStyleId: string;
    isSaving: boolean;
    isSubmitting: boolean;
    isCreditInsufficient: boolean;
    isVideoGenerationEnabled: boolean;
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    onClickSaveDraft: () => void;
    onClickGenerateVideo: () => void;
}

function ResultPanel({
    isStoryboardGenerated,
    videoTitle,
    videoDescription,
    expectedVideoTotalDuration,
    expectedDurationUsage,
    expectedVideoSceneCount,
    expectedSceneCountUsage,
    expectedCreditUsage,
    script,
    selectedVoiceId,
    selectedStyleId,
    isSaving,
    isSubmitting,
    isCreditInsufficient,
    isVideoGenerationEnabled,
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    onClickSaveDraft,
    onClickGenerateVideo,
}: ResultPanelProps) {
    return (
        <div className="flex-[3] bg-transparent flex flex-col relative border-l border-white/5">
            <div className="flex-1 flex p-8 items-center justify-center relative z-10 overflow-y-auto custom-scrollbar">
                {(isStoryboardGenerated && videoTitle && videoDescription) ? (<div className="w-full max-w-2xl">
                    {/* Video Metadata Section */}
                    <div className="mb-4 space-y-3">
                        {/* Title Card */}
                        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-900/60">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                        <Film className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">Video Title</div>
                                    <h3 className="text-[15px] font-medium leading-snug text-zinc-100">
                                        {videoTitle}
                                    </h3>
                                </div>
                            </div>
                        </div>

                        {/* Description Card */}
                        <div className="rounded-xl border border-white/5 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-900/60">
                            <div className="flex items-start space-x-3">
                                <div className="flex-shrink-0 mt-0.5">
                                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                                        <FileText className="w-4 h-4 text-zinc-400" />
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wider">Description</div>
                                    <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-zinc-400">
                                        {videoDescription}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Estimated Cost Card */}
                    <EstimatedCostCard
                        aiModelList={aiModelList}
                        selectedReferenceId={selectedReferenceId}
                        selectedI2iId={selectedI2iId}
                        selectedI2vId={selectedI2vId}
                        expectedVideoSceneCount={expectedVideoSceneCount}
                        expectedVideoTotalDuration={expectedVideoTotalDuration}
                    />
                </div>) : (
                    <div className="text-center">
                        <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-6 h-6 text-zinc-600" />
                        </div>
                        <p className="text-sm font-medium text-zinc-300">No storyboard yet</p>
                        <p className="text-[13px] text-zinc-500 mt-1.5">Generate a storyboard to preview your video details.</p>
                    </div>
                )}
            </div>

            <div className="p-6 border-t border-white/5 bg-zinc-950/80 backdrop-blur-md relative z-10">
                <div className="flex w-full items-center space-x-4 max-w-2xl mx-auto">
                    {/* Save Draft 버튼 */}
                    <button
                        onClick={onClickSaveDraft}
                        disabled={isSaving}
                        className="flex items-center justify-center space-x-2 w-32 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-zinc-300 hover:text-white rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Saving...</span>
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                <span>Save Draft</span>
                            </>
                        )}
                    </button>

                    {/* Generate Video 버튼 */}
                    <div className="relative group flex-1">
                        <button
                            onClick={onClickGenerateVideo}
                            disabled={!isVideoGenerationEnabled || isSubmitting}
                            className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isCreditInsufficient
                                    ? 'bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20'
                                    : 'bg-white text-black hover:bg-zinc-200 shadow-sm'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Requesting...</span>
                                </>
                            ) : isCreditInsufficient ? (
                                <>
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Not Enough Credits</span>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center space-x-1 px-2 py-0.5 bg-black/10 rounded-md">
                                        <Coins className="w-3.5 h-3.5 text-zinc-700" />
                                        <span className="text-[11px] font-bold">-{expectedCreditUsage}</span>
                                    </div>
                                    <span>Generate Video</span>
                                </>
                            )}
                        </button>

                        {/* 툴팁 오버레이 */}
                        {!isVideoGenerationEnabled && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-56 bg-zinc-900 border border-white/10 rounded-lg p-3.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                                <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Requirements</div>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {script.trim() ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={script.trim() ? 'text-zinc-200' : 'text-zinc-500'}>
                                            Script written
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {isStoryboardGenerated && videoTitle ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={isStoryboardGenerated && videoTitle ? 'text-zinc-200' : 'text-zinc-500'}>
                                            Storyboard generated
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {selectedVoiceId ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={selectedVoiceId ? 'text-zinc-200' : 'text-zinc-500'}>
                                            Voice selected
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {selectedStyleId ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={selectedStyleId ? 'text-zinc-200' : 'text-zinc-500'}>
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
    )
}

export default memo(ResultPanel);