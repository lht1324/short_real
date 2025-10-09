export interface User {
    id: string;
    email: string;
    name: string;
    avatar_url: string;
    credit_count?: number;
    plan?: SubscriptionPlan;
    created_at: string;
    updated_at: string;
}

export enum SubscriptionPlan {
    NONE = "none",
    DAILY = "daily",
    CREATOR = "creator",
    PRODUCER = "producer",
    STUDIO = "studio",
}