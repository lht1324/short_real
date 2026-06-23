import {memo, useCallback, useMemo} from "react";
import {Info} from "lucide-react";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

interface EstimatedCostCardProps {
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    expectedVideoSceneCount: number;
    expectedVideoTotalDuration: number;
    estimatedCharacterCount: number;
}

function EstimatedCostCard({
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    expectedVideoSceneCount,
    expectedVideoTotalDuration,
    estimatedCharacterCount,
}: EstimatedCostCardProps) {
    const t2iModels = useMemo(() => aiModelList.filter(m => m.category === 'text-to-image'), [aiModelList]);
    const i2iModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-image'), [aiModelList]);
    const i2vModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-video'), [aiModelList]);

    const getPrice = useCallback((models: AIModelData[], id?: string | null) => {
        if (!id) return 0;
        const model = models.find(m => m.id === id);
        if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) return 0;
        const price1080 = model.ai_model_price_list.find(p => p.unit.includes('1080p'));
        return price1080?.price_per_unit || model.ai_model_price_list[0].price_per_unit || 0;
    }, []);

    const estimatedCost = useMemo(() => {
        const t2iPrice = getPrice(t2iModels, selectedReferenceId);
        const i2iPrice = getPrice(i2iModels, selectedI2iId);
        const i2vPrice = getPrice(i2vModels, selectedI2vId);
        
        // Cost estimation based on dynamic storyboard scenes and duration
        const scenes = Math.max(1, expectedVideoSceneCount);
        const duration = Math.max(5, expectedVideoTotalDuration);

        const t2iCost = t2iPrice * estimatedCharacterCount;
        const i2iCost = i2iPrice * scenes;
        const i2vCost = i2vPrice * duration; // Assuming i2v is priced per sec
        
        return t2iCost + i2iCost + i2vCost;
    }, [getPrice, t2iModels, selectedReferenceId, i2iModels, selectedI2iId, i2vModels, selectedI2vId, expectedVideoSceneCount, expectedVideoTotalDuration, estimatedCharacterCount]);

    return (
        <div className="mb-6 rounded-xl border border-white/5 bg-zinc-900/40 p-5 transition-colors hover:bg-zinc-900/60 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 cursor-help">
                <Info size={14} className="text-zinc-500 hover:text-zinc-300 transition-colors" />
                <div className="absolute bottom-full right-0 mb-2 w-64 p-3 bg-zinc-800 border border-white/10 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity text-left z-10 pointer-events-none">
                    <p className="text-xs text-zinc-300 leading-relaxed">
                        This is the estimated direct cost billed to your connected provider accounts (e.g., fal.ai, Replicate) based on the current storyboard length ({expectedVideoSceneCount} scenes, {Math.ceil(expectedVideoTotalDuration)}s).
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-center justify-center space-y-1">
                <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Estimated BYOK Cost</span>
                <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-lg text-zinc-300 font-light">$</span>
                    <span className="text-3xl font-bold text-zinc-100 tracking-tight">{estimatedCost.toFixed(3)}</span>
                    <span className="text-lg text-zinc-300 font-light">~</span>
                </div>
                <p className="text-[11px] text-zinc-500 mt-1">
                    Billed directly to your AI providers.
                </p>
            </div>
        </div>
    );
}

export default memo(EstimatedCostCard);