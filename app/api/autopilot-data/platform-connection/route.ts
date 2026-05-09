import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

/**
 * GET /api/autopilot-data/platform-connection
 * Check if the user has connected their social media accounts (YouTube, TikTok, etc.)
 */
export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { searchParams } = new URL(request.url);

    // 세션 유저와 요청 유저 일치 확인 (S2S 패턴 유지)
    const sessionUserId = searchParams.get('userId');
    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. YouTube 토큰 정보 조회
        const { data: youtubeToken } = await supabase
            .from('user_youtube_tokens')
            .select('user_id, handle_name, display_name')
            .eq('user_id', sessionUserId)
            .maybeSingle();

        // 2. TikTok 토큰 정보 조회
        const { data: tiktokToken } = await supabase
            .from('user_tiktok_tokens')
            .select('user_id, handle_name, display_name')
            .eq('user_id', sessionUserId)
            .maybeSingle();

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                platformConnection: {
                    youtube: {
                        connected: !!youtubeToken,
                        handleName: youtubeToken?.handle_name || null,
                        displayName: youtubeToken?.display_name || null,
                    },
                    tiktok: {
                        connected: !!tiktokToken,
                        handleName: tiktokToken?.handle_name || null,
                        displayName: tiktokToken?.display_name || null,
                    },
                    instagram: {
                        connected: false,
                        handleName: null,
                        displayName: null,
                    },
                }
            },
            message: "Successfully fetched platform connection status."
        });
    } catch (error) {
        console.error("Error in GET /api/autopilot-data/platform-connection:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch platform connection status."
        });
    }
}
