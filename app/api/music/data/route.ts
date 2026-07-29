import { NextRequest } from "next/server";
import { musicServerAPI } from "@/lib/api/server/musicServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized internal request",
        });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("taskId");
        const userId = searchParams.get("userId");

        if (!taskId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "taskId is required"
            });
        }

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: "Forbidden. You can only read your own data."
            });
        }

        const musicDataList = await musicServerAPI.getMusicData(taskId, userId);

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