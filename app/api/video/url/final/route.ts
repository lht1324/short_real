import { NextRequest } from "next/server";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
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
        const fileName = searchParams.get("fileName");
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

        const signedUrl = await videoServerAPI.getVideoSignedUrl(`${userId}/${taskId}/${taskId}_final.mp4`, 60 * 60, fileName ?? undefined);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                url: signedUrl,
            },
            message: "Fetched final video url successfully."
        });
    } catch (error) {
        console.error("Error in GET /api/video/url/final:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get video URL"
        });
    }
}