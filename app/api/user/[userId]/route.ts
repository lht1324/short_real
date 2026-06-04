import { NextRequest } from "next/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { User } from "@/lib/api/types/supabase/Users";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        const user = await usersServerAPI.getUserByUserId(userId);

        if (!user) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found"
            });
        }

        // --- Security Masking ---
        // Mask API keys before sending to the client (e.g., 'sk-a...********')
        const maskKey = (key: string | null | undefined) => {
            if (!key) return null;
            if (key.length <= 8) return "********"; // Too short to show prefix
            return `${key.slice(0, 4)}...${"*".repeat(8)}`;
        };

        const maskedUser: User = {
            ...user,
            fal_ai_api_key: maskKey(user.fal_ai_api_key),
            replicate_api_key: maskKey(user.replicate_api_key),
        };

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                user: maskedUser,
            },
            message: "Fetched user data successfully."
        });
    } catch (error) {
        console.error("Error in GET /api/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get user data."
        });
    }
}

export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        // Request body 파싱
        const body: Partial<User> = await request.json();

        // 사용자 업데이트
        const updatedUser = await usersServerAPI.patchUserByUserId(userId, body);

        if (!updatedUser) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found or update failed"
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                user: updatedUser,
            },
            message: "User updated successfully."
        });
    } catch (error) {
        console.error("Error in PATCH /api/user/[userId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update user data."
        });
    }
}