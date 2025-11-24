import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { Polar } from "@polar-sh/sdk";
import { ProductData } from "@/api/types/api/polar/products/ProductData";
import {LRUCache} from "lru-cache";
import {processProducts} from "@/utils/polarUtils";

const isProd = process.env.NODE_ENV === 'production';
const polar = new Polar({
    server: isProd ? 'production' : 'sandbox',
    accessToken: isProd
        ? process.env.POLAR_API_KEY
        : process.env.POLAR_DEV_API_KEY,
});

const productCache = new LRUCache<string, ProductData[]>({
    max: 1,
    ttl: 1000 * 60 * 60, // 1시간
});

// 제품 처리 로직을 별도 함수로 분리
// function processProducts(items: Product[]): ProductData[] {
//     return items.filter((product: Product) => {
//         return product.recurringInterval === "month" || product.recurringInterval === "year";
//     }).map((product: Product) => {
//         const firstPrice = product.prices[0];
//         let price = 0;
//         let currency = "USD";
//
//         if (firstPrice) {
//             if ('priceAmount' in firstPrice) {
//                 price = firstPrice.priceAmount;
//             }
//             if ('priceCurrency' in firstPrice) {
//                 currency = firstPrice.priceCurrency;
//             }
//         }
//
//         const benefits: string[] = JSON.parse(product.metadata.benefits.toString());
//         const planData: { creditCount: number, planId: SubscriptionPlan } = JSON.parse(product.metadata.planData.toString());
//         const isPopular = product.metadata?.isPopular === true || product.metadata?.isPopular === "true";
//         const videosPerDay = typeof product.metadata?.videosPerDay === "number"
//             ? product.metadata.videosPerDay
//             : parseInt(product.metadata?.videosPerDay as string) || 0;
//
//         return {
//             id: product.id,
//             name: product.name,
//             price: price,
//             currency: currency,
//             interval: product.recurringInterval as "month" | "year",
//             description: product.description ?? "",
//             benefits: benefits,
//             planData: planData,
//             isPopular: isPopular,
//             videosPerDay: videosPerDay,
//         } satisfies ProductData;
//     });
// }

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
            console.log('✅ Cache HIT - Products served from cache');
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