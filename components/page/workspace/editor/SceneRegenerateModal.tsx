'use client'

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { X, ChevronDown, Check, Coins, Film } from "lucide-react";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { getMatchedModelPrice } from "@/lib/utils/costCalculator";

export enum RegenerateMode {
    IMAGE = 'image',
    VIDEO = 'video',
}

interface SceneRegenerateModalProps {
    isOpen: boolean;
    mode: RegenerateMode;
    sceneNumber: number;
    sceneDuration: number;
    aiModelList: AIModelData[];
    globalResolution: '720p' | '1080p' | '2160p';
    defaultModelId: string | null;
    defaultVideoModelId?: string | null;
    onClose: () => void;
    onConfirmRegenerate: (payload: {
        mode: RegenerateMode;
        sceneNumber: number;
        selectedModelId: string;
        estimatedCost: number;
        isAlsoRegenerateVideo?: boolean;
    }) => void;
}

function SceneRegenerateModal({
    isOpen,
    mode,
    sceneNumber,
    sceneDuration,
    aiModelList,
    globalResolution,
    defaultModelId,
    defaultVideoModelId,
    onClose,
    onConfirmRegenerate,
}: SceneRegenerateModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const [currentModelId, setCurrentModelId] = useState<string | null>(defaultModelId);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    
    // 이미지 재생성 시 "비디오 연쇄 재생성" 체크박스 상태
    const [isAlsoRegenerateVideo, setIsAlsoRegenerateVideo] = useState(false);

    // 모달이 열리거나 defaultModelId가 변경될 때 내부 선택 상태 즉시 동기화
    useEffect(() => {
        if (isOpen) {
            setCurrentModelId(defaultModelId);
            setIsDropdownOpen(false);
            setIsAlsoRegenerateVideo(false);
        }
    }, [defaultModelId, mode, isOpen]);

    // 바깥 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 모달 바깥 백드롭 클릭 시 닫기
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    // Mode별 호환 AI 모델 필터링
    const filteredModelList = useMemo(() => {
        if (mode === RegenerateMode.IMAGE) {
            const i2iModels = aiModelList.filter(m => m.category === 'image-to-image');
            return i2iModels.length > 0 ? i2iModels : aiModelList.filter(m => m.category === 'text-to-image');
        } else {
            return aiModelList.filter(m => m.category === 'image-to-video');
        }
    }, [aiModelList, mode]);

    // 현재 선택된 모델 객체 (기본값 매칭 보정)
    const activeSelectedModel = useMemo(() => {
        if (currentModelId) {
            const found = filteredModelList.find(m => m.id === currentModelId);
            if (found) return found;
        }
        return filteredModelList[0] ?? null;
    }, [filteredModelList, currentModelId]);

    const activeCategory = useMemo(() => {
        return mode === RegenerateMode.IMAGE ? 'image-to-image' : 'image-to-video';
    }, [mode]);

    // 이미지 단건 요율 계산
    const matchedPriceInfo = useMemo(() => {
        if (!activeSelectedModel) return null;
        return getMatchedModelPrice(activeSelectedModel, globalResolution, activeCategory);
    }, [activeSelectedModel, globalResolution, activeCategory]);

    // 연쇄 비디오 재생성용 모델 및 단가 계산
    const chainedVideoModelInfo = useMemo(() => {
        if (mode !== RegenerateMode.IMAGE) return null;
        const videoModels = aiModelList.filter(m => m.category === 'image-to-video');
        const videoModel = videoModels.find(m => m.id === defaultVideoModelId) ?? videoModels[0];
        if (!videoModel) return null;
        
        const priceInfo = getMatchedModelPrice(videoModel, globalResolution, 'image-to-video');
        const safeSec = Math.ceil(sceneDuration > 0 ? sceneDuration : 4);
        const totalPrice = priceInfo.price * safeSec;

        return {
            modelName: videoModel.display_name,
            unitPrice: priceInfo.price,
            safeSec,
            totalPrice,
        };
    }, [mode, aiModelList, defaultVideoModelId, globalResolution, sceneDuration]);

    // 최종 예상 가격 산출
    const estimatedCost = useMemo(() => {
        if (!matchedPriceInfo) return 0;
        const unitPrice = matchedPriceInfo.price;

        if (mode === RegenerateMode.IMAGE) {
            const baseImageCost = unitPrice;
            const chainedCost = (isAlsoRegenerateVideo && chainedVideoModelInfo) ? chainedVideoModelInfo.totalPrice : 0;
            return parseFloat((baseImageCost + chainedCost).toFixed(4));
        } else {
            const safeSec = Math.ceil(sceneDuration > 0 ? sceneDuration : 4);
            const total = unitPrice * safeSec;
            return parseFloat(total.toFixed(4));
        }
    }, [matchedPriceInfo, mode, sceneDuration, isAlsoRegenerateVideo, chainedVideoModelInfo]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-200"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="w-full max-w-lg bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col relative overflow-visible"
            >
                {/* Header - Design Taste Strict Typography Standard */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-white/5 bg-zinc-950/80">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-100 leading-snug">
                            {mode === RegenerateMode.IMAGE
                                ? `Regenerate Scene #${sceneNumber} Image`
                                : `Regenerate Scene #${sceneNumber} Video`}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1 font-medium">
                            {mode === RegenerateMode.IMAGE
                                ? 'Select an Image-to-Image model for single scene regeneration.'
                                : 'Select an Image-to-Video model for motion regeneration.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body Content - High Contrast Layout */}
                <div className="p-7 space-y-6">
                    {/* Model Dropdown Field */}
                    <div className="space-y-2.5 relative" ref={dropdownRef}>
                        <label className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-300 block">
                            AI Engine Model
                        </label>

                        {/* Dropdown Trigger Button */}
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full bg-black/70 border border-white/10 rounded-xl px-4.5 py-3.5 text-left text-sm text-zinc-200 flex items-center justify-between hover:bg-black/90 hover:border-white/20 focus:outline-none focus:border-zinc-500 transition-all"
                        >
                            <div className="flex flex-col min-w-0 pr-3">
                                <span className="font-semibold text-zinc-100 text-sm truncate">
                                    {activeSelectedModel?.display_name || "Select AI Model"}
                                </span>
                                {matchedPriceInfo && (
                                    <span className="text-xs text-zinc-400 font-mono mt-1">
                                        Rate: ${matchedPriceInfo.price}{mode === RegenerateMode.IMAGE ? ' / scene' : ' / sec'}
                                    </span>
                                )}
                            </div>
                            <ChevronDown size={18} className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Model Dropdown Menu (High Z-Index & Clean Overflow) */}
                        {isDropdownOpen && (
                            <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[200] max-h-64 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1">
                                {filteredModelList.map((model) => {
                                    const isSelected = model.id === (activeSelectedModel?.id ?? currentModelId);
                                    const priceObj = getMatchedModelPrice(model, globalResolution, activeCategory);
                                    return (
                                        <button
                                            key={model.id}
                                            type="button"
                                            onClick={() => {
                                                if (model.id) setCurrentModelId(model.id);
                                                setIsDropdownOpen(false);
                                            }}
                                            className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                                                isSelected ? "bg-zinc-800" : "hover:bg-zinc-800/50"
                                            }`}
                                        >
                                            <div className="flex flex-col min-w-0 pr-2">
                                                <span className={`text-sm font-semibold truncate ${isSelected ? "text-white" : "text-zinc-200"}`}>
                                                    {model.display_name}
                                                </span>
                                                <span className="text-xs text-zinc-400 font-mono mt-0.5">
                                                    ${priceObj.price}{mode === RegenerateMode.IMAGE ? ' / scene' : ' / sec'}
                                                </span>
                                            </div>
                                            {isSelected && <Check size={16} className="text-white flex-shrink-0 ml-2" />}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* 이미지 모달 전용: 연쇄 비디오 재생성 옵션 체크박스 */}
                    {mode === RegenerateMode.IMAGE && (
                        <div
                            onClick={() => setIsAlsoRegenerateVideo(!isAlsoRegenerateVideo)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between select-none ${
                                isAlsoRegenerateVideo
                                    ? "bg-zinc-800/80 border-white/20 text-white"
                                    : "bg-black/40 border-white/5 text-zinc-400 hover:bg-black/60 hover:text-zinc-200"
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                                    isAlsoRegenerateVideo ? "bg-white border-white text-black" : "border-zinc-600 bg-transparent"
                                }`}>
                                    {isAlsoRegenerateVideo && <Check size={14} strokeWidth={3} />}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                                        <Film size={15} className="text-zinc-400" />
                                        Also regenerate video with new image
                                    </span>
                                    <span className="text-xs text-zinc-400 font-mono mt-0.5 font-medium">
                                        Automatically triggers video motion generation right after image completion.
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Central Receipt / Cost Summary Card - High Contrast Strict Type Scale */}
                    <div className="bg-zinc-950/90 border border-white/10 rounded-xl p-5 shadow-inner flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 text-zinc-300 text-xs font-mono uppercase tracking-wider font-semibold">
                                    <Coins size={15} className="text-zinc-300" />
                                    <span>Estimated Deduction</span>
                                </div>
                                <div className="text-3xl font-extrabold font-mono text-zinc-100 tracking-tight mt-0.5">
                                    ${estimatedCost.toFixed(4)}
                                </div>
                            </div>

                            <div className="text-right flex flex-col items-end">
                                <span className="text-xs text-zinc-300 font-mono font-medium">
                                    {mode === RegenerateMode.IMAGE
                                        ? (isAlsoRegenerateVideo ? 'Image + Video Chained' : 'Single Scene Image')
                                        : `~${Math.ceil(sceneDuration > 0 ? sceneDuration : 4)}s Video Motion`}
                                </span>
                                <span className="text-xs text-zinc-400 font-mono mt-0.5 font-medium">
                                    Charged on request
                                </span>
                            </div>
                        </div>

                        {/* 영수증 세부 내역서 (Itemized Breakdown) - 체크박스 켜졌을 때만 렌더링 */}
                        {mode === RegenerateMode.IMAGE && isAlsoRegenerateVideo && chainedVideoModelInfo && matchedPriceInfo && (
                            <div className="border-t border-white/10 pt-3.5 space-y-2">
                                <div className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold mb-2">
                                    Itemized Breakdown
                                </div>
                                
                                {/* 1번째 항목: 이미지 단가 */}
                                <div className="flex items-center justify-between text-sm font-mono">
                                    <span className="text-zinc-300 flex items-center gap-2 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                                        Scene Image ({activeSelectedModel?.display_name})
                                    </span>
                                    <span className="text-zinc-100 font-bold">
                                        ${matchedPriceInfo.price.toFixed(4)}
                                    </span>
                                </div>

                                {/* 2번째 항목: 연쇄 비디오 단가 */}
                                <div className="flex items-center justify-between text-sm font-mono pt-1">
                                    <span className="text-zinc-300 flex items-center gap-2 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                                        Video Motion ({chainedVideoModelInfo.modelName}, ~{chainedVideoModelInfo.safeSec}s)
                                    </span>
                                    <span className="text-zinc-100 font-bold">
                                        +${chainedVideoModelInfo.totalPrice.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Action Buttons with Explicit Price Confirmation */}
                <div className="flex items-center justify-between px-7 py-5 border-t border-white/5 bg-zinc-950/80">
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={() => {
                            onConfirmRegenerate({
                                mode,
                                sceneNumber,
                                selectedModelId: activeSelectedModel?.id ?? currentModelId ?? '',
                                estimatedCost,
                                isAlsoRegenerateVideo: mode === RegenerateMode.IMAGE ? isAlsoRegenerateVideo : false,
                            });
                        }}
                        className="bg-white hover:bg-zinc-200 text-black px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                        <span>Regenerate (${estimatedCost.toFixed(2)})</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default memo(SceneRegenerateModal);
