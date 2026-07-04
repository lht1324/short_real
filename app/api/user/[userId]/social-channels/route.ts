import { NextRequest } from "next/server";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;
        const { searchParams } = new URL(request.url);
        const platform = searchParams.get("platform");

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing userId parameter"
            });
        }

        if (!platform || (platform !== "youtube" && platform !== "tiktok")) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid or missing platform parameter (must be 'youtube' or 'tiktok')"
            });
        }

        const supabase = createSupabaseServiceRoleClient();

        if (platform === "youtube") {
            const { data: youtubeTokens, error: youtubeError } = await supabase
                .from("user_youtube_tokens")
                .select("id, series_id, display_name, handle_name, avatar_url")
                .eq("user_id", userId);

            if (youtubeError) {
                throw youtubeError;
            }

            const channels = (youtubeTokens || []).map((token) => ({
                id: token.id,
                seriesId: token.series_id || null,
                displayName: token.display_name || "YouTube Shorts Channel",
                handleName: token.handle_name || "",
                avatarUrl: token.avatar_url || null,
                platform: "youtube" as const
            }));

            return getNextBaseResponse({
                success: true,
                status: 200,
                data: {
                    channels
                },
                message: "Successfully fetched YouTube channels."
            });
        } else {
            const { data: tiktokTokens, error: tiktokError } = await supabase
                .from("user_tiktok_tokens")
                .select("id, series_id, display_name, handle_name, avatar_url")
                .eq("user_id", userId);

            if (tiktokError) {
                throw tiktokError;
            }

            const channels = (tiktokTokens || []).map((token) => ({
                id: token.id,
                seriesId: token.series_id || null,
                displayName: token.display_name || "TikTok Account",
                handleName: token.handle_name || "",
                avatarUrl: token.avatar_url || null,
                platform: "tiktok" as const
            }));

            return getNextBaseResponse({
                success: true,
                status: 200,
                data: {
                    channels
                },
                message: "Successfully fetched TikTok accounts."
            });
        }
    } catch (error) {
        console.error("Error in GET /api/user/[userId]/social-channels:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch social channels."
        });
    }
}
