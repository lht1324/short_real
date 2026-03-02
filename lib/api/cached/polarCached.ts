import { unstable_cache } from "next/cache";
import { PolarClient } from "@/lib/PolarClient";
import { processProducts } from "@/utils/polarUtils";
import { ProductData } from "@/lib/api/types/api/polar/products/ProductData";

/**
 * Polar에서 판매 중인 제품 목록을 조회하는 내부 함수 (캐싱 대상)
 */
export const getCachedPolarProducts = unstable_cache(
    async (): Promise<ProductData[]> => {
        console.log('❌ Cache MISS - Fetching products from Polar API');
        const polar = new PolarClient().getClient();
        
        const result = await polar.products.list({
            isArchived: false,
            isRecurring: true,
        });

        return processProducts(result.result.items);
    },
    ['polar-products'],
    { 
        revalidate: 60 * 60, // 1시간 캐시
        tags: ['polar-products'] 
    }
);
