import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestS2S } from "@/utils/getIsValidRequest";

/**
 * POST /api/autopilot-data
 * Create a new autopilot series.
 */
export async function POST(
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
        const newAutopilotData: Partial<AutopilotData> = await request.json();

        const { data, error } = await supabase
            .from('autopilot_data')
            .insert({
                ...newAutopilotData,
                user_id: userId // Force the user_id to be the authenticated user
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
