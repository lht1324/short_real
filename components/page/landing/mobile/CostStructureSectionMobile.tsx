'use client'

import { memo, useState, useMemo, useCallback } from "react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { Calculator, CheckCircle2, Key, Sparkles } from "lucide-react";
import Image from "next/image";

export interface CostStructureSectionMobileProps {
    aiModelDataList: AIModelData[];
}

interface ProductionPackage {
    id: string;
    name: string;
    durationSec: number;
    scenes: number;
    characters: number;
    price: number;
    badge?: string;
    description: string;
}

const PACKAGES: ProductionPackage[] = [
    {
        id: "short",
        name: "Short-form Reel",
        durationSec: 30,
        scenes: 6,
        characters: 3,
        price: 1.686,
        badge: "MOST POPULAR",
        description: "Perfect for Instagram Reels, Shorts, and TikTok ads."
    },
    {
        id: "mid",
        name: "Commercial Spot",
        durationSec: 60,
        scenes: 12,
        characters: 4,
        price: 3.372,
        description: "Great for product launch teasers and brand stories."
    },
    {
        id: "long",
        name: "Short Film",
        durationSec: 120,
        scenes: 24,
        characters: 5,
        price: 6.744,
        description: "Ideal for cinematic short narratives and music videos."
    }
];

function CostStructureSectionMobile({ aiModelDataList }: CostStructureSectionMobileProps) {
    const [selectedPkgId, setSelectedPkgId] = useState<string>("short");
    const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');

    const activePkg = useMemo(
        () => PACKAGES.find(p => p.id === selectedPkgId) || PACKAGES[0],
        [selectedPkgId]
    );

    const onClickPkg = useCallback((id: string) => {
        setSelectedPkgId(id);
    }, []);

    return (
        <section id="coststructure" className="relative py-12 px-4 overflow-hidden">
            <div className="relative z-10 max-w-sm mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-black text-white tracking-tight mb-2 leading-tight">
                        Transparent,<br />
                        <span className="text-zinc-500">Usage-Based Pricing</span>
                    </h2>
                    <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                        Zero markup. You pay exact direct API costs to your provider.
                    </p>
                </div>

                {/* Mobile Package Selection Cards */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-zinc-400 mb-1">
                        <span className="flex items-center gap-1.5">
                            <Calculator size={14} className="text-white" />
                            Production Scope Package
                        </span>
                        {/* Resolution Switch */}
                        <div className="flex gap-1 bg-white/5 p-0.5 rounded-lg border border-white/10">
                            {(['720p', '1080p'] as const).map(res => (
                                <button
                                    key={res}
                                    onClick={() => setResolution(res)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                                        resolution === res ? 'bg-white text-black' : 'text-zinc-400'
                                    }`}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {PACKAGES.map((pkg) => {
                            const isSelected = pkg.id === activePkg.id;
                            return (
                                <button
                                    key={pkg.id}
                                    onClick={() => onClickPkg(pkg.id)}
                                    className={`
                                        p-3 rounded-2xl border text-left flex flex-col justify-between transition-all active:scale-95
                                        ${isSelected
                                            ? 'bg-white text-black border-white shadow-xl'
                                            : 'bg-white/5 text-zinc-300 border-white/10 active:bg-white/10'}
                                    `}
                                >
                                    <div>
                                        <div className="text-[10px] font-mono font-bold opacity-70 mb-0.5">
                                            {pkg.durationSec}s
                                        </div>
                                        <div className="text-xs font-bold leading-tight">
                                            {pkg.name.split(' ')[0]}
                                        </div>
                                    </div>
                                    <div className="text-sm font-black font-mono mt-3">
                                        ${pkg.price.toFixed(2)}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Selected Package Cost Breakdown Card */}
                <div className="p-5 rounded-3xl bg-[#0f0f16] border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <span className="text-xs font-mono font-bold text-zinc-500 uppercase tracking-wider">
                                {activePkg.durationSec}s Video Package
                            </span>
                            <h3 className="text-base font-bold text-white">{activePkg.name}</h3>
                        </div>
                        {activePkg.badge && (
                            <span className="px-2.5 py-1 bg-red-500/20 text-red-400 border border-red-500/30 text-[9px] font-black rounded-full flex items-center gap-1">
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
                            <span className="text-3xl font-black font-mono text-white tracking-tight">
                                {activePkg.price.toFixed(3)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* BYOK Fast Info Box */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl">
                            <Key size={18} className="text-white" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-white">Bring Your Own Key (BYOK)</span>
                            <span className="text-[10px] text-zinc-400">Zero platform markup via fal.ai</span>
                        </div>
                    </div>
                    <CheckCircle2 size={16} className="text-emerald-400" />
                </div>

            </div>
        </section>
    );
}

export default memo(CostStructureSectionMobile);
