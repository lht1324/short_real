export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
    credit_count?: number;
    plan?: SubscriptionPlan;
    created_at: string;
    updated_at: string;

    subscription_id?: string; // Polar 구독 웹훅에 추가
    last_subscribed_at: string;
    scheduled_downgrade_at?: string;
    downgrade_target_plan_id?: string;
}

export enum SubscriptionPlan {
    NONE = "none",
    PLAN_1 = "plan-1",
    PLAN_2 = "plan-2",
    PLAN_3 = "plan-3",
    PLAN_4 = "plan-4",
}