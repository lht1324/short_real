import { AIModelData } from "@/lib/api/types/supabase/AIModelData";

export type ModelCategory = 'text-to-image' | 'image-to-image' | 'image-to-video';

export interface ProductionPackage {
    id: string;
    name: string;
    durationSec: number;
    scenes: number;
    characters: number;
    badge?: string;
    description: string;
}

export const PACKAGES: ProductionPackage[] = [
    {
        id: "short",
        name: "Short-form Reel",
        durationSec: 30,
        scenes: 6,
        characters: 3,
        badge: "MOST POPULAR",
        description: "Perfect for Youtube Shorts, and TikTok."
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

// 데스크톱 CostCalculator와 동일한 기본 모델 id (첫 진입 시 자동 계산 결과 유지)
export const DEFAULT_T2I_ID = 'd59b7307-ab54-4efd-82f5-62649c2976cc';
export const DEFAULT_I2I_ID = '918afd0a-cc7d-41dc-ad42-914c224ef04b';
export const DEFAULT_I2V_ID = 'b5382c55-f9bb-45e9-bfcf-7b98224ae81c';

export const MODEL_CATEGORY_TABS: { category: ModelCategory; label: string }[] = [
    { category: 'text-to-image', label: 'Character' },
    { category: 'image-to-image', label: 'Scene' },
    { category: 'image-to-video', label: 'Video' },
];

export function getModelId(model: AIModelData | undefined): string {
    return (model?.id || model?.endpoint_id || "");
}
