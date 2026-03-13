import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestC2S } from "@/utils/getIsValidRequest";

/**
 * POST /api/autopilot-data
 * Create a new autopilot series.
 */
export async function POST(request: NextRequest) {
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!isValidRequest || !user?.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const newAutopilotData: Partial<AutopilotData> = await request.json();

        const { data, error } = await supabase
            .from('autopilot_data')
            .insert({
                ...newAutopilotData,
                user_id: user.id // Force the user_id to be the authenticated user
            })
            .select()
            .single();

        if (error) {
            console.error('Autopilot insert error:', error);
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
