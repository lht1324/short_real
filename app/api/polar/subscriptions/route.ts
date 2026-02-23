import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { SubscriptionData } from "@/api/types/api/polar/subscriptions/SubscriptionData";
import { LRUCache } from "lru-cache";
import { PolarClient } from "@/lib/PolarClient";

// 캐싱 (2분)
const subscriptionCache = new LRUCache<string, SubscriptionData>({
    max: 1000,
    ttl: 1000 * 60 * 2,
});

/**
 * GET /api/polar/subscriptions
 * 이메일을 기준으로 고객의 구독 상품을 조회합니다.
 */
export async function GET(request: NextRequest) {
    try {
        const polar = new PolarClient().getClient();

        // Query parameter에서 email 추출
        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");

        // email 필수 검증
        if (!email) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "email is required and must be a string."
            });
        }

        // 캐시 확인
        const cacheKey = `subscription:${email}`;
        const cached = subscriptionCache.get(cacheKey);
        if (cached) {
            console.log(`✅ Cache HIT - Subscription for ${email}`);
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: {
                    subscriptionData: cached,
                },
                message: "Successfully fetched subscription from cache."
            });
        }

        // 1단계: 이메일로 고객 조회
        const customerResult = await polar.customers.list({
            email: email,
            limit: 1,
        });

        // 고객이 없는 경우
        if (!customerResult.result || customerResult.result.items.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "No customer found with the provided email."
            });
        }

        // 첫 번째 고객의 ID 추출
        const customerId = customerResult.result.items[0].id;

        // 2단계: customerId로 구독 내역 조회
        const subscriptionsResult = await polar.subscriptions.list({
            customerId: customerId,
            active: true,
        });

        const sortedSubscriptionList = subscriptionsResult.result.items.sort((a, b) => {
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        if (sortedSubscriptionList.length === 0) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Subscription not found with the provided email."
            });
        }

        const subscription = sortedSubscriptionList[0];
        const subscriptionData: SubscriptionData = {
            // 기본
            id: subscription.id,
            status: subscription.status, // "incomplete" | "incomplete_expired" | "trialing" | "active" | "past_due" | "canceled" | "unpaid"

            // 상품
            productId: subscription.product.id,
            productName: subscription.product.name,
            productDescription: subscription.product.description ?? undefined,

            // 가격
            amount: subscription.amount,
            currency: subscription.currency,

            // 주기
            billingCycle: subscription.recurringInterval, // "day" | "week" | "month" | "year"
            billingInterval: subscription.recurringIntervalCount,

            // 날짜
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,

            // 취소
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt ?? undefined,

            // 추가
            createdAt: subscription.createdAt,
        };

        // 캐시 저장
        subscriptionCache.set(cacheKey, subscriptionData);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                subscriptionData: subscriptionData,
            },
            message: "Successfully fetched orders from Polar."
        });

    } catch (error) {
        console.error("Error in GET /api/polar/subscriptions:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch subscription from Polar."
        });
    }
}
