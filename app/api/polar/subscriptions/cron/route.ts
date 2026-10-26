import { NextRequest, NextResponse } from 'next/server';
import { User } from "@/lib/api/types/supabase/Users";
import { PolarClient } from "@/lib/PolarClient";
import { getNeonDb } from "@/lib/db/neon";
import { users } from "@/lib/db/schema";
import { and, eq, isNotNull, lte } from "drizzle-orm";

export async function GET(request: NextRequest) {
    const polar = new PolarClient().getClient();

    // 1. 보안 체크
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    const db = getNeonDb();

    // 2. 대상 유저 조회 (만료 2시간 전 이내인 유저)
    // 변경점: 2시간 버퍼 설정 (안전 + 비용 효율 최적화)
    const targetDate = new Date();
    targetDate.setHours(targetDate.getHours() + 3); // NOW + 3h

    const targetUsers = await db
        .select()
        .from(users)
        .where(and(
            isNotNull(users.scheduled_downgrade_at),
            lte(users.scheduled_downgrade_at, targetDate.toISOString()), // 3시간 이내 만료 예정
            isNotNull(users.downgrade_target_plan_id),
        ));

    if (targetUsers.length > 0) {
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

    if (targetUsers.length === 0) {
        return NextResponse.json({ success: true, message: 'No scheduled downgrades to process' });
    }

    // 3. 순회하며 처리
    let processed = 0;
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
            await db
                .update(users)
                .set({
                    scheduled_downgrade_at: null,
                    downgrade_target_plan_id: null,
                })
                .where(eq(users.id, user.id));

            processed++;
        } catch (error) {
            console.error(`Downgrade failed for user ${user.id}`, error);
        }
    }

    return NextResponse.json({ success: true, processed: targetUsers.length });
}
