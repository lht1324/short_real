import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

/**
 * GET /api/autopilot-data/platform-connection
 * Check if the user has connected their social media accounts for a SPECIFIC series.
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
    const sessionUserId = searchParams.get('userId');
    const seriesId = searchParams.get('seriesId');

    if (!sessionUserId || !seriesId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query params: userId and seriesId"
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 해당 시리즈와 매칭된 토큰 정보를 각각 조회
        const [youtubeResult, tiktokResult] = await Promise.all([
            supabase
                .from('user_youtube_tokens')
                .select('user_id, handle_name, display_name')
                .eq('user_id', sessionUserId)
                .eq('series_id', seriesId)
                .maybeSingle(),
            supabase
                .from('user_tiktok_tokens')
                .select('user_id, handle_name, display_name')
                .eq('user_id', sessionUserId)
                .eq('series_id', seriesId)
                .maybeSingle()
        ]);

        const youtubeToken = youtubeResult.data;
        const tiktokToken = tiktokResult.data;

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
            message: "Successfully fetched platform connection status for the series."
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

/**
 * DELETE /api/autopilot-data/platform-connection
 * Disconnect a social media account by deleting its token for a SPECIFIC series.
 */
export async function DELETE(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { searchParams } = new URL(request.url);
    const sessionUserId = searchParams.get('userId');
    const seriesId = searchParams.get('seriesId');
    const platform = searchParams.get('platform');

    if (!sessionUserId || !seriesId || !platform) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query params: userId, seriesId, or platform"
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        let tableName = "";
        if (platform === 'youtube') {
            tableName = "user_youtube_tokens";
        } else if (platform === 'tiktok') {
            tableName = "user_tiktok_tokens";
        } else {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Unsupported platform: ${platform}`
            });
        }

        // 특정 유저의 '특정 시리즈'에 연동된 토큰만 삭제
        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq('user_id', sessionUserId)
            .eq('series_id', seriesId);

        if (error) throw error;

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Successfully disconnected ${platform} account from the series.`
        });
    } catch (error) {
        console.error(`Error in DELETE /api/autopilot-data/platform-connection (${platform}):`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : `Failed to disconnect ${platform} account.`
        });
    }
}
