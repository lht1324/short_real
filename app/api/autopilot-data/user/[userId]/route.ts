import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestS2S } from "@/utils/getIsValidRequest";

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

    const supabase = createSupabaseServiceRoleClient();

    try {
        const { data, error } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotDataList: data as AutopilotData[] },
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

    const supabase = createSupabaseServiceRoleClient();

    try {
        const updateData: Partial<AutopilotData> = await request.json();

        const { data, error } = await supabase
            .from('autopilot_data')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', userId)
            .select();

        if (error) throw error;

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

    const supabase = createSupabaseServiceRoleClient();

    try {
        const { error } = await supabase
            .from('autopilot_data')
            .delete()
            .eq('user_id', userId);

        if (error) throw error;

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
