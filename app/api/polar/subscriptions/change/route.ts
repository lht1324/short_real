import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getCachedPolarProducts } from "@/lib/api/cached/polarCached";
import {
    PostPolarSubscriptionsChangeRequest
} from "@/lib/api/types/api/polar/subscriptions/change/PostPolarSubscriptionsChangeRequest";
import { getIsValidRequestC2S } from "@/utils/getIsValidRequest";
import { PolarClient } from "@/lib/PolarClient";

/**
 * POST /api/polar/subscriptions/change
 * 사용자의 구독 플랜을 변경합니다.
 *
 * 업그레이드: 즉시 update() 호출하여 플랜 변경 및 차액 청구
 * 다운그레이드: (TODO) 다음 결제 주기에 변경되도록 스케줄링
 */
export async function POST(request: NextRequest) {
    const {
        isValidRequest,
    } = await getIsValidRequestC2S();

    if (!isValidRequest) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    try {
        const polar = new PolarClient().getClient();

        // Request body 파싱
        const {
            userId,
            subscriptionId,
            prevProductId,
            newProductId,
        }: PostPolarSubscriptionsChangeRequest = await request.json();

        // userId 필수 검증
        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "userId is required and must be a string."
            });
        }

        // subscriptionId 필수 검증
        if (!subscriptionId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "subscriptionId is required and must be a string."
            });
        }

        // productId 필수 검증
        if (!prevProductId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "prevProductId is required and must be a string."
            });
        }

        // productId 필수 검증
        if (!newProductId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "newProductId is required and must be a string."
            });
        }

        // 공통 캐시 함수를 통해 제품 목록 조회
        const productDataList = await getCachedPolarProducts();

        const prevProductData = productDataList.find((productData) => {
            return productData.id === prevProductId;
        });
        const newProductData = productDataList.find((productData) => {
            return productData.id === newProductId;
        });

        if (!prevProductData || !newProductData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Product not found."
            });
        }

        const isUpgrade = prevProductData.price < newProductData.price;

        // 업그레이드 처리
        if (isUpgrade) {
            const user = await usersServerAPI.getUserByUserId(userId);

            if (!user) {
                return getNextBaseResponse({
                    success: false,
                    status: 404,
                    error: "User not found."
                });
            }

            // 업그레이드: 즉시 플랜 변경 (즉시 청구)
            await polar.subscriptions.update({
                id: subscriptionId,
                subscriptionUpdate: {
                    productId: newProductId,
                },
            });

            const patchUserResult = await usersServerAPI.patchUserByUserId(userId, {
                credit_count: (user.credit_count ?? 0) + (newProductData.planData.creditCount - prevProductData.planData.creditCount)
            });

            if (!patchUserResult) {
                throw new Error("Patching user failed.");
            }

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Subscription upgraded successfully. Charges applied immediately."
            });
        } else {
            const subscriptionCancelResult = await polar.subscriptions.update({
                id: subscriptionId,
                subscriptionUpdate: {
                    cancelAtPeriodEnd: true,
                }
            });

            const patchUserResult = await usersServerAPI.patchUserByUserId(userId, {
                subscription_id: subscriptionId,
                downgrade_target_plan_id: newProductId,
                scheduled_downgrade_at: subscriptionCancelResult.currentPeriodEnd?.toISOString(),
            });

            if (!patchUserResult) {
                await polar.subscriptions.update({
                    id: subscriptionId,
                    subscriptionUpdate: {
                        cancelAtPeriodEnd: false,
                    }
                });

                throw new Error("Patching user failed.");
            }

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: "Downgrade scheduled successfully. It will be applied at the end of the current billing cycle."
            });
        }
    } catch (error) {
        console.error("Error in POST /api/polar/subscriptions/change:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to change subscription plan."
        });
    }
}