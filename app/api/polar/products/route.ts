import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { Polar } from "@polar-sh/sdk";
import { Product } from "@polar-sh/sdk/models/components/product";
import { ProductData } from "@/api/types/api/polar/products/ProductData";

const polar = new Polar({
    accessToken: process.env.POLAR_API_KEY ?? "",
});

/**
 * GET /api/polar/products
 * Polar에서 현재 판매 중인 구독형 제품 목록을 조회합니다.
 * products:read 권한 필요
 */
export async function GET(request: NextRequest) {
    try {
        // Polar API 호출 - 활성 구독 제품만
        const result = await polar.products.list({
            isArchived: false,
            isRecurring: true,
        });

        const productList: ProductData[] = result.result.items
            .filter((product: Product) => {
                // month 또는 year 주기만 허용
                return product.recurringInterval === "month" || product.recurringInterval === "year";
            })
            .map((product: Product) => {
                // 첫 번째 가격 정보 가져오기
                const firstPrice = product.prices[0];

                // 가격과 통화 추출
                let price = 0;
                let currency = "USD";

                if (firstPrice) {
                    // amountType에 따라 가격 추출
                    if ('priceAmount' in firstPrice) {
                        price = firstPrice.priceAmount;
                    }
                    if ('priceCurrency' in firstPrice) {
                        currency = firstPrice.priceCurrency;
                    }
                }

                // metadata에서 benefits를 JSON 파싱하여 배열로 변환
                let benefits: string[] = [];
                if (product.metadata?.benefits) {
                    try {
                        const parsedBenefits = typeof product.metadata.benefits === "string"
                            ? JSON.parse(product.metadata.benefits)
                            : product.metadata.benefits;
                        benefits = Array.isArray(parsedBenefits) ? parsedBenefits : [];
                    } catch (error) {
                        console.error("Failed to parse benefits for product:", product.id, error);
                        benefits = [];
                    }
                }

                // metadata에서 isPopular와 videosPerDay 추출
                const isPopular = product.metadata?.isPopular === true || product.metadata?.isPopular === "true";
                const videosPerDay = typeof product.metadata?.videosPerDay === "number"
                    ? product.metadata.videosPerDay
                    : parseInt(product.metadata?.videosPerDay as string) || 0;

                return {
                    id: product.id,
                    name: product.name,
                    price: price,
                    currency: currency,
                    interval: product.recurringInterval as "month" | "year",
                    description: product.description ?? "",
                    benefits: benefits,
                    isPopular: isPopular,
                    videosPerDay: videosPerDay,
                } satisfies ProductData;
            });

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