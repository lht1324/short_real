import {NextRequest} from "next/server";
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {cryptoUtils} from "@/lib/utils/cryptoUtils";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    // 🚨 S2S 게이트웨이 보안 가드
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized internal request."
        });
    }

    try {
        const { userId } = await params;
        const { searchParams } = new URL(request.url);
        const platform = searchParams.get("platform") as ExportPlatform;

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing userId parameter"
            });
        }

        if (!platform || (platform !== ExportPlatform.YOUTUBE && platform !== ExportPlatform.TIKTOK)) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid or missing platform parameter"
            });
        }

        const supabase = createSupabaseServiceRoleClient();

        if (platform === ExportPlatform.YOUTUBE) {
            const { data: youtubeTokens, error: youtubeError } = await supabase
                .from("user_youtube_tokens")
                .select("id, display_name, handle_name, avatar_url")
                .eq("user_id", userId);

            if (youtubeError) {
                throw youtubeError;
            }

            const channels = (youtubeTokens || []).map((token) => ({
                id: cryptoUtils.encrypt(token.id, userId),
                seriesId: null,
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
                .select("id, display_name, handle_name, avatar_url")
                .eq("user_id", userId);

            if (tiktokError) {
                throw tiktokError;
            }

            const channels = (tiktokTokens || []).map((token) => ({
                id: cryptoUtils.encrypt(token.id, userId),
                seriesId: null,
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

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized internal request."
        });
    }

    try {
        const { userId } = await params;
        const { searchParams } = new URL(request.url);
        const encryptedTokenId = searchParams.get("tokenId");
        const platform = searchParams.get("platform") as ExportPlatform;

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing userId parameter"
            });
        }

        if (!encryptedTokenId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Missing tokenId parameter"
            });
        }

        if (!platform || (platform !== ExportPlatform.YOUTUBE && platform !== ExportPlatform.TIKTOK)) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid or missing platform parameter"
            });
        }

        let decryptedTokenId: string;
        try {
            decryptedTokenId = cryptoUtils.decrypt(encryptedTokenId, userId);
        } catch (e) {
            console.error("Failed to decrypt tokenId:", e);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid token ID signature or unauthorized access"
            });
        }

        const supabase = createSupabaseServiceRoleClient();
        const tableName = platform === ExportPlatform.YOUTUBE ? "user_youtube_tokens" : "user_tiktok_tokens";

        const { error } = await supabase
            .from(tableName)
            .delete()
            .eq("id", decryptedTokenId)
            .eq("user_id", userId);

        if (error) {
            throw error;
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: `Successfully disconnected ${platform} account.`
        });
    } catch (error) {
        console.error("Error in DELETE /api/user/[userId]/social-channels:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to disconnect social channel."
        });
    }
}
