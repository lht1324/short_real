import {memo, useEffect, useRef, useState, useMemo} from "react";
import {ChevronDown, Check, AlertCircle, Info} from "lucide-react";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {getMatchedModelPrice} from "@/lib/utils/costCalculator";

interface CustomModelSelectProps {
    label: string;
    value: string | null;
    options: AIModelData[];
    category: 'text-to-image' | 'image-to-image' | 'image-to-video';
    globalResolution: '720p' | '1080p' | '2160p';
    onChange: (id: string) => void;
}

function CustomModelSelect({
    label,
    value,
    options,
    category,
    globalResolution,
    onChange,
}: CustomModelSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [sortBy, setSortBy] = useState<'price' | 'name'>('price');
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedModel = useMemo(() => options.find(m => m.id === value), [options, value]);

    const localResolution = category === 'text-to-image' ? '720p' : globalResolution;

    // 해상도 지원 여부 판단
    const hasResolution = (model: AIModelData, res: '720p' | '1080p' | '2160p') => {
        if (!model.ai_model_price_list) return false;
        const isVideo = category === 'image-to-video';
        const targetUnit = isVideo
            ? (res === '720p' ? 'video_720p' : res === '1080p' ? 'video_1080p' : 'video_2160p')
            : (res === '720p' ? 'image_720p' : res === '1080p' ? 'image_1080p' : 'image_2160p');
        return model.ai_model_price_list.some(p => p.unit === targetUnit);
    };

    // 정렬 로직 (현재 해상도 지원 모델 최선행 + sortBy 기준 정렬)
    const sortedOptions = useMemo(() => {
        return [...options].sort((a, b) => {
            const aSupport = hasResolution(a, localResolution);
            const bSupport = hasResolution(b, localResolution);
            if (aSupport && !bSupport) return -1;
            if (!aSupport && bSupport) return 1;

            if (sortBy === 'price') {
                const aPrice = getMatchedModelPrice(a, localResolution, category).price;
                const bPrice = getMatchedModelPrice(b, localResolution, category).price;
                return aPrice - bPrice;
            } else {
                return a.display_name.localeCompare(b.display_name);
            }
        });
    }, [options, localResolution, sortBy, category]);

    // 바깥 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const selectedPriceLabel = useMemo(() => {
        if (!selectedModel) return '';
        const matched = getMatchedModelPrice(selectedModel, localResolution, category);
        const suffix = category === 'text-to-image' ? '/character' : (category === 'image-to-image' ? '/scene' : '/sec');
        if (matched.isFallback) {
            return `$${matched.price.toFixed(3)}${suffix} (${matched.matchedResolution})`;
        }
        return `$${matched.price.toFixed(3)}${suffix}`;
    }, [selectedModel, localResolution, category]);

    return (
        <div ref={containerRef} className="space-y-1.5 relative flex-1">
            <div className="flex items-center gap-1.5 ml-0.5">
                <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider">{label}</label>
                {category === 'text-to-image' && (
                    <div className="relative group flex items-center">
                        <Info size={14} className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-help" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 p-2.5 bg-zinc-900 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity text-left pointer-events-none z-50">
                            <p className="text-xs text-zinc-300 leading-relaxed font-normal normal-case tracking-normal">
                                Character sheets are generated at 720p as it provides sufficient visual reference for video generation, preventing unnecessary extra costs.
                            </p>
                        </div>
                    </div>
                )}
            </div>
            
            {/* Dropdown Toggle Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-left text-base text-zinc-200 flex items-center justify-between hover:bg-black/60 focus:outline-none focus:border-zinc-500 transition-colors"
            >
                <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-semibold text-zinc-100 text-base truncate">{selectedModel?.display_name || "Select Model"}</span>
                    {selectedModel && (
                        <span className="text-sm text-zinc-300 font-mono mt-0.5">{selectedPriceLabel}</span>
                    )}
                </div>
                <ChevronDown size={16} className="text-zinc-500 flex-shrink-0" />
            </button>

            {/* Dropdown Options Popup */}
            {isOpen && (
                <div className="absolute top-full left-0 w-full mt-1.5 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar p-2 flex flex-col gap-1.5">
                    {/* Sort Controller Header */}
                    <div className="flex items-center justify-between px-3.5 py-2 border-b border-white/5 text-[13px] text-zinc-500 font-medium flex-shrink-0 select-none">
                        <span>Sort models</span>
                        <div className="flex gap-4">
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSortBy('price');
                                }} 
                                className={`transition-colors py-0.5 relative text-[13px] ${
                                    sortBy === 'price' 
                                        ? 'text-zinc-200 font-bold' 
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Price
                                {sortBy === 'price' && (
                                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-zinc-200" />
                                )}
                            </button>
                            <button 
                                type="button" 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSortBy('name');
                                }} 
                                className={`transition-colors py-0.5 relative text-[13px] ${
                                    sortBy === 'name' 
                                        ? 'text-zinc-200 font-bold' 
                                        : 'text-zinc-400 hover:text-zinc-200'
                                }`}
                            >
                                Name
                                {sortBy === 'name' && (
                                    <span className="absolute bottom-0 left-0 w-full h-[1.5px] bg-zinc-200" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar">
                        {sortedOptions.map(option => {
                            const isSelected = option.id === value;
                        const supportsRes = hasResolution(option, localResolution);
                        
                        // 비디오 모델의 경우 글로벌 해상도 미지원 시 비활성화(disabled)
                        const isOptionDisabled = category === 'image-to-video' && !supportsRes;

                        // 옵션별 가격 요율 라벨
                        const matched = getMatchedModelPrice(option, localResolution, category);
                        const suffix = category === 'text-to-image' ? '/character' : (category === 'image-to-image' ? '/scene' : '/sec');
                        const priceText = matched.isFallback
                            ? `$${matched.price.toFixed(3)}${suffix} (${matched.matchedResolution} fallback)`
                            : `$${matched.price.toFixed(3)}${suffix}`;

                        // 지원 해상도 목록
                        const resList: string[] = [];
                        if (category === 'text-to-image') {
                            resList.push('720p');
                        } else if (option.ai_model_price_list) {
                            option.ai_model_price_list.forEach(p => {
                                let name = '';
                                if (p.unit.includes('720p')) name = '720p';
                                else if (p.unit.includes('1080p')) name = '1080p';
                                else if (p.unit.includes('2160p')) name = '4K';
                                if (name && !resList.includes(name)) resList.push(name);
                            });
                        }
                        const sortedRes = resList.sort((a, b) => {
                            const order = { '720p': 1, '1080p': 2, '4K': 3 };
                            return order[a as keyof typeof order] - order[b as keyof typeof order];
                        });

                        return (
                            <button
                                key={option.id}
                                type="button"
                                disabled={isOptionDisabled}
                                onClick={() => {
                                    onChange(option.id!);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg transition-colors flex items-center justify-between ${
                                    isSelected 
                                        ? "bg-zinc-800" 
                                        : "hover:bg-zinc-800/50"
                                } ${
                                    isOptionDisabled 
                                        ? "opacity-35 cursor-not-allowed bg-zinc-950/20" 
                                        : ""
                                }`}
                            >
                                <div className="flex flex-col min-w-0 pr-3 flex-1">
                                    {/* 1층: 이름 */}
                                    <div className="flex items-center">
                                        <span className={`text-base font-semibold truncate ${isSelected ? "text-white" : "text-zinc-200"}`}>
                                            {option.display_name}
                                        </span>
                                    </div>
                                    {/* 2층: 요율 */}
                                    {!isOptionDisabled && (
                                        <div className="mt-0.5">
                                            <span className="text-sm text-zinc-300 font-mono">{priceText}</span>
                                        </div>
                                    )}
                                    {/* 3층: 해상도 뱃지 & 제공처 */}
                                    <div className="flex items-center justify-between mt-2.5 gap-2">
                                        <div className="flex items-center gap-1.5">
                                            {sortedRes.map(res => (
                                                <span 
                                                    key={res} 
                                                    className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${
                                                        res === (localResolution === '2160p' ? '4K' : localResolution)
                                                            ? "bg-white/10 border-white/20 text-white"
                                                            : "border-white/10 text-zinc-400"
                                                    }`}
                                                >
                                                    {res}
                                                </span>
                                            ))}
                                            {isOptionDisabled && (
                                                <span className="text-xs text-amber-500/80 font-medium flex items-center gap-0.5 ml-1">
                                                    <AlertCircle size={12} />
                                                    <span>Incompatible</span>
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">{option.provider}</span>
                                    </div>
                                </div>
                                {isSelected && <Check size={14} className="text-white flex-shrink-0 ml-2" />}
                            </button>
                        );
                    })}
                    </div>
                </div>
            )}
        </div>
    );
}

interface BYOKModelSelectorProps {
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    globalResolution: '720p' | '1080p' | '2160p';
    onChangeReferenceId: (id: string) => void;
    onChangeI2iId: (id: string) => void;
    onChangeI2vId: (id: string) => void;
}

function BYOKModelSelector({
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    globalResolution,
    onChangeReferenceId,
    onChangeI2iId,
    onChangeI2vId,
}: BYOKModelSelectorProps) {
    const t2iModels = useMemo(() => {
        return aiModelList
            .filter(m => m.category === 'text-to-image')
            .filter(m => {
                if (!m.ai_model_price_list) return false;
                return m.ai_model_price_list.some(p => p.unit === 'image_720p');
            });
    }, [aiModelList]);
    const i2iModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-image'), [aiModelList]);
    const i2vModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-video'), [aiModelList]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CustomModelSelect
                label="Character"
                value={selectedReferenceId}
                options={t2iModels}
                category="text-to-image"
                globalResolution={globalResolution}
                onChange={onChangeReferenceId}
            />
            <CustomModelSelect
                label="Scene"
                value={selectedI2iId}
                options={i2iModels}
                category="image-to-image"
                globalResolution={globalResolution}
                onChange={onChangeI2iId}
            />
            <CustomModelSelect
                label="Video"
                value={selectedI2vId}
                options={i2vModels}
                category="image-to-video"
                globalResolution={globalResolution}
                onChange={onChangeI2vId}
            />
        </div>
    );
}

export default memo(BYOKModelSelector);
