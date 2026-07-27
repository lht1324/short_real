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
        selectedI2IAIModelId?: string;
        selectedI2VAIModelId?: string;
        isAlsoRegenerateVideo?: boolean;
    }) => void;
}

type SortOption = 'name' | 'price_asc' | 'price_desc';

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
    const imageDropdownRef = useRef<HTMLDivElement>(null);
    const videoDropdownRef = useRef<HTMLDivElement>(null);

    // 이미지 및 비디오 각각의 선택 상태 관리
    const [currentImageModelId, setCurrentImageModelId] = useState<string | null>(null);
    const [currentVideoModelId, setCurrentVideoModelId] = useState<string | null>(null);

    const [isImageDropdownOpen, setIsImageDropdownOpen] = useState(false);
    const [isVideoDropdownOpen, setIsVideoDropdownOpen] = useState(false);

    // 이미지 재생성 시 "비디오 연쇄 재생성" 체크박스 상태
    const [isAlsoRegenerateVideo, setIsAlsoRegenerateVideo] = useState(false);

    const [sortByImage, setSortByImage] = useState<SortOption>('name');
    const [sortByVideo, setSortByVideo] = useState<SortOption>('name');

    // 모달 오픈 시 초기값 설정
    useEffect(() => {
        if (isOpen) {
            if (mode === RegenerateMode.IMAGE) {
                setCurrentImageModelId(defaultModelId);
                setCurrentVideoModelId(defaultVideoModelId ?? null);
            } else {
                setCurrentImageModelId(null);
                setCurrentVideoModelId(defaultModelId);
            }
            setIsImageDropdownOpen(false);
            setIsVideoDropdownOpen(false);
            setIsAlsoRegenerateVideo(false);
        }
    }, [defaultModelId, defaultVideoModelId, mode, isOpen]);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (imageDropdownRef.current && !imageDropdownRef.current.contains(event.target as Node)) {
                setIsImageDropdownOpen(false);
            }
            if (videoDropdownRef.current && !videoDropdownRef.current.contains(event.target as Node)) {
                setIsVideoDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // 모달 백드롭 클릭 처리
    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
            onClose();
        }
    };

    // 1. 호환 이미지 모델 목록
    const filteredImageModelList = useMemo(() => {
        const i2iModels = aiModelList.filter(m => m.category === 'image-to-image');
        const categoryFiltered = i2iModels.length > 0 ? i2iModels : aiModelList.filter(m => m.category === 'text-to-image');
        const priceUnit = globalResolution === '720p' ? 'image_720p' : globalResolution === '1080p' ? 'image_1080p' : 'image_2160p';

        const resFiltered = categoryFiltered.filter(model =>
            model.ai_model_price_list?.some(p => p.unit === priceUnit)
        );
        const listToUse = resFiltered.length > 0 ? resFiltered : categoryFiltered;

        return [...listToUse].sort((a, b) => {
            if (sortByImage === 'name') {
                return a.display_name.localeCompare(b.display_name);
            }
            const priceA = getMatchedModelPrice(a, globalResolution, 'image-to-image').price;
            const priceB = getMatchedModelPrice(b, globalResolution, 'image-to-image').price;
            return sortByImage === 'price_asc' ? priceA - priceB : priceB - priceA;
        });
    }, [aiModelList, globalResolution, sortByImage]);

    // 2. 호환 비디오 모델 목록
    const filteredVideoModelList = useMemo(() => {
        const categoryFiltered = aiModelList.filter(m => m.category === 'image-to-video');
        const priceUnit = globalResolution === '720p' ? 'video_720p' : globalResolution === '1080p' ? 'video_1080p' : 'video_2160p';

        const resFiltered = categoryFiltered.filter(model =>
            model.ai_model_price_list?.some(p => p.unit === priceUnit)
        );
        const listToUse = resFiltered.length > 0 ? resFiltered : categoryFiltered;

        return [...listToUse].sort((a, b) => {
            if (sortByVideo === 'name') {
                return a.display_name.localeCompare(b.display_name);
            }
            const priceA = getMatchedModelPrice(a, globalResolution, 'image-to-video').price;
            const priceB = getMatchedModelPrice(b, globalResolution, 'image-to-video').price;
            return sortByVideo === 'price_asc' ? priceA - priceB : priceB - priceA;
        });
    }, [aiModelList, globalResolution, sortByVideo]);

    // 선택된 이미지 모델 객체
    const activeSelectedImageModel = useMemo(() => {
        if (currentImageModelId) {
            const found = filteredImageModelList.find(m => m.id === currentImageModelId);
            if (found) return found;
        }
        return filteredImageModelList[0] ?? null;
    }, [filteredImageModelList, currentImageModelId]);

    // 선택된 비디오 모델 객체
    const activeSelectedVideoModel = useMemo(() => {
        if (currentVideoModelId) {
            const found = filteredVideoModelList.find(m => m.id === currentVideoModelId);
            if (found) return found;
        }
        return filteredVideoModelList[0] ?? null;
    }, [filteredVideoModelList, currentVideoModelId]);

    // 이미지 단가 정보
    const imagePriceInfo = useMemo(() => {
        if (!activeSelectedImageModel) return null;
        return getMatchedModelPrice(activeSelectedImageModel, globalResolution, 'image-to-image');
    }, [activeSelectedImageModel, globalResolution]);

    // 비디오 단가 정보
    const videoPriceInfo = useMemo(() => {
        if (!activeSelectedVideoModel) return null;
        const priceInfo = getMatchedModelPrice(activeSelectedVideoModel, globalResolution, 'image-to-video');
        const safeSec = Math.ceil(sceneDuration > 0 ? sceneDuration : 4);
        const totalPrice = priceInfo.price * safeSec;

        return {
            modelName: activeSelectedVideoModel.display_name,
            unitPrice: priceInfo.price,
            safeSec,
            totalPrice,
        };
    }, [activeSelectedVideoModel, globalResolution, sceneDuration]);

    // 최종 예상 가격 산출
    const estimatedCost = useMemo(() => {
        if (mode === RegenerateMode.IMAGE) {
            const baseImageCost = imagePriceInfo?.price ?? 0;
            const chainedCost = (isAlsoRegenerateVideo && videoPriceInfo) ? videoPriceInfo.totalPrice : 0;
            return parseFloat((baseImageCost + chainedCost).toFixed(4));
        } else {
            return parseFloat((videoPriceInfo?.totalPrice ?? 0).toFixed(4));
        }
    }, [mode, imagePriceInfo, isAlsoRegenerateVideo, videoPriceInfo]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-start justify-center pt-[18vh] p-4 animate-in fade-in duration-200 overflow-y-auto"
            onClick={handleBackdropClick}
        >
            <div
                ref={modalRef}
                className="w-full max-w-lg bg-zinc-900/95 border border-white/10 rounded-2xl shadow-2xl flex flex-col relative overflow-visible mb-12"
            >
                {/* Header */}
                <div className="flex items-center justify-between px-7 py-5 border-b border-white/5 bg-zinc-950/80 rounded-t-2xl">
                    <div>
                        <h3 className="text-lg font-bold text-zinc-100 leading-snug">
                            {mode === RegenerateMode.IMAGE
                                ? `Regenerate Scene #${sceneNumber} Image`
                                : `Regenerate Scene #${sceneNumber} Video`}
                        </h3>
                        <p className="text-sm text-zinc-400 mt-1 font-medium">
                            {mode === RegenerateMode.IMAGE
                                ? 'Select an Image AI Model for scene regeneration.'
                                : 'Select a Video AI Model for motion regeneration.'}
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

                {/* Body Content */}
                <div className="p-7 space-y-6">
                    {/* 1. 이미지 모드일 때: 이미지 드롭다운 표출 */}
                    {mode === RegenerateMode.IMAGE && (
                        <div className="space-y-2.5 relative" ref={imageDropdownRef}>
                            <label className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-300 block">
                                Image AI Model (I2I)
                            </label>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsImageDropdownOpen(!isImageDropdownOpen);
                                    setIsVideoDropdownOpen(false);
                                }}
                                className="w-full bg-black/70 border border-white/10 rounded-xl px-4.5 py-3.5 text-left text-sm text-zinc-200 flex items-center justify-between hover:bg-black/90 hover:border-white/20 focus:outline-none focus:border-zinc-500 transition-all"
                            >
                                <div className="flex flex-col min-w-0 pr-3">
                                    <span className="font-semibold text-zinc-100 text-sm truncate">
                                        {activeSelectedImageModel?.display_name || "Select Image Model"}
                                    </span>
                                    {imagePriceInfo && (
                                        <span className="text-xs text-zinc-400 font-mono mt-1">
                                            Rate: ${imagePriceInfo.price} / scene
                                        </span>
                                    )}
                                </div>
                                <ChevronDown size={18} className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${isImageDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isImageDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[200] p-2 flex flex-col">
                                    <div className="px-2 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0 bg-zinc-900">
                                        <span>Sort by</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setSortByImage('name')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                                    sortByImage === 'name' ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-zinc-300'
                                                }`}
                                            >
                                                Name
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSortByImage('price_asc')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                                    sortByImage === 'price_asc' ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-zinc-300'
                                                }`}
                                            >
                                                Price ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSortByImage('price_desc')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                                    sortByImage === 'price_desc' ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-zinc-300'
                                                }`}
                                            >
                                                Price ↓
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                        {filteredImageModelList.map((model) => {
                                            const isSelected = model.id === (activeSelectedImageModel?.id ?? currentImageModelId);
                                            const priceObj = getMatchedModelPrice(model, globalResolution, 'image-to-image');
                                            return (
                                                <button
                                                    key={model.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (model.id) setCurrentImageModelId(model.id);
                                                        setIsImageDropdownOpen(false);
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
                                                            ${priceObj.price} / scene
                                                        </span>
                                                    </div>
                                                    {isSelected && <Check size={16} className="text-white flex-shrink-0 ml-2" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* 이미지 모드 전용: 연쇄 비디오 재생성 옵션 체크박스 */}
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

                    {/* 2. 비디오 드롭다운 표출 조건:
                        - 비디오 재생성 모드이거나 (mode === VIDEO)
                        - 이미지 모드에서 "비디오 연쇄 재생성" 체크박스가 선택된 경우 (mode === IMAGE && isAlsoRegenerateVideo)
                    */}
                    {(mode === RegenerateMode.VIDEO || (mode === RegenerateMode.IMAGE && isAlsoRegenerateVideo)) && (
                        <div className="space-y-2.5 relative animate-in fade-in slide-in-from-top-2 duration-200" ref={videoDropdownRef}>
                            <label className="text-xs font-mono uppercase tracking-wider font-semibold text-zinc-300 block flex items-center gap-1.5">
                                <Film size={14} className="text-zinc-400" />
                                Video AI Model (I2V)
                            </label>

                            <button
                                type="button"
                                onClick={() => {
                                    setIsVideoDropdownOpen(!isVideoDropdownOpen);
                                    setIsImageDropdownOpen(false);
                                }}
                                className="w-full bg-black/70 border border-white/10 rounded-xl px-4.5 py-3.5 text-left text-sm text-zinc-200 flex items-center justify-between hover:bg-black/90 hover:border-white/20 focus:outline-none focus:border-zinc-500 transition-all"
                            >
                                <div className="flex flex-col min-w-0 pr-3">
                                    <span className="font-semibold text-zinc-100 text-sm truncate">
                                        {activeSelectedVideoModel?.display_name || "Select Video Model"}
                                    </span>
                                    {videoPriceInfo && (
                                        <span className="text-xs text-zinc-400 font-mono mt-1">
                                            Rate: ${videoPriceInfo.unitPrice} / sec (~{videoPriceInfo.safeSec}s)
                                        </span>
                                    )}
                                </div>
                                <ChevronDown size={18} className={`text-zinc-400 flex-shrink-0 transition-transform duration-200 ${isVideoDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isVideoDropdownOpen && (
                                <div className="absolute left-0 right-0 top-full mt-2 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-[200] p-2 flex flex-col">
                                    <div className="px-2 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between text-xs text-zinc-400 font-mono shrink-0 bg-zinc-900">
                                        <span>Sort by</span>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setSortByVideo('name')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                                    sortByVideo === 'name' ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-zinc-300'
                                                }`}
                                            >
                                                Name
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSortByVideo('price_asc')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                                    sortByVideo === 'price_asc' ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-zinc-300'
                                                }`}
                                            >
                                                Price ↑
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setSortByVideo('price_desc')}
                                                className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                                    sortByVideo === 'price_desc' ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-zinc-300'
                                                }`}
                                            >
                                                Price ↓
                                            </button>
                                        </div>
                                    </div>

                                    <div className="max-h-52 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                                        {filteredVideoModelList.map((model) => {
                                            const isSelected = model.id === (activeSelectedVideoModel?.id ?? currentVideoModelId);
                                            const priceObj = getMatchedModelPrice(model, globalResolution, 'image-to-video');
                                            return (
                                                <button
                                                    key={model.id}
                                                    type="button"
                                                    onClick={() => {
                                                        if (model.id) setCurrentVideoModelId(model.id);
                                                        setIsVideoDropdownOpen(false);
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
                                                            ${priceObj.price} / sec
                                                        </span>
                                                    </div>
                                                    {isSelected && <Check size={16} className="text-white flex-shrink-0 ml-2" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Central Receipt / Cost Summary Card */}
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

                        {/* 영수증 세부 내역서 */}
                        {mode === RegenerateMode.IMAGE && isAlsoRegenerateVideo && videoPriceInfo && imagePriceInfo && (
                            <div className="border-t border-white/10 pt-3.5 space-y-2">
                                <div className="text-xs font-mono uppercase tracking-wider text-zinc-300 font-semibold mb-2">
                                    Itemized Breakdown
                                </div>
                                
                                <div className="flex items-center justify-between text-sm font-mono">
                                    <span className="text-zinc-300 flex items-center gap-2 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                                        Scene Image ({activeSelectedImageModel?.display_name})
                                    </span>
                                    <span className="text-zinc-100 font-bold">
                                        ${imagePriceInfo.price.toFixed(4)}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between text-sm font-mono pt-1">
                                    <span className="text-zinc-300 flex items-center gap-2 font-medium">
                                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                                        Video Motion ({videoPriceInfo.modelName}, ~{videoPriceInfo.safeSec}s)
                                    </span>
                                    <span className="text-zinc-100 font-bold">
                                        +${videoPriceInfo.totalPrice.toFixed(4)}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-7 py-5 border-t border-white/5 bg-zinc-950/80 rounded-b-2xl">
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
                            const isImageMode = mode === RegenerateMode.IMAGE;
                            const isChainedVideo = isImageMode && isAlsoRegenerateVideo;

                            const selectedI2IId = isImageMode
                                ? (activeSelectedImageModel?.id ?? currentImageModelId ?? undefined)
                                : undefined;

                            const selectedI2VId = isImageMode
                                ? (isChainedVideo ? (activeSelectedVideoModel?.id ?? currentVideoModelId ?? undefined) : undefined)
                                : (activeSelectedVideoModel?.id ?? currentVideoModelId ?? undefined);

                            onConfirmRegenerate({
                                mode,
                                sceneNumber,
                                selectedI2IAIModelId: selectedI2IId,
                                selectedI2VAIModelId: selectedI2VId,
                                isAlsoRegenerateVideo: isChainedVideo,
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
