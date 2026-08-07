'use client'

import { memo } from "react";
import { ChevronDown, SlidersHorizontal, Sparkles } from "lucide-react";
import { ProductionPackage } from "./costStructureData";

export interface PackageSummaryCardProps {
    activePkg: ProductionPackage;
    totalCost: number;
    isLoadingModels: boolean;
    modelNames: { t2i: string | undefined; i2i: string | undefined; i2v: string | undefined };
    onClickOpenModelSheet: () => void;
}

function PackageSummaryCard({
    activePkg,
    totalCost,
    isLoadingModels,
    modelNames,
    onClickOpenModelSheet,
}: PackageSummaryCardProps) {
    return (
        <div className="p-5 rounded-3xl bg-[#0f0f16] border border-white/10 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                        {activePkg.durationSec}s Video Package
                    </span>
                    <h3 className="text-base font-bold text-white">{activePkg.name}</h3>
                </div>
                {activePkg.badge && (
                    <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-bold rounded-full flex items-center gap-1">
                        <Sparkles size={10} />
                        {activePkg.badge}
                    </span>
                )}
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
                {activePkg.description}
            </p>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5 text-center">
                <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-[10px] text-zinc-500 block">Characters</span>
                    <span className="text-xs font-mono font-bold text-white">{activePkg.characters}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-[10px] text-zinc-500 block">Scenes</span>
                    <span className="text-xs font-mono font-bold text-white">{activePkg.scenes}</span>
                </div>
                <div className="p-2 rounded-xl bg-white/5">
                    <span className="text-[10px] text-zinc-500 block">Duration</span>
                    <span className="text-xs font-mono font-bold text-white">{activePkg.durationSec}s</span>
                </div>
            </div>

            {/* Total Estimated Direct Cost */}
            <div className="pt-3 border-t border-white/10 flex items-baseline justify-between">
                <span className="text-xs font-medium text-zinc-400">Estimated Direct API Cost</span>
                <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-light text-zinc-400">$</span>
                    <span className="text-3xl font-bold font-mono text-white tracking-tight">
                        {totalCost > 0 ? totalCost.toFixed(3) : "--"}
                    </span>
                </div>
            </div>

            {/* Model Settings Entry (Tap to Open Bottom Sheet) */}
            <div className="pt-3 border-t border-white/10">
                <button
                    onClick={onClickOpenModelSheet}
                    className="w-full flex items-center justify-between gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 active:bg-white/10 active:scale-[0.99] transition-all text-left"
                >
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2 bg-white/10 rounded-xl shrink-0">
                            <SlidersHorizontal size={16} className="text-white" />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-white">Model Settings</span>
                            {isLoadingModels ? (
                                <span className="text-[10px] text-zinc-400 truncate mt-0.5">Loading models...</span>
                            ) : (
                                <div className="flex flex-col mt-1 min-w-0 space-y-0.5">
                                    <span className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0 w-10">Char</span>
                                        <span className="text-[10px] text-zinc-200 truncate">{modelNames.t2i || "-"}</span>
                                    </span>
                                    <span className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0 w-10">Scene</span>
                                        <span className="text-[10px] text-zinc-200 truncate">{modelNames.i2i || "-"}</span>
                                    </span>
                                    <span className="flex items-baseline gap-1.5 min-w-0">
                                        <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0 w-10">Video</span>
                                        <span className="text-[10px] text-zinc-200 truncate">{modelNames.i2v || "-"}</span>
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                    <ChevronDown size={16} className="text-zinc-400 shrink-0 rotate-180" />
                </button>
            </div>
        </div>
    );
}

export default memo(PackageSummaryCard);
