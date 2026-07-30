import {memo, useMemo} from "react";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import CustomModelSelect from "@/components/public/byok-model-selector/CustomModelSelect";

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
