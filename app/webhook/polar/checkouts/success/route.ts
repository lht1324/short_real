import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { PolarClient } from "@/lib/PolarClient";

/**
 * POST /webhook/polar/checkouts/success
 * Polar webhook - 체크아웃 성공 시 호출됨
 */
export async function POST(request: NextRequest) {
    try {
        const polar = new PolarClient().getClient();

        // Webhook payload 파싱
        const payload = await request.json();

        console.log("Polar webhook received:", payload);

        // Polar SDK로 products.list() 호출
        const productsResult = await polar.products.list({
            isArchived: false,
        });

        // payload에서 productId 추출
        const productId: string = payload.data?.product_id;

        if (!productId) {
            throw new Error("productId not found in webhook payload");
        }

        // productId로 Product 정보 찾기
        const product = productsResult.result.items.find(
            (p) => p.id === productId
        );

        if (!product || !product.metadata.planData) {
            throw new Error(`Product not found for productId: ${productId}`);
        }

        console.log("Found product:", product);

        console.log("productList: ", productsResult);

        // Product metadata에서 플랜 정보 추출
        const {
            creditCount,
            planId
        }: { creditCount: number, planId: SubscriptionPlan } = JSON.parse(product.metadata.planData as string);

        // payload에서 userId 추출
        const userId = payload.data?.metadata?.userId;

        if (!userId) {
            throw new Error("userId not found in webhook payload metadata");
        }

        // 유저 플랜 업데이트
        const updatedUser = await usersServerAPI.patchUserByUserId(userId, {
            plan: planId,
            credit_count: creditCount,
            subscription_id: payload.data.id,
        });

        if (!updatedUser) {
            throw new Error("Failed to update user");
        }

        console.log("User updated successfully:", updatedUser);

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Webhook received successfully."
        });
    } catch (error) {
        console.error("Error in POST /webhook/polar/checkouts/success:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to process webhook."
        });
    }
}
