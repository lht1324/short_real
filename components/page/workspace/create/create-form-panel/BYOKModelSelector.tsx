import {memo, useMemo} from "react";
import {Bot} from "lucide-react";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

interface BYOKModelSelectorProps {
    aiModelList: AIModelData[];
    selectedReferenceId: string | null;
    selectedI2iId: string | null;
    selectedI2vId: string | null;
    onChangeReferenceId: (id: string) => void;
    onChangeI2iId: (id: string) => void;
    onChangeI2vId: (id: string) => void;
}

function BYOKModelSelector({
    aiModelList,
    selectedReferenceId,
    selectedI2iId,
    selectedI2vId,
    onChangeReferenceId,
    onChangeI2iId,
    onChangeI2vId,
}: BYOKModelSelectorProps) {
    const t2iModels = useMemo(() => aiModelList.filter(m => m.category === 'text-to-image'), [aiModelList]);
    const i2iModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-image'), [aiModelList]);
    const i2vModels = useMemo(() => aiModelList.filter(m => m.category === 'image-to-video'), [aiModelList]);

    return (
        <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-base font-medium text-zinc-200">
                <Bot size={18} className="text-zinc-400" />
                <span>Visual AI Models (BYOK)</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Character (T2I)</label>
                    <select 
                        value={selectedReferenceId || ''} 
                        onChange={(e) => onChangeReferenceId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                    >
                        {t2iModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Scene (I2I)</label>
                    <select 
                        value={selectedI2iId || ''} 
                        onChange={(e) => onChangeI2iId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                    >
                        {i2iModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                        ))}
                    </select>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider ml-0.5">Video (I2V)</label>
                    <select 
                        value={selectedI2vId || ''} 
                        onChange={(e) => onChangeI2vId(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2.5 text-[13px] text-zinc-200 focus:outline-none focus:border-zinc-500 appearance-none"
                    >
                        {i2vModels.map(m => (
                            <option key={m.id} value={m.id} className="bg-zinc-900">{m.display_name}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );
}

export default memo(BYOKModelSelector);
