import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
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
        // 1. autopilot_data에서 해당 시리즈의 토큰 ID들 조회
        const { data: autopilot } = await supabase
            .from('autopilot_data')
            .select('youtube_token_id, tiktok_token_id')
            .eq('id', seriesId)
            .single();

        let youtubeToken = null;
        let tiktokToken = null;

        if (autopilot) {
            const [youtubeResult, tiktokResult] = await Promise.all([
                autopilot.youtube_token_id 
                    ? supabase
                        .from('user_youtube_tokens')
                        .select('user_id, handle_name, display_name')
                        .eq('id', autopilot.youtube_token_id)
                        .maybeSingle()
                    : Promise.resolve({ data: null }),
                autopilot.tiktok_token_id 
                    ? supabase
                        .from('user_tiktok_tokens')
                        .select('user_id, handle_name, display_name')
                        .eq('id', autopilot.tiktok_token_id)
                        .maybeSingle()
                    : Promise.resolve({ data: null })
            ]);
            youtubeToken = youtubeResult.data;
            tiktokToken = tiktokResult.data;
        }

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
        if (platform !== 'youtube' && platform !== 'tiktok') {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: `Unsupported platform: ${platform}`
            });
        }

        const updateField = platform === 'youtube' ? 'youtube_token_id' : 'tiktok_token_id';

        // 특정 시리즈의 토큰 맵핑 필드를 null로 업데이트하여 연동 해제
        const { error } = await supabase
            .from('autopilot_data')
            .update({
                [updateField]: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', seriesId)
            .eq('user_id', sessionUserId);

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
