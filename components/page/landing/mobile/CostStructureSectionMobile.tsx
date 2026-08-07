'use client'

import { memo, useState, useMemo, useCallback, useEffect } from "react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { Calculator, CheckCircle2, Key, Sparkles, SlidersHorizontal, X, ChevronDown } from "lucide-react";
import { getMatchedModelPrice } from "@/lib/utils/costCalculator";
import { AnimPresence } from "@/components/public/framerMotion/AnimPresence";
import { MotionDiv } from "@/components/public/framerMotion/Motion";

export interface CostStructureSectionMobileProps {
    aiModelDataList: AIModelData[];
}

interface ProductionPackage {
    id: string;
    name: string;
    durationSec: number;
    scenes: number;
    characters: number;
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
        badge: "MOST POPULAR",
        description: "Perfect for Instagram Reels, Shorts, and TikTok ads."
    },
    {
        id: "mid",
        name: "Commercial Spot",
        durationSec: 60,
        scenes: 12,
        characters: 4,
        description: "Great for product launch teasers and brand stories."
    },
    {
        id: "long",
        name: "Short Film",
        durationSec: 120,
        scenes: 24,
        characters: 5,
        description: "Ideal for cinematic short narratives and music videos."
    }
];

type ModelCategory = 'text-to-image' | 'image-to-image' | 'image-to-video';

// 데스크톱 CostCalculator와 동일한 기본 모델 id (첫 진입 시 자동 계산 결과 유지)
const DEFAULT_T2I_ID = 'd59b7307-ab54-4efd-82f5-62649c2976cc';
const DEFAULT_I2I_ID = '918afd0a-cc7d-41dc-ad42-914c224ef04b';
const DEFAULT_I2V_ID = 'b5382c55-f9bb-45e9-bfcf-7b98224ae81c';

const MODEL_CATEGORY_TABS: { category: ModelCategory; label: string }[] = [
    { category: 'text-to-image', label: 'Character' },
    { category: 'image-to-image', label: 'Scene' },
    { category: 'image-to-video', label: 'Video' },
];

function getModelId(model: AIModelData | undefined): string {
    return (model?.id || model?.endpoint_id || "");
}

function CostStructureSectionMobile({ aiModelDataList }: CostStructureSectionMobileProps) {
    const [selectedPkgId, setSelectedPkgId] = useState<string>("short");
    const [resolution, setResolution] = useState<'720p' | '1080p'>('1080p');

    const [selectedT2iId, setSelectedT2iId] = useState<string>(DEFAULT_T2I_ID);
    const [selectedI2iId, setSelectedI2iId] = useState<string>(DEFAULT_I2I_ID);
    const [selectedI2vId, setSelectedI2vId] = useState<string>(DEFAULT_I2V_ID);

    const [isModelSheetOpen, setIsModelSheetOpen] = useState<boolean>(false);
    const [activeCategory, setActiveCategory] = useState<ModelCategory>('text-to-image');
    const [sortBy, setSortBy] = useState<'name' | 'price'>('name');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

    const activePkg = useMemo(
        () => PACKAGES.find(p => p.id === selectedPkgId) || PACKAGES[0],
        [selectedPkgId]
    );

    const t2iModels = useMemo(() => aiModelDataList.filter(m => m.category === 'text-to-image'), [aiModelDataList]);
    const i2iModels = useMemo(() => aiModelDataList.filter(m => m.category === 'image-to-image'), [aiModelDataList]);
    const i2vModels = useMemo(() => aiModelDataList.filter(m => m.category === 'image-to-video'), [aiModelDataList]);

    // 데이터 로드 실패/비어있음 대비: 첫 번째 모델 폴백
    const t2iModel = useMemo(
        () => t2iModels.find(m => getModelId(m) === selectedT2iId) || t2iModels[0],
        [t2iModels, selectedT2iId]
    );
    const i2iModel = useMemo(
        () => i2iModels.find(m => getModelId(m) === selectedI2iId) || i2iModels[0],
        [i2iModels, selectedI2iId]
    );
    const i2vModel = useMemo(
        () => i2vModels.find(m => getModelId(m) === selectedI2vId) || i2vModels[0],
        [i2vModels, selectedI2vId]
    );

    // 데스크톱 CostCalculator와 동일한 단가 로직 재사용
    const t2iPrice = useMemo(() => getMatchedModelPrice(t2iModel, resolution, 'text-to-image').price, [t2iModel, resolution]);
    const i2iPrice = useMemo(() => getMatchedModelPrice(i2iModel, resolution, 'image-to-image').price, [i2iModel, resolution]);
    const i2vPrice = useMemo(() => getMatchedModelPrice(i2vModel, resolution, 'image-to-video').price, [i2vModel, resolution]);

    const totalCost = useMemo(
        () => t2iPrice * activePkg.characters + i2iPrice * activePkg.scenes + i2vPrice * activePkg.durationSec,
        [t2iPrice, i2iPrice, i2vPrice, activePkg]
    );

    // 바텀시트 오픈 중 배경 스크롤 잠금
    useEffect(() => {
        document.body.style.overflow = isModelSheetOpen ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [isModelSheetOpen]);

    const onClickPkg = useCallback((id: string) => {
        setSelectedPkgId(id);
    }, []);

    const onClickOpenModelSheet = useCallback(() => {
        setIsModelSheetOpen(true);
    }, []);

    const onClickCloseModelSheet = useCallback(() => {
        setIsModelSheetOpen(false);
    }, []);

    const onClickSelectModel = useCallback((category: ModelCategory, modelId: string) => {
        if (category === 'text-to-image') setSelectedT2iId(modelId);
        else if (category === 'image-to-image') setSelectedI2iId(modelId);
        else setSelectedI2vId(modelId);
    }, []);

    // 정렬: Name/Price 토글, 같은 항목 재클릭 시 방향 반전
    const onClickSort = useCallback((by: 'name' | 'price') => {
        if (sortBy === by) {
            setSortDir(dir => (dir === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(by);
            setSortDir('asc');
        }
    }, [sortBy]);

    // 시트 내 활성 카테고리 모델 목록
    const activeCategoryModels = useMemo(() => {
        if (activeCategory === 'text-to-image') return t2iModels;
        if (activeCategory === 'image-to-image') return i2iModels;
        return i2vModels;
    }, [activeCategory, t2iModels, i2iModels, i2vModels]);

    // 정렬된 모델 목록 (가격은 현재 해상도 단가 기준, 데스크톱과 동일 로직)
    const sortedModels = useMemo(() => {
        const list = [...activeCategoryModels];
        if (sortBy === 'name') {
            list.sort((a, b) => a.display_name.localeCompare(b.display_name));
        } else {
            const priceOf = (m: AIModelData) => getMatchedModelPrice(m, resolution, activeCategory).price;
            list.sort((a, b) => priceOf(a) - priceOf(b));
        }
        if (sortDir === 'desc') list.reverse();
        return list;
    }, [activeCategoryModels, sortBy, sortDir, resolution, activeCategory]);

    // 시트 내 활성 카테고리의 현재 선택 모델
    const activeSelectedModel = useMemo(() => {
        if (activeCategory === 'text-to-image') return t2iModel;
        if (activeCategory === 'image-to-image') return i2iModel;
        return i2vModel;
    }, [activeCategory, t2iModel, i2iModel, i2vModel]);

    const formatUnitPrice = useCallback((category: ModelCategory, price: number) => {
        if (category === 'image-to-video') {
            return `$${price.toFixed(5)}/sec`;
        }
        return `$${price.toFixed(3)}/${category === 'text-to-image' ? 'person' : 'scene'}`;
    }, []);

    const isLoadingModels = aiModelDataList.length === 0;

    return (
        <section id="coststructure" className="relative py-12 px-4 overflow-hidden">
            <div className="relative z-10 max-w-sm mx-auto space-y-6">
                {/* Header */}
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-white tracking-tight mb-2 leading-tight">
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
                            const pkgCost = t2iPrice * pkg.characters + i2iPrice * pkg.scenes + i2vPrice * pkg.durationSec;
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
                                    <div className="text-sm font-bold font-mono mt-3">
                                        ${pkgCost.toFixed(2)}
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
                                                <span className="text-[10px] text-zinc-200 truncate">{t2iModel?.display_name || "-"}</span>
                                            </span>
                                            <span className="flex items-baseline gap-1.5 min-w-0">
                                                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0 w-10">Scene</span>
                                                <span className="text-[10px] text-zinc-200 truncate">{i2iModel?.display_name || "-"}</span>
                                            </span>
                                            <span className="flex items-baseline gap-1.5 min-w-0">
                                                <span className="text-[9px] font-mono font-bold text-zinc-500 uppercase tracking-wider shrink-0 w-10">Video</span>
                                                <span className="text-[10px] text-zinc-200 truncate">{i2vModel?.display_name || "-"}</span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <ChevronDown size={16} className="text-zinc-400 shrink-0 rotate-180" />
                        </button>
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

            {/* Model Settings Bottom Sheet */}
            <AnimPresence>
                {isModelSheetOpen && (
                    <MotionDiv
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center"
                        onClick={onClickCloseModelSheet}
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
                                    onClick={onClickCloseModelSheet}
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
                                                onClick={() => setActiveCategory(tab.category)}
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
                                    {sortedModels.length} models
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
                                {activeCategoryModels.length === 0 ? (
                                    <div className="py-8 text-center text-xs text-zinc-500">
                                        {isLoadingModels ? "Loading models..." : "No models available."}
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {sortedModels.map(model => {
                                            const modelId = getModelId(model);
                                            const isSelected = getModelId(activeSelectedModel) === modelId;
                                            const unitPrice = getMatchedModelPrice(model, resolution, activeCategory).price;
                                            return (
                                                <button
                                                    key={modelId}
                                                    onClick={() => onClickSelectModel(activeCategory, modelId)}
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
        </section>
    );
}

export default memo(CostStructureSectionMobile);
