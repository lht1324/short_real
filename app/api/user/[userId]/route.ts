import { NextRequest } from "next/server";
import { usersServerAPI } from "@/api/server/usersServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

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

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                user: user,
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