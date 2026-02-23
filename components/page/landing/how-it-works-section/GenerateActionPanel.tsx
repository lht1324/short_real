'use client'

import {memo, useState} from "react";
import {AlertCircle, Clapperboard, Sparkles, XCircle} from "lucide-react";
import {AnimPresence} from "@/components/public/framerMotion/AnimPresence";
import {MotionDiv, MotionSpan} from "@/components/public/framerMotion/Motion";

interface GenerateActionPanelProps {
    estimatedCost: number;
    isSystemReady: boolean;
    isGenerating: boolean;
    validationErrors: string[];
    onClickGenerate: () => Promise<void>;
}

function GenerateActionPanel({
    estimatedCost,
    isSystemReady,
    isGenerating,
    validationErrors,
    onClickGenerate,
}: GenerateActionPanelProps) {
    // Tooltip
    const [showErrorTooltip, setShowErrorTooltip] = useState(false);

    return (
        <div className="h-[240px] bg-gradient-to-br from-[#12121a] to-[#0f0f16] border border-white/10 rounded-3xl p-6 relative overflow-visible flex flex-col justify-between group">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10 pointer-events-none overflow-hidden rounded-3xl" />

            <div className="relative z-10">
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 text-cyan-400">
                        <div className="p-1.5 bg-cyan-500/10 rounded-md">
                            <Clapperboard size={16} />
                        </div>
                        <span className="text-sm font-bold tracking-wide">STEP 3: ACTION</span>
                    </div>

                    <div
                        className="relative"
                        onMouseEnter={() => !isSystemReady && setShowErrorTooltip(true)}
                        onMouseLeave={() => setShowErrorTooltip(false)}
                    >
                        <div className={`
                                        px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider border shadow-lg transition-all
                                        ${isSystemReady
                            ? 'bg-green-500/10 border-green-500/20 text-green-400 shadow-[0_0_10px_-3px_rgba(74,222,128,0.3)] cursor-default'
                            : 'bg-red-500/10 border-red-500/20 text-red-400 shadow-[0_0_10px_-3px_rgba(239,68,68,0.3)] cursor-help'}
                                    `}>
                            {isSystemReady ? "System Ready" : "Setup Required"}
                        </div>

                        <AnimPresence>
                            {showErrorTooltip && !isSystemReady && (
                                <MotionDiv
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 5, scale: 0.95 }}
                                    transition={{ duration: 0.2 }}
                                    className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a24] border border-red-500/30 rounded-xl p-3 z-50 shadow-2xl shadow-black/50 backdrop-blur-sm"
                                >
                                    <div className="text-[10px] text-red-400 font-bold mb-2 flex items-center gap-1.5">
                                        <AlertCircle size={12} />
                                        MISSING REQUIREMENTS
                                    </div>
                                    <div className="space-y-1.5">
                                        {validationErrors.map((err, i) => (
                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                                <XCircle size={12} className="text-red-500/50 shrink-0" />
                                                {err}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="absolute -top-1.5 right-4 w-3 h-3 bg-[#1a1a24] border-t border-l border-red-500/30 rotate-45" />
                                </MotionDiv>
                            )}
                        </AnimPresence>
                    </div>
                </div>

                <div className="mt-6">
                    <p className="text-gray-500 text-[10px] uppercase tracking-wider mb-1 font-semibold">Estimated Cost</p>
                    <div className="text-3xl font-bold text-white flex items-baseline gap-2">
                        {Math.floor(estimatedCost)} <span className="text-sm text-yellow-500 font-normal">Credits</span>
                    </div>
                </div>
            </div>

            <button
                onClick={onClickGenerate}
                disabled={!isSystemReady || isGenerating}
                className={`
                    relative w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 border flex items-center justify-center gap-2 overflow-hidden
                    ${isSystemReady 
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 hover:scale-[1.02] hover:brightness-110 active:scale-95 border-white/10 cursor-pointer'
                        : 'bg-white/5 text-gray-500 border-white/5 cursor-not-allowed grayscale opacity-50'}
                `}
            >
                {isSystemReady && !isGenerating && (
                    <div className="absolute inset-0 -translate-x-full hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none" />
                )}

                <div className="relative z-10 flex items-center justify-center gap-2">
                    {isGenerating ? (
                        <>
                            <MotionSpan
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                            >
                                <Sparkles size={18} />
                            </MotionSpan>
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <Sparkles size={18} className={isSystemReady ? "text-white/70" : ""} />
                            <span>Generate Video</span>
                        </>
                    )}
                </div>
            </button>

        </div>
    )
}

export default memo(GenerateActionPanel);