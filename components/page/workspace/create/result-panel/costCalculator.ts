import { AIModelData, AIModelPriceUnit } from "@/lib/api/types/supabase/AIModelData";

export interface MatchedPriceResult {
    price: number;
    matchedResolution: '720p' | '1080p' | '2160p';
    isFallback: boolean;
}

function getPriceUnit(res: '720p' | '1080p' | '2160p', isVideo: boolean): AIModelPriceUnit {
    if (isVideo) {
        return res === '720p'
            ? AIModelPriceUnit.VIDEO_720P
            : res === '1080p'
                ? AIModelPriceUnit.VIDEO_1080P
                : AIModelPriceUnit.VIDEO_2160P;
    } else {
        return res === '720p'
            ? AIModelPriceUnit.IMAGE_720P
            : res === '1080p'
                ? AIModelPriceUnit.IMAGE_1080P
                : AIModelPriceUnit.IMAGE_2160P;
    }
}

/**
 * 특정 모델의 카테고리(T2I, I2I, I2V)와 글로벌 해상도에 부합하는 가장 적합한 단가를 산출합니다.
 * 만약 해당 해상도 단가가 없는 미스매치의 경우, 지원하는 최고 해상도 단가로 자동 매핑합니다.
 */
export function getMatchedModelPrice(
    model: AIModelData | undefined,
    globalResolution: '720p' | '1080p' | '2160p',
    category: 'text-to-image' | 'image-to-image' | 'image-to-video'
): MatchedPriceResult {
    if (!model || !model.ai_model_price_list || model.ai_model_price_list.length === 0) {
        return { price: 0, matchedResolution: '1080p', isFallback: false };
    }

    const priceList = model.ai_model_price_list;
    const isVideo = category === 'image-to-video';

    // 1. 글로벌 해상도 매칭 시도
    const targetUnit = getPriceUnit(globalResolution, isVideo);
    const targetPrice = priceList.find(p => p.unit === targetUnit);
    if (targetPrice) {
        return { price: targetPrice.price_per_unit, matchedResolution: globalResolution, isFallback: false };
    }

    // 2. 미스매치 시 차선책(최고 해상도) 검색 우선순위: 2160p -> 1080p -> 720p
    const resolutions: ('720p' | '1080p' | '2160p')[] = ['2160p', '1080p', '720p'];
    for (const res of resolutions) {
        const unit = getPriceUnit(res, isVideo);
        const priceObj = priceList.find(p => p.unit === unit);
        if (priceObj) {
            return { price: priceObj.price_per_unit, matchedResolution: res, isFallback: true };
        }
    }

    // 3. 그것도 없으면 첫 번째 가격 데이터 반환
    const firstPrice = priceList[0];
    let matchedRes: '720p' | '1080p' | '2160p' = '1080p';
    if (firstPrice.unit.includes('720p')) matchedRes = '720p';
    else if (firstPrice.unit.includes('2160p')) matchedRes = '2160p';

    return { price: firstPrice.price_per_unit, matchedResolution: matchedRes, isFallback: true };
}
