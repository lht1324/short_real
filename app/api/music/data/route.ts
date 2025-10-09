import { NextRequest, NextResponse } from "next/server";
import { musicServerAPI } from "@/api/server/musicServerAPI";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("taskId");

        if (!taskId) {
            return NextResponse.json(
                { error: "taskId is required" },
                { status: 400 }
            );
        }

        const musicDataList = await musicServerAPI.getMusicData(taskId);

        return NextResponse.json(
            musicDataList,
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in GET /api/music/data:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get music data" },
            { status: 500 }
        );
    }
}