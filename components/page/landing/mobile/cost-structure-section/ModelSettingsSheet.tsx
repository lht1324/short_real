'use client'

import { memo } from "react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { CheckCircle2, X } from "lucide-react";
import { getMatchedModelPrice } from "@/lib/utils/costCalculator";
import { AnimPresence } from "@/components/public/framerMotion/AnimPresence";
import { MotionDiv } from "@/components/public/framerMotion/Motion";
import { MODEL_CATEGORY_TABS, ModelCategory, getModelId } from "./costStructureData";

export interface ModelSettingsSheetProps {
    isOpen: boolean;
    onClose: () => void;
    activeCategory: ModelCategory;
    onSelectCategory: (category: ModelCategory) => void;
    models: AIModelData[];
    selectedModelId: string;
    onSelectModel: (modelId: string) => void;
    sortBy: 'name' | 'price';
    sortDir: 'asc' | 'desc';
    onClickSort: (by: 'name' | 'price') => void;
    resolution: '720p' | '1080p';
    isLoading: boolean;
}

function formatUnitPrice(category: ModelCategory, price: number): string {
    if (category === 'image-to-video') {
        return `$${price.toFixed(5)}/sec`;
    }
    return `$${price.toFixed(3)}/${category === 'text-to-image' ? 'person' : 'scene'}`;
}

function ModelSettingsSheet({
    isOpen,
    onClose,
    activeCategory,
    onSelectCategory,
    models,
    selectedModelId,
    onSelectModel,
    sortBy,
    sortDir,
    onClickSort,
    resolution,
    isLoading,
}: ModelSettingsSheetProps) {
    return (
        <AnimPresence>
            {isOpen && (
                <MotionDiv
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
                    onClick={onClose}
                >
                    <MotionDiv
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="w-full max-w-md rounded-t-3xl bg-[#12121a] border-t border-white/15 shadow-2xl pb-[env(safe-area-inset-bottom)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div className="flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 rounded-full bg-white/20" />
                        </div>

                        {/* Sheet Header */}
                        <div className="flex items-start justify-between px-5 pt-2 pb-4">
                            <div>
                                <h3 className="text-base font-bold text-white">Model Settings</h3>
                                <p className="text-[11px] text-zinc-400 mt-0.5">
                                    Choose the AI models behind your estimate.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close model settings"
                                className="h-11 w-11 -mr-2 -mt-1 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-zinc-300 active:bg-white/10 active:scale-95 transition-all"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* Category Segmented Tabs */}
                        <div className="px-5 pb-3">
                            <div className="p-1 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-1">
                                {MODEL_CATEGORY_TABS.map(tab => {
                                    const isSelected = tab.category === activeCategory;
                                    return (
                                        <button
                                            key={tab.category}
                                            onClick={() => onSelectCategory(tab.category)}
                                            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all active:scale-[0.96] ${
                                                isSelected
                                                    ? 'bg-white text-black shadow-md'
                                                    : 'text-zinc-400 hover:text-white'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Sort Controls */}
                        <div className="flex items-center justify-between px-5 pb-2">
                            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                                {models.length} models
                            </span>
                            <div className="flex gap-1">
                                <button
                                    onClick={() => onClickSort('name')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all active:scale-95 ${
                                        sortBy === 'name'
                                            ? 'bg-white text-black border-white'
                                            : 'bg-white/5 text-zinc-400 border-white/10 active:bg-white/10'
                                    }`}
                                >
                                    Name {sortBy === 'name' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                </button>
                                <button
                                    onClick={() => onClickSort('price')}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all active:scale-95 ${
                                        sortBy === 'price'
                                            ? 'bg-white text-black border-white'
                                            : 'bg-white/5 text-zinc-400 border-white/10 active:bg-white/10'
                                    }`}
                                >
                                    Price {sortBy === 'price' ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
                                </button>
                            </div>
                        </div>

                        {/* Model List */}
                        <div className="px-3 pb-4 max-h-[50dvh] overflow-y-auto custom-scrollbar">
                            {models.length === 0 ? (
                                <div className="py-8 text-center text-xs text-zinc-500">
                                    {isLoading ? "Loading models..." : "No models available."}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {models.map(model => {
                                        const modelId = getModelId(model);
                                        const isSelected = selectedModelId === modelId;
                                        const unitPrice = getMatchedModelPrice(model, resolution, activeCategory).price;
                                        return (
                                            <button
                                                key={modelId}
                                                onClick={() => onSelectModel(modelId)}
                                                className={`
                                                    w-full flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all active:scale-[0.98]
                                                    ${isSelected
                                                        ? 'bg-white/10 border-white/30'
                                                        : 'bg-white/5 border-white/10 active:bg-white/10'}
                                                `}
                                            >
                                                <div className="flex flex-col items-start min-w-0">
                                                    <span className={`text-xs font-bold truncate max-w-[180px] ${isSelected ? 'text-white' : 'text-zinc-200'}`}>
                                                        {model.display_name}
                                                    </span>
                                                    <span className="text-[10px] font-mono text-zinc-500 mt-0.5">
                                                        {formatUnitPrice(activeCategory, unitPrice)} · {model.provider}
                                                    </span>
                                                </div>
                                                <CheckCircle2
                                                    size={18}
                                                    className={`shrink-0 ${isSelected ? 'text-emerald-400' : 'text-zinc-700'}`}
                                                />
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </MotionDiv>
                </MotionDiv>
            )}
        </AnimPresence>
    );
}

export default memo(ModelSettingsSheet);
