import {memo, useMemo} from "react";
import {AlertTriangle, Coins, Film, Save, Sparkles, Loader2, CheckCircle2, Circle, FileText} from "lucide-react";
import EstimatedCostCard from "@/components/page/workspace/create/result-panel/EstimatedCostCard";
import {getMatchedModelPrice} from "@/components/page/workspace/create/result-panel/costCalculator";
import {AIModelData, AIModelPriceUnit} from "@/lib/api/types/supabase/AIModelData";

interface ResultPanelProps {
    isStoryboardGenerated: boolean,
    videoTitle: string | null;
    videoDescription: string | null;
    expectedVideoTotalDuration: number;
    expectedVideoSceneCount: number;
    script: string;
    selectedVoiceId: string;
    selectedStyleId: string;
    isSaving: boolean;
    isSubmitting: boolean;
    isVideoGenerationEnabled: boolean;
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    resolution: '720p' | '1080p' | '2160p';
    isFalAiKeyMissing: boolean;
    estimatedCharacterCount: number;
    onClickSaveDraft: () => void;
    onClickGenerateVideo: () => void;
}

function ResultPanel({
    isStoryboardGenerated,
    videoTitle,
    videoDescription,
    expectedVideoTotalDuration,
    expectedVideoSceneCount,
    script,
    selectedVoiceId,
    selectedStyleId,
    isSaving,
    isSubmitting,
    isVideoGenerationEnabled,
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    resolution,
    isFalAiKeyMissing,
    estimatedCharacterCount,
    onClickSaveDraft,
    onClickGenerateVideo,
}: ResultPanelProps) {
    const referenceImageAIModelData = useMemo(() => {
        return aiModelList.find((aiModelData) => {
            return aiModelData.id === selectedReferenceId;
        });
    }, [aiModelList, selectedReferenceId]);

    const sceneImageAIModelData = useMemo(() => {
        return aiModelList.find((aiModelData) => {
            return aiModelData.id === selectedI2iId;
        });
    }, [aiModelList, selectedI2iId]);

    const videoAIModelData = useMemo(() => {
        return aiModelList.find((aiModelData) => {
            return aiModelData.id === selectedI2vId;
        });
    }, [aiModelList, selectedI2vId]);

    const referenceImageAIModelPrice = useMemo(() => {
        return getMatchedModelPrice(referenceImageAIModelData, resolution, 'text-to-image').price;
    }, [resolution, referenceImageAIModelData]);

    const sceneImageAIModelPrice = useMemo(() => {
        return getMatchedModelPrice(sceneImageAIModelData, resolution, 'image-to-image').price;
    }, [resolution, sceneImageAIModelData]);

    const videoAIModelPrice = useMemo(() => {
        return getMatchedModelPrice(videoAIModelData, resolution, 'image-to-video').price;
    }, [resolution, videoAIModelData]);

    const expectedAIModelUsage = useMemo(() => {
        const scenes = Math.max(1, expectedVideoSceneCount);
        const duration = Math.max(5, expectedVideoTotalDuration);

        return referenceImageAIModelPrice * estimatedCharacterCount + sceneImageAIModelPrice * scenes + videoAIModelPrice * duration;
    }, [referenceImageAIModelPrice, sceneImageAIModelPrice, videoAIModelPrice, expectedVideoSceneCount, expectedVideoTotalDuration, estimatedCharacterCount]);

    // if (!expectedAIModelUsage) return null;

    return (
        <div className="flex-[3] max-w-[450px] min-w-[380px] w-full bg-transparent flex flex-col relative border-l border-white/5">
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
                        estimatedCharacterCount={estimatedCharacterCount}
                        resolution={resolution}
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
                            disabled={!isVideoGenerationEnabled || isSubmitting || isFalAiKeyMissing}
                            className={`relative w-full py-2.5 px-12 rounded-lg text-sm font-semibold transition-all flex items-center justify-center border ${
                                (!isVideoGenerationEnabled || isFalAiKeyMissing || isSubmitting)
                                    ? "bg-zinc-900 text-zinc-500 border-white/5 cursor-not-allowed"
                                    : "bg-white text-black hover:bg-zinc-200 border-transparent shadow-sm"
                            }`}
                        >
                            {isSubmitting ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-zinc-500" />
                                    <span>Requesting...</span>
                                </div>
                            ) : (
                                <>
                                    <span className="w-full text-center">Generate Video</span>
                                    
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                        {(!isVideoGenerationEnabled || isFalAiKeyMissing) ? (
                                            <span className="flex items-center space-x-1 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                                                <span>Incomplete</span>
                                            </span>
                                        ) : (
                                            <span className="text-[11px] font-mono font-bold text-zinc-900 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                                -${(expectedAIModelUsage ?? 0).toFixed(3)}
                                            </span>
                                        )}
                                    </div>
                                </>
                            )}
                        </button>

                        {/* 툴팁 오버레이 */}
                        {(!isVideoGenerationEnabled || isFalAiKeyMissing) && (
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 w-56 bg-zinc-900 border border-white/10 rounded-lg p-3.5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl">
                                <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Requirements</div>
                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {!isFalAiKeyMissing ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={!isFalAiKeyMissing ? 'text-zinc-200' : 'text-zinc-500'}>
                                            fal.ai Key connected
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {script.trim() ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={script.trim() ? 'text-zinc-200' : 'text-zinc-500'}>
                                            Script written
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {selectedVoiceId ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={selectedVoiceId ? 'text-zinc-200' : 'text-zinc-500'}>
                                            Voice selected
                                        </span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-[13px]">
                                        {isStoryboardGenerated && videoTitle ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}
                                        <span className={isStoryboardGenerated && videoTitle ? 'text-zinc-200' : 'text-zinc-500'}>
                                            Storyboard generated
                                        </span>
                                    </div>
                                    {/* 아직 스타일 도입 안 해서 주석 처리 */}
                                    {/*<div className="flex items-center space-x-2 text-[13px]">*/}
                                    {/*    {selectedStyleId ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Circle size={14} className="text-zinc-700" />}*/}
                                    {/*    <span className={selectedStyleId ? 'text-zinc-200' : 'text-zinc-500'}>*/}
                                    {/*        Style selected*/}
                                    {/*    </span>*/}
                                    {/*</div>*/}
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