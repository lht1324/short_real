import {memo, useEffect, useRef, useState, useMemo} from "react";
import {ChevronDown, Check, AlertCircle} from "lucide-react";
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
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedModel = useMemo(() => options.find(m => m.id === value), [options, value]);

    // 해상도 지원 여부 판단
    const hasResolution = (model: AIModelData, res: '720p' | '1080p' | '2160p') => {
        if (!model.ai_model_price_list) return false;
        const isVideo = category === 'image-to-video';
        const targetUnit = isVideo
            ? (res === '720p' ? 'video_720p' : res === '1080p' ? 'video_1080p' : 'video_2160p')
            : (res === '720p' ? 'image_720p' : res === '1080p' ? 'image_1080p' : 'image_2160p');
        return model.ai_model_price_list.some(p => p.unit === targetUnit);
    };

    // 정렬 로직 (현재 해상도 지원 모델을 최상단으로 정렬)
    const sortedOptions = useMemo(() => {
        return [...options].sort((a, b) => {
            const aSupport = hasResolution(a, globalResolution);
            const bSupport = hasResolution(b, globalResolution);
            if (aSupport && !bSupport) return -1;
            if (!aSupport && bSupport) return 1;
            return 0;
        });
    }, [options, globalResolution]);

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
        const matched = getMatchedModelPrice(selectedModel, globalResolution, category);
        const suffix = category === 'text-to-image' ? '/character' : (category === 'image-to-image' ? '/scene' : '/sec');
        if (matched.isFallback) {
            return `$${matched.price.toFixed(3)}${suffix} (${matched.matchedResolution})`;
        }
        return `$${matched.price.toFixed(3)}${suffix}`;
    }, [selectedModel, globalResolution, category]);

    return (
        <div ref={containerRef} className="space-y-1.5 relative flex-1">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-wider ml-0.5">{label}</label>
            
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
                <div className="absolute top-full left-0 w-full mt-1.5 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-50 max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1.5">
                    {sortedOptions.map(option => {
                        const isSelected = option.id === value;
                        const supportsRes = hasResolution(option, globalResolution);
                        
                        // 비디오 모델의 경우 글로벌 해상도 미지원 시 비활성화(disabled)
                        const isOptionDisabled = category === 'image-to-video' && !supportsRes;

                        // 옵션별 가격 요율 라벨
                        const matched = getMatchedModelPrice(option, globalResolution, category);
                        const suffix = category === 'text-to-image' ? '/character' : (category === 'image-to-image' ? '/scene' : '/sec');
                        const priceText = matched.isFallback
                            ? `$${matched.price.toFixed(3)}${suffix} (${matched.matchedResolution} fallback)`
                            : `$${matched.price.toFixed(3)}${suffix}`;

                        // 지원 해상도 목록
                        const resList: string[] = [];
                        if (option.ai_model_price_list) {
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
                                                        res === (globalResolution === '2160p' ? '4K' : globalResolution)
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
    const t2iModels = useMemo(() => aiModelList.filter(m => m.category === 'text-to-image'), [aiModelList]);
    const i2iModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-image'), [aiModelList]);
    const i2vModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-video'), [aiModelList]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <CustomModelSelect
                label="Character (T2I)"
                value={selectedReferenceId}
                options={t2iModels}
                category="text-to-image"
                globalResolution={globalResolution}
                onChange={onChangeReferenceId}
            />
            <CustomModelSelect
                label="Scene (I2I)"
                value={selectedI2iId}
                options={i2iModels}
                category="image-to-image"
                globalResolution={globalResolution}
                onChange={onChangeI2iId}
            />
            <CustomModelSelect
                label="Video (I2V)"
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
