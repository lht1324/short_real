import { NextRequest, NextResponse } from "next/server";
import { musicServerAPI } from "@/lib/api/server/musicServerAPI";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("taskId");

        if (!taskId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "taskId is required"
            });
        }

        const musicDataList = await musicServerAPI.getMusicData(taskId);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                musicDataList: musicDataList,
            }
        });
    } catch (error) {
        console.error("Error in GET /api/music/data:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get music data"
        });
    }
}