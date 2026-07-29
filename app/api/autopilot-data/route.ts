import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getAutopilotLimitByPlan } from "@/lib/utils/subscriptionUtils";

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

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. Get user plan
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('plan')
            .eq('id', sessionUserId)
            .single();

        if (userError) {
            console.error('Fetch user plan error:', userError);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to verify user plan.'
            });
        }

        // 2. Count existing autopilot series
        const { count, error: countError } = await supabase
            .from('autopilot_data')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sessionUserId);

        if (countError) {
            console.error('Count autopilot series error:', countError);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to verify existing series limit.'
            });
        }

        // 3. Verify against plan limit
        const limit = getAutopilotLimitByPlan(userData?.plan);
        if (count !== null && count >= limit) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: `Limit reached. Your plan allows up to ${limit} series.`
            });
        }

        const newAutopilotData: Partial<AutopilotData> = await request.json();

        const { data, error } = await supabase
            .from('autopilot_data')
            .insert({
                ...newAutopilotData,
                user_id: sessionUserId // Force the user_id to be the authenticated user
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
