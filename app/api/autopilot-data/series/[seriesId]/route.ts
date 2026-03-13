import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestC2S } from "@/utils/getIsValidRequest";

/**
 * GET /api/autopilot-data/series/[seriesId]
 * Fetch a specific autopilot series.
 */
export async function GET(
    _request: NextRequest,
    context: { params: Promise<{ seriesId: string }> }
) {
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!isValidRequest || !user?.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const { seriesId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();

    try {
        const { data, error } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (error) throw error;
        
        if (data.user_id !== user.id) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: "Forbidden. You can only access your own series."
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotData: data as AutopilotData },
            message: "Successfully fetched autopilot series."
        });
    } catch (error) {
        console.error("Error in GET /api/autopilot-data/series/[seriesId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch autopilot series."
        });
    }
}

/**
 * PATCH /api/autopilot-data/series/[seriesId]
 * Update a specific autopilot series.
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ seriesId: string }> }
) {
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!isValidRequest || !user?.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const { seriesId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();

    try {
        // First check ownership
        const { data: existingData, error: fetchError } = await supabase
            .from('autopilot_data')
            .select('user_id')
            .eq('id', seriesId)
            .single();
            
        if (fetchError || !existingData) {
            return getNextBaseResponse({ success: false, status: 404, error: "Series not found." });
        }
        
        if (existingData.user_id !== user.id) {
            return getNextBaseResponse({ success: false, status: 403, error: "Forbidden. You can only update your own series." });
        }

        const updateData: Partial<AutopilotData> = await request.json();

        const { data, error } = await supabase
            .from('autopilot_data')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', seriesId)
            .select()
            .single();

        if (error) throw error;

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotData: data },
            message: "Successfully updated autopilot series."
        });
    } catch (error) {
        console.error("Error in PATCH /api/autopilot-data/series/[seriesId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update autopilot series."
        });
    }
}

/**
 * DELETE /api/autopilot-data/series/[seriesId]
 * Delete a specific autopilot series.
 */
export async function DELETE(
    _request: NextRequest,
    context: { params: Promise<{ seriesId: string }> }
) {
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!isValidRequest || !user?.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const { seriesId } = await context.params;
    const supabase = createSupabaseServiceRoleClient();

    try {
        // First check ownership
        const { data: existingData, error: fetchError } = await supabase
            .from('autopilot_data')
            .select('user_id')
            .eq('id', seriesId)
            .single();
            
        if (fetchError || !existingData) {
            return getNextBaseResponse({ success: false, status: 404, error: "Series not found." });
        }
        
        if (existingData.user_id !== user.id) {
            return getNextBaseResponse({ success: false, status: 403, error: "Forbidden. You can only delete your own series." });
        }

        const { error } = await supabase
            .from('autopilot_data')
            .delete()
            .eq('id', seriesId);

        if (error) throw error;

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Successfully deleted autopilot series."
        });
    } catch (error) {
        console.error("Error in DELETE /api/autopilot-data/series/[seriesId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete autopilot series."
        });
    }
}
