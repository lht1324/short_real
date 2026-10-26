import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { count, eq } from "drizzle-orm";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getAutopilotLimitByPlan } from "@/lib/utils/subscriptionUtils";
import { getNeonDb } from "@/lib/db/neon";
import { autopilotData, users } from "@/lib/db/schema";

/**
 * POST /api/autopilot-data
 * Create a new autopilot series.
 */
export async function POST(
    request: NextRequest,
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const db = getNeonDb();

    try {
        // 1. Get user plan (Supabase .single() 계약 — 없으면 에러)
        const userRows = await db
            .select({ plan: users.plan })
            .from(users)
            .where(eq(users.id, sessionUserId))
            .limit(1);

        if (!userRows[0]) {
            console.error('Fetch user plan error: no row');
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to verify user plan.'
            });
        }

        // 2. Count existing autopilot series
        const countRows = await db
            .select({ value: count() })
            .from(autopilotData)
            .where(eq(autopilotData.user_id, sessionUserId));
        const existingCount = Number(countRows[0]?.value ?? 0);

        // 3. Verify against plan limit
        const limit = getAutopilotLimitByPlan(userRows[0]?.plan);
        if (existingCount >= limit) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: `Limit reached. Your plan allows up to ${limit} series.`
            });
        }

        const newAutopilotData: Partial<AutopilotData> = await request.json();

        // 페이로드는 클라이언트가 보내며 누락 NOT NULL 필드는 DB 제약이 걸러준다.
        const insertPayload = {
            ...newAutopilotData,
            user_id: sessionUserId // Force the user_id to be the authenticated user
        } as typeof autopilotData.$inferInsert;

        const [data] = await db
            .insert(autopilotData)
            .values(insertPayload)
            .returning();

        if (!data) {
            console.error('Autopilot insert error: no row returned');
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to create autopilot data.'
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                autopilotData: data,
            },
            message: "Successfully created autopilot data."
        });
    } catch (error) {
        console.error("Error in POST /api/autopilot-data:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to create autopilot data."
        });
    }
}
