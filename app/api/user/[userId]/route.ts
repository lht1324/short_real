import { NextRequest, NextResponse } from "next/server";
import { usersServerAPI } from "@/api/server/usersServerAPI";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await params;

        const user = await usersServerAPI.getUserByUserId(userId);

        if (!user) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(user, { status: 200 });
    } catch (error) {
        console.error("Error in GET /api/user/[userId]:", error);
        return NextResponse.json(
            { error: "Failed to get user" },
            { status: 500 }
        );
    }
}