import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";

export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const { data, error } = await supabase
            .from("ai_model_data")
            .select("*")
            .order("display_name", { ascending: true })
            .order("category", { ascending: false });

        if (error) {
            throw error;
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                aiModelDataList: data as AIModelData[],
                count: data?.length ?? 0
            }
        });
    } catch (error) {
        console.error("AI Model Fetch Error:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            message: "Internal server error during fetch",
            error: error instanceof Error ? error.message : "Internal server error during fetch"
        });
    }
}