export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
    credit_count?: number;
    plan?: SubscriptionPlan;
    created_at: string;ㅊ
    updated_at: string;
}

export enum SubscriptionPlan {
    NONE = "none",
    DAILY_1 = "daily_1",
    DAILY_2 = "daily_2",
    DAILY_3 = "daily_3",
    DAILY_4 = "daily_4",
}