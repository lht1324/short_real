import { NextRequest, NextResponse } from 'next/server';
import { Polar } from '@polar-sh/sdk';
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import {User} from "@/api/types/supabase/Users";
import {PostgrestError} from "@supabase/supabase-js";
// User 타입 import 생략

const isProd = process.env.NODE_ENV === 'production';
const polar = new Polar({
    server: isProd ? 'production' : 'sandbox',
    accessToken: isProd ? process.env.POLAR_API_KEY : process.env.POLAR_DEV_API_KEY,
});

export async function GET(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    // 1. 보안 체크
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // 2. 대상 유저 조회 (만료 2시간 전 이내인 유저)
    // 변경점: 2시간 버퍼 설정 (안전 + 비용 효율 최적화)
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 3); // NOW + 3h

    const {
        data: targetUsers,
        error
    }: {
        data: User[] | null;
        error: PostgrestError | null;
    } = await supabase
        .from('users')
        .select('*')
        .not('scheduled_downgrade_at', 'is', null)
        .lte('scheduled_downgrade_at', targetDate.toISOString()) // 3시간 이내 만료 예정
        .not('downgrade_target_plan_id', 'is', null);

    if (targetUsers && targetUsers.length > 0) {
        console.log(`[DEBUG] Found ${targetUsers.length} users with scheduled downgrades.`);

        targetUsers.forEach((user) => {
            if (!user.scheduled_downgrade_at) return;

            const scheduledTime = new Date(user.scheduled_downgrade_at).getTime();
            const now = new Date().getTime();
            const hoursRemaining = (scheduledTime - now) / (1000 * 60 * 60);

            console.log(
                `[User: ${user.email}] Scheduled: ${user.scheduled_downgrade_at} | Remaining: ${hoursRemaining.toFixed(2)} hours`
            );
        });
    } else {
        console.log('[DEBUG] No users found matching the criteria.');
    }

    if (error) {
        console.error('Error fetching scheduled downgrades:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (!targetUsers || targetUsers.length === 0) {
        return NextResponse.json({ success: true, message: 'No scheduled downgrades to process' });
    }

    // 3. 순회하며 처리
    for (const user of targetUsers) {
        try {
            // [중요] subscription_id 필드가 Users 테이블에 있어야 합니다.
            // 없으면 Users 타입과 DB 스키마에 추가해주세요.
            const subscriptionId = user.subscription_id;
            const targetPlanId = user.downgrade_target_plan_id;

            if (!subscriptionId || !targetPlanId) {
                console.error(`Missing subscription_id or downgrade_target_plan_id for user ${user.id}`);
                continue;
            }

            // Polar Update (취소 철회)
            await polar.subscriptions.update({
                id: subscriptionId,
                subscriptionUpdate: {
                    cancelAtPeriodEnd: false,
                },
            });

            // Polar Update (플랜 변경)
            await polar.subscriptions.update({
                id: subscriptionId,
                subscriptionUpdate: {
                    productId: targetPlanId,
                },
            });

            // DB 초기화 (성공 시)
            const { error: updateError } = await supabase
                .from('users')
                .update({
                    scheduled_downgrade_at: null,
                    downgrade_target_plan_id: null
                })
                .eq('id', user.id);

            if (updateError) {
                console.error(`Failed to update user ${user.id}:`, updateError);
            }

        } catch (error) {
            console.error(`Downgrade failed for user ${user.id}`, error);
        }
    }

    return NextResponse.json({ success: true, processed: targetUsers.length });
}
