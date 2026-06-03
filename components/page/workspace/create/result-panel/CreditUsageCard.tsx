import {memo} from "react";
import {Coins} from "lucide-react";

interface CreditUsageCardProps {
    expectedVideoTotalDuration: number;
    expectedDurationUsage: number;
    expectedVideoSceneCount: number;
    expectedSceneCountUsage: number;
    expectedCreditUsage: number;
}

function CreditUsageCard({
    expectedVideoTotalDuration,
    expectedDurationUsage,
    expectedVideoSceneCount,
    expectedSceneCountUsage,
    expectedCreditUsage,
}: CreditUsageCardProps) {
    return (
        <div className="mb-6 rounded-xl border border-white/5 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-900/60">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        <Coins className="w-4 h-4 text-zinc-400" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-medium text-zinc-500 mb-2 uppercase tracking-wider">Estimated Credit Usage</div>

                    <div className="flex flex-col space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-zinc-400">Base (30s / 6 scenes)</span>
                            <div className="flex items-center space-x-1">
                                <span className="text-[13px] font-semibold text-zinc-300">100</span>
                            </div>
                        </div>

                        <div className="border-t border-white/5 my-1"></div>

                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-zinc-500">
                                {`Extra Duration (+${expectedVideoTotalDuration > 30 ? Math.ceil(expectedVideoTotalDuration - 30) : 0}s)`}
                            </span>
                            <div className="flex items-center space-x-1">
                                <span className={`text-[13px] font-medium ${expectedVideoTotalDuration > 30 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                    +{expectedDurationUsage}
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-[13px] text-zinc-500">
                                {`Extra Scenes (+${expectedVideoSceneCount > 6 ? expectedVideoSceneCount - 6 : 0})`}
                            </span>
                            <div className="flex items-center space-x-1">
                                <span className={`text-[13px] font-medium ${expectedVideoSceneCount > 6 ? 'text-zinc-300' : 'text-zinc-600'}`}>
                                    +{expectedSceneCountUsage}
                                </span>
                            </div>
                        </div>

                        <div className="border-t border-white/5 my-1"></div>

                        {/* Policy Footnote */}
                        <div className="flex w-full items-center justify-between">
                            <span className="text-[10px] text-zinc-600 uppercase tracking-wider font-medium">Overage Policy</span>
                            <div className="flex items-center space-x-2 text-[11px] text-zinc-500">
                                <span>5 / 2s</span>
                                <span className="text-zinc-700">•</span>
                                <span>5 / scene</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <span className="text-sm font-semibold text-zinc-200">Total</span>
                            <div className="flex items-center space-x-1.5 px-2 py-0.5 bg-black/20 rounded-md">
                                <Coins className="w-3 h-3 text-yellow-500/80" />
                                <span className="text-[15px] font-bold text-zinc-100">{expectedCreditUsage}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(CreditUsageCard);