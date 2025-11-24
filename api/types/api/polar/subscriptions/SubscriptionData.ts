import {SubscriptionStatus} from "@polar-sh/sdk/models/components/subscriptionstatus";
import {SubscriptionRecurringInterval} from "@polar-sh/sdk/models/components/subscriptionrecurringinterval";

export interface SubscriptionData {
    // 기본
    id: string;
    status: SubscriptionStatus;

    // 상품
    productId: string;
    productName: string;
    productDescription?: string;

    // 가격
    amount: number;
    currency: string;

    // 주기
    billingCycle: SubscriptionRecurringInterval;
    billingInterval: number;

    // 날짜
    currentPeriodStart: Date;
    currentPeriodEnd?: Date;

    // 취소
    cancelAtPeriodEnd: boolean;
    canceledAt?: Date;

    // 추가
    createdAt: Date;
}