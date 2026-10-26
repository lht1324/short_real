import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { asc, eq } from "drizzle-orm";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNeonDb } from "@/lib/db/neon";
import { autopilotData } from "@/lib/db/schema";

/**
 * GET /api/autopilot-data/user/[userId]
 * Fetch all autopilot series for a specific user.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { userId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId || (userId !== sessionUserId)) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const db = getNeonDb();

    try {
        const data = await db
            .select()
            .from(autopilotData)
            .where(eq(autopilotData.user_id, userId))
            .orderBy(asc(autopilotData.created_at));

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotDataList: data as unknown as AutopilotData[] },
            message: "Successfully fetched user's autopilot data."
        });
    } catch (error) {
        console.error("Error in GET /api/autopilot-data/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch autopilot data."
        });
    }
}

/**
 * PATCH /api/autopilot-data/user/[userId]
 * Update all autopilot series for a specific user.
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { userId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId || (userId !== sessionUserId)) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const db = getNeonDb();

    try {
        const updateData: Partial<AutopilotData> = await request.json();

        const data = await db
            .update(autopilotData)
            .set({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .where(eq(autopilotData.user_id, userId))
            .returning();

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotDataList: data },
            message: "Successfully updated user's autopilot data."
        });
    } catch (error) {
        console.error("Error in PATCH /api/autopilot-data/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update autopilot data."
        });
    }
}

/**
 * DELETE /api/autopilot-data/user/[userId]
 * Delete all autopilot series for a specific user.
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { userId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId || (userId !== sessionUserId)) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const db = getNeonDb();

    try {
        await db
            .delete(autopilotData)
            .where(eq(autopilotData.user_id, userId));

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Successfully deleted all user's autopilot data."
        });
    } catch (error) {
        console.error("Error in DELETE /api/autopilot-data/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete autopilot data."
        });
    }
}
