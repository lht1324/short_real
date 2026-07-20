import { SubscriptionPlan } from "@/lib/api/types/supabase/Users";

/**
 * 유저의 구독 플랜에 따른 오토파일럿 시리즈 최대 생성 한도를 반환합니다.
 */
export function getAutopilotLimitByPlan(plan?: SubscriptionPlan | string | null): number {
    if (!plan) return 0;

    switch (plan) {
        case SubscriptionPlan.PLAN_1: // Indie
            return 1;
        case SubscriptionPlan.PLAN_2: // Studio
            return 2;
        case SubscriptionPlan.PLAN_4: // Agency
            return 999; // 사실상 제한 없음
        case SubscriptionPlan.PLAN_3: // 레거시 혹은 테스트 플랜 대비
            return 2;
        case SubscriptionPlan.NONE:
        default:
            return 0; // 미구독
    }
}
