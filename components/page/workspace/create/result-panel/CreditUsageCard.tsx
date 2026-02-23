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
        <div className="group relative mb-6 rounded-xl border border-purple-500/30 bg-gradient-to-r from-yellow-500/5 via-orange-500/5 to-yellow-500/5 p-4 backdrop-blur-sm transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-yellow-500/10">
            <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <Coins className="w-4 h-4 text-white" />
                    </div>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-purple-300 mb-1.5">Estimated Credit Usage</div>

                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-base text-gray-300">Base (30s / 6 scenes)</span>
                            <div className="flex items-center space-x-1">
                                <Coins className="w-4 h-4 text-white" />
                                <span className="text-base font-semibold text-white">100</span>
                            </div>
                        </div>

                        <div className="border-t border-purple-500/20 my-2"></div>

                        <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400">
                                                        {`Extra Duration (+${expectedVideoTotalDuration > 30 ? Math.ceil(expectedVideoTotalDuration - 30) : 0}s)`}
                                                    </span>
                            <div className="flex items-center space-x-1">
                                <Coins className={`w-3.5 h-3.5 ${expectedVideoTotalDuration > 30 ? 'text-yellow-300' : 'text-gray-500'}`} />
                                <span className={`text-sm font-medium ${expectedVideoTotalDuration > 30 ? 'text-yellow-300' : 'text-gray-500'}`}>
                                                        +{expectedDurationUsage}
                                                    </span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-400">
                                                        {`Extra Scenes (+${expectedVideoSceneCount > 6 ? expectedVideoSceneCount - 6 : 0})`}
                                                    </span>
                            <div className="flex items-center space-x-1">
                                <Coins className={`w-3.5 h-3.5 ${expectedVideoSceneCount > 6 ? 'text-yellow-300' : 'text-gray-500'}`} />
                                <span className={`text-sm font-medium ${expectedVideoSceneCount > 6 ? 'text-yellow-300' : 'text-gray-500'}`}>
                                                        +{expectedSceneCountUsage}
                                                    </span>
                            </div>
                        </div>

                        <div className="border-t border-purple-500/20 my-2"></div>

                        {/* Policy Footnote */}
                        <div className="flex w-fit self-start items-center justify-between">
                            <span className="text-xs mr-2 text-gray-400">Overage Policy</span>
                            <div className="flex items-center space-x-2 text-xs text-gray-300">
                                <div className="flex items-center space-x-1">
                                    <Coins className="w-3 h-3 text-yellow-400" />
                                    <span>5 / 2s</span>
                                </div>
                                <span className="text-gray-500">•</span>
                                <div className="flex items-center space-x-1">
                                    <Coins className="w-3 h-3 text-yellow-400" />
                                    <span>5 / scene</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <span className="text-base font-semibold text-purple-300">Total</span>
                            <div className="flex items-center space-x-1">
                                <Coins className="w-5 h-5 text-yellow-400" />
                                <span className="text-lg font-bold text-yellow-400">{expectedCreditUsage}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default memo(CreditUsageCard);