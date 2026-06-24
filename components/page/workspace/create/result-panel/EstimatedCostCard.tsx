import {memo, useMemo} from "react";
import {Info, AlertCircle} from "lucide-react";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {getMatchedModelPrice} from "@/components/page/workspace/create/result-panel/costCalculator";

interface EstimatedCostCardProps {
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    expectedVideoSceneCount: number;
    expectedVideoTotalDuration: number;
    estimatedCharacterCount: number;
    resolution: '720p' | '1080p' | '2160p';
}

function EstimatedCostCard({
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    expectedVideoSceneCount,
    expectedVideoTotalDuration,
    estimatedCharacterCount,
    resolution,
}: EstimatedCostCardProps) {
    const t2iModel = useMemo(() => aiModelList.find(m => m.id === selectedReferenceId), [aiModelList, selectedReferenceId]);
    const i2iModel = useMemo(() => aiModelList.find(m => m.id === selectedI2iId), [aiModelList, selectedI2iId]);
    const i2vModel = useMemo(() => aiModelList.find(m => m.id === selectedI2vId), [aiModelList, selectedI2vId]);

    const t2iPriceResult = useMemo(() => getMatchedModelPrice(t2iModel, resolution, 'text-to-image'), [t2iModel, resolution]);
    const i2iPriceResult = useMemo(() => getMatchedModelPrice(i2iModel, resolution, 'image-to-image'), [i2iModel, resolution]);
    const i2vPriceResult = useMemo(() => getMatchedModelPrice(i2vModel, resolution, 'image-to-video'), [i2vModel, resolution]);

    const scenes = useMemo(() => Math.max(1, expectedVideoSceneCount), [expectedVideoSceneCount]);
    const duration = useMemo(() => Math.max(5, expectedVideoTotalDuration), [expectedVideoTotalDuration]);

    const t2iCost = useMemo(() => t2iPriceResult.price * estimatedCharacterCount, [t2iPriceResult.price, estimatedCharacterCount]);
    const i2iCost = useMemo(() => i2iPriceResult.price * scenes, [i2iPriceResult.price, scenes]);
    const i2vCost = useMemo(() => i2vPriceResult.price * duration, [i2vPriceResult.price, duration]);

    const estimatedCost = useMemo(() => t2iCost + i2iCost + i2vCost, [t2iCost, i2iCost, i2vCost]);

    return (
        <div className="mb-6 rounded-xl border border-white/5 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-900/60 relative">
            <div className="absolute top-0 right-0 p-3 cursor-help group/info">
                <Info size={14} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-800 border border-white/10 rounded-lg shadow-xl opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible transition-all duration-200 text-left z-20 pointer-events-none">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                        This is the estimated direct cost billed to your connected provider accounts (e.g., fal.ai, Replicate) based on the current storyboard length ({expectedVideoSceneCount} scenes, {Math.ceil(expectedVideoTotalDuration)}s).
                    </p>
                </div>
            </div>

            <div className="flex flex-col space-y-5">
                {/* 1. Cost Breakdown (Detailed Invoice) */}
                <div className="space-y-4">
                    <div className="text-xs font-bold text-zinc-300 uppercase tracking-widest mb-2">Cost Breakdown</div>
                    
                    {/* Character T2I Cost */}
                    <div className="flex justify-between items-start text-sm py-0.5">
                        <div className="space-y-1">
                            <div className="font-semibold text-zinc-100 flex items-center gap-2">
                                <span>Character Profile</span>
                                <span className="text-xs text-zinc-400 font-mono">({t2iModel?.display_name || "Unknown"})</span>
                            </div>
                            <div className="text-zinc-300 font-mono text-xs">
                                ${t2iPriceResult.price.toFixed(3)} ({t2iPriceResult.matchedResolution}) × {estimatedCharacterCount} Person
                            </div>
                            {t2iPriceResult.isFallback && (
                                <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5 mt-1">
                                    <AlertCircle size={12} className="flex-shrink-0" />
                                    <span>Resolution mismatch: fallback to {t2iPriceResult.matchedResolution}</span>
                                </div>
                            )}
                        </div>
                        <span className="font-bold font-mono text-white">${t2iCost.toFixed(3)}</span>
                    </div>

                    {/* Storyboard Scene I2I Cost */}
                    <div className="flex justify-between items-start text-sm py-0.5">
                        <div className="space-y-1">
                            <div className="font-semibold text-zinc-100 flex items-center gap-2">
                                <span>Storyboard Scenes</span>
                                <span className="text-xs text-zinc-400 font-mono">({i2iModel?.display_name || "Unknown"})</span>
                            </div>
                            <div className="text-zinc-300 font-mono text-xs">
                                ${i2iPriceResult.price.toFixed(3)} ({i2iPriceResult.matchedResolution}) × {scenes} Scenes
                            </div>
                            {i2iPriceResult.isFallback && (
                                <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5 mt-1">
                                    <AlertCircle size={12} className="flex-shrink-0" />
                                    <span>Resolution mismatch: fallback to {i2iPriceResult.matchedResolution}</span>
                                </div>
                            )}
                        </div>
                        <span className="font-bold font-mono text-white">${i2iCost.toFixed(3)}</span>
                    </div>

                    {/* Scene Video I2V Cost */}
                    <div className="flex justify-between items-start text-sm py-0.5">
                        <div className="space-y-1">
                            <div className="font-semibold text-zinc-100 flex items-center gap-2">
                                <span>Scene Video</span>
                                <span className="text-xs text-zinc-400 font-mono">({i2vModel?.display_name || "Unknown"})</span>
                            </div>
                            <div className="text-zinc-300 font-mono text-xs">
                                ${i2vPriceResult.price.toFixed(5)} ({i2vPriceResult.matchedResolution}) × {duration}s
                            </div>
                            {i2vPriceResult.isFallback && (
                                <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5 mt-1">
                                    <AlertCircle size={12} className="flex-shrink-0" />
                                    <span>Resolution mismatch: fallback to {i2vPriceResult.matchedResolution}</span>
                                </div>
                            )}
                        </div>
                        <span className="font-bold font-mono text-white">${i2vCost.toFixed(3)}</span>
                    </div>
                </div>

                {/* 2. Total Cost Display (Invoice Summary) */}
                <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total Estimated Cost</span>
                    <div className="flex items-center gap-1">
                        <span className="text-lg font-bold text-zinc-300 font-sans">$</span>
                        <span className="text-2xl font-black text-white tracking-tight font-mono leading-none">{estimatedCost.toFixed(3)}</span>
                        <span className="text-[10px] text-zinc-400 font-bold font-sans tracking-widest ml-1.5">USD</span>
                    </div>
                </div>

                {/* 3. Footer billing info */}
                <div className="border-t border-white/5 pt-3 text-[11px] text-zinc-500 flex justify-between items-center">
                    <span>Provider Billing (BYOK)</span>
                    {/*<span>Billed directly to fal.ai / Replicate</span>*/}
                    {/* 나중에 플랫폼 선택 기능 추가하면 복구 예정 */}
                    <span>Billed directly to fal.ai</span>
                </div>
            </div>
        </div>
    );
}

export default memo(EstimatedCostCard);