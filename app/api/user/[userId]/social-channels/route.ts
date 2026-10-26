import {NextRequest} from "next/server";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {cryptoUtils} from "@/lib/utils/cryptoUtils";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {ExportPlatform} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {and, eq} from "drizzle-orm";
import {getNeonDb} from "@/lib/db/neon";
import {userTiktokTokens, userYoutubeTokens} from "@/lib/db/schema";

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

        const db = getNeonDb();

        if (platform === ExportPlatform.YOUTUBE) {
            const youtubeTokens = await db
                .select({
                    id: userYoutubeTokens.id,
                    display_name: userYoutubeTokens.display_name,
                    handle_name: userYoutubeTokens.handle_name,
                    avatar_url: userYoutubeTokens.avatar_url,
                })
                .from(userYoutubeTokens)
                .where(eq(userYoutubeTokens.user_id, userId));

            const channels = youtubeTokens.map((token) => ({
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
            const tiktokTokens = await db
                .select({
                    id: userTiktokTokens.id,
                    display_name: userTiktokTokens.display_name,
                    handle_name: userTiktokTokens.handle_name,
                    avatar_url: userTiktokTokens.avatar_url,
                })
                .from(userTiktokTokens)
                .where(eq(userTiktokTokens.user_id, userId));

            const channels = tiktokTokens.map((token) => ({
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

        const db = getNeonDb();

        if (platform === ExportPlatform.YOUTUBE) {
            await db
                .delete(userYoutubeTokens)
                .where(and(eq(userYoutubeTokens.id, decryptedTokenId), eq(userYoutubeTokens.user_id, userId)));
        } else {
            await db
                .delete(userTiktokTokens)
                .where(and(eq(userTiktokTokens.id, decryptedTokenId), eq(userTiktokTokens.user_id, userId)));
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
