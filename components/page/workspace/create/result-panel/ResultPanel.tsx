import {memo} from "react";
import {AlertTriangle, Coins, Film, Save, Sparkles} from "lucide-react";
import CreditUsageCard from "@/components/page/workspace/create/result-panel/CreditUsageCard";

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
    onClickSaveDraft,
    onClickGenerateVideo,
}: ResultPanelProps) {
    return (
        <div className="flex-[3] bg-black flex flex-col relative">
            {/* Vaporwave Background Effects */}
            <div className="absolute inset-0 opacity-10">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-52 h-52 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full blur-3xl"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-full blur-3xl"></div>
            </div>

            <div className="flex-1 flex p-8 items-center justify-center relative z-10">
                {(isStoryboardGenerated && videoTitle && videoDescription) ? (<div>
                    {/* Video Metadata Section */}
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

                    {/* Credit Usage Card */}
                    <CreditUsageCard
                        expectedVideoTotalDuration={expectedVideoTotalDuration}
                        expectedDurationUsage={expectedDurationUsage}
                        expectedVideoSceneCount={expectedVideoSceneCount}
                        expectedSceneCountUsage={expectedSceneCountUsage}
                        expectedCreditUsage={expectedCreditUsage}
                    />
                </div>) : (
                    <div className="text-center">
                        <div className="text-gray-400 mb-4">
                            <Sparkles className="w-16 h-16 mx-auto mb-3 opacity-50" />
                        </div>
                        <p className="text-base text-gray-400 font-medium">No results yet</p>
                        <p className="text-sm text-gray-500 mt-1">Generate a storyboard to see your video details</p>
                    </div>
                )}
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
                            className={`flex-1 min-w-[280px] group px-6 py-3 rounded-xl text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                                isCreditInsufficient
                                    ? 'bg-red-500/10 border-2 border-red-500 text-red-500 hover:bg-red-500/20 shadow-red-500/25'
                                    : 'bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-600 hover:to-purple-700 shadow-purple-500/25'
                            }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Requesting...</span>
                                </>
                            ) : isCreditInsufficient ? (
                                <>
                                    <AlertTriangle className="w-5 h-5" />
                                    <span>Not Enough Credits</span>
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
                                        <span>{isStoryboardGenerated && videoTitle ? '🟢' : '🔴'}</span>
                                        <span className={isStoryboardGenerated && videoTitle ? 'text-green-300' : 'text-gray-400'}>
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
    )
}

export default memo(ResultPanel);