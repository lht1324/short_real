import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getCachedPolarProducts } from "@/lib/api/cached/polarCached";

/**
 * GET /api/polar/products
 * Polar에서 현재 판매 중인 구독형 제품 목록을 조회합니다.
 * products:read 권한 필요
 */
export async function GET(request: NextRequest) {
    try {
        const productList = await getCachedPolarProducts();
        
        console.log('✅ Cache HIT or Fresh Data - Products in /polar/products served');
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                productList: productList,
            },
            message: "Successfully fetched products."
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