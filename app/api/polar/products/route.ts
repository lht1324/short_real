import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { Polar } from "@polar-sh/sdk";
import { ProductData } from "@/api/types/api/polar/products/ProductData";
import {LRUCache} from "lru-cache";
import {processProducts} from "@/utils/polarUtils";

const isProd = process.env.NODE_ENV === 'production';
const polar = new Polar({
    server: isProd ? 'production' : 'sandbox',
    accessToken: process.env.POLAR_API_KEY,
});

const productCache = new LRUCache<string, ProductData[]>({
    max: 1,
    ttl: 1000 * 60 * 60, // 1시간
});

/**
 * GET /api/polar/products
 * Polar에서 현재 판매 중인 구독형 제품 목록을 조회합니다.
 * products:read 권한 필요
 */
export async function GET(request: NextRequest) {
    try {
        // Polar API 호출 - 활성 구독 제품만

        // 캐시 확인
        const cacheKey = 'products';
        const cached = productCache.get(cacheKey);

        if (cached) {
            console.log('✅ Cache HIT - Products in /polar/products served from cache');
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: {
                    productList: cached,
                },
                message: "Successfully fetched products from cache."
            });
        }

        console.log('❌ Cache MISS - Fetching from Polar API');

        const result = await polar.products.list({
            isArchived: false,
            isRecurring: true,
        });

        const productList = processProducts(result.result.items);

        // 캐시에 저장
        productCache.set(cacheKey, productList);
        console.log(`💾 Cached ${productList.length} products for 1 hour`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                productList: productList,
            },
            message: "Successfully fetched products from Polar."
        });
    } catch (error) {
        console.error("Error in GET /api/polar/products:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch products from Polar."
        });
    }
}