import { NextRequest } from "next/server";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("taskId");
        const fileName = searchParams.get("fileName");

        if (!taskId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "taskId is required"
            });
        }

        const filePath = `${taskId}/${taskId}_final.mp4`;
        const signedUrl = await videoServerAPI.getVideoSignedUrl(filePath, 60 * 60, fileName ?? undefined);

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