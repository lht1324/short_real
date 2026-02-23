import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { Polar } from "@polar-sh/sdk";

const isProd = process.env.NODE_ENV === 'production';
const polar = new Polar({
    server: isProd ? 'production' : 'sandbox',
    accessToken: process.env.POLAR_API_KEY,
});

/**
 * POST /api/polar/checkouts
 * Polar 체크아웃 세션을 생성합니다.
 * checkouts:write 권한 필요
 */
export async function POST(request: NextRequest) {
    try {
        // Request body 파싱
        const body = await request.json();
        const {
            productId,
            customerEmail,
            customerName,
            userId
        } = body;

        // productId 필수 검증
        if (!productId || typeof productId !== "string") {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "productId is required and must be a string."
            });
        }

        // userId 필수 검증
        if (!userId || typeof userId !== "string") {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "userId is required and must be a string."
            });
        }

        // Polar API 호출 - 체크아웃 세션 생성
        // products 필드는 배열로 전달해야 함
        const result = await polar.checkouts.create({
            products: [productId],
            successUrl: `${process.env.BASE_URL}/workspace/dashboard`,
            customerEmail: customerEmail,
            customerName: customerName,
            metadata: {
                userId: userId,
            },
        });

        // 생성된 체크아웃 URL 반환
        return getNextBaseResponse({
            success: true,
            status: 201,
            data: {
                checkoutUrl: result.url,
            },
            message: "Checkout session created successfully."
        });

    } catch (error) {
        console.error("Error in POST /api/polar/checkouts:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create checkout session."
        });
    }
}
