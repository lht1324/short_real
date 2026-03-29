import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { SubscriptionData } from "@/lib/api/types/api/polar/subscriptions/SubscriptionData";
import { unstable_cache } from "next/cache";
import { PolarClient } from "@/lib/PolarClient";
import {getIsValidRequestS2S} from "@/utils/getIsValidRequest";

/**
 * 이메일 기준 구독 데이터를 조회하는 내부 함수 (캐싱 대상)
 */
const getCachedSubscriptionData = unstable_cache(
    async (email: string): Promise<SubscriptionData | null> => {
        console.log(`❌ Cache MISS - Fetching subscription from Polar API for ${email}`);
        const polar = new PolarClient().getClient();

        // 1단계: 이메일로 고객 조회
        const customerResult = await polar.customers.list({
            email: email,
            limit: 1,
        });

        // 고객이 없는 경우
        if (!customerResult.result || customerResult.result.items.length === 0) {
            return null;
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
            return null;
        }

        const subscription = sortedSubscriptionList[0];
        return {
            id: subscription.id,
            status: subscription.status,
            productId: subscription.product.id,
            productName: subscription.product.name,
            productDescription: subscription.product.description ?? undefined,
            amount: subscription.amount,
            currency: subscription.currency,
            billingCycle: subscription.recurringInterval,
            billingInterval: subscription.recurringIntervalCount,
            currentPeriodStart: subscription.currentPeriodStart,
            currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
            cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
            canceledAt: subscription.canceledAt ?? undefined,
            createdAt: subscription.createdAt,
        };
    },
    ['user-subscriptions'],
    { 
        revalidate: 60 * 2, // 2분 캐시
        tags: ['subscriptions'] 
    }
);

/**
 * GET /api/polar/subscriptions
 * 이메일을 기준으로 고객의 구독 상품을 조회합니다.
 */
export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;

    const email = searchParams.get("email");
    const sessionUserId = searchParams.get('userId');

    // email 필수 검증
    if (!email) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "email is required and must be a string."
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        const subscriptionData = await getCachedSubscriptionData(email);

        if (!subscriptionData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "No active subscription found with the provided email."
            });
        }

        console.log(`✅ Cache HIT or Fresh Data - Subscription for ${email} served`);
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                subscriptionData: subscriptionData,
            },
            message: "Successfully fetched subscription."
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
