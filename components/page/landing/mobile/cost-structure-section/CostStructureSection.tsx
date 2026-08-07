'use client'

import { memo, useState, useMemo, useCallback, useEffect } from "react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { Calculator, CheckCircle2, Key } from "lucide-react";
import { getMatchedModelPrice } from "@/lib/utils/costCalculator";
import PackageSummaryCard from "./PackageSummaryCard";
import ModelSettingsSheet from "./ModelSettingsSheet";
import { PACKAGES, DEFAULT_T2I_ID, DEFAULT_I2I_ID, DEFAULT_I2V_ID, ModelCategory, getModelId } from "./costStructureData";

export interface CostStructureSectionProps {
    aiModelDataList: AIModelData[];
}

function CostStructureSection({ aiModelDataList }: CostStructureSectionProps) {
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

                {/* Package Selection Cards */}
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

                <PackageSummaryCard
                    activePkg={activePkg}
                    totalCost={totalCost}
                    isLoadingModels={isLoadingModels}
                    modelNames={{
                        t2i: t2iModel?.display_name,
                        i2i: i2iModel?.display_name,
                        i2v: i2vModel?.display_name,
                    }}
                    onClickOpenModelSheet={onClickOpenModelSheet}
                />

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

            <ModelSettingsSheet
                isOpen={isModelSheetOpen}
                onClose={onClickCloseModelSheet}
                activeCategory={activeCategory}
                onSelectCategory={setActiveCategory}
                models={sortedModels}
                selectedModelId={getModelId(activeSelectedModel)}
                onSelectModel={(modelId) => onClickSelectModel(activeCategory, modelId)}
                sortBy={sortBy}
                sortDir={sortDir}
                onClickSort={onClickSort}
                resolution={resolution}
                isLoading={isLoadingModels}
            />
        </section>
    );
}

export default memo(CostStructureSection);
