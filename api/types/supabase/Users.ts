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
    DAILY_1 = "daily_1",
    DAILY_2 = "daily_2",
    DAILY_3 = "daily_3",
    DAILY_4 = "daily_4",
}