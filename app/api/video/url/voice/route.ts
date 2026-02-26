import { NextRequest, NextResponse } from "next/server";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

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

        const filePath = `${taskId}/${taskId}.mp4`;
        const signedUrl = await videoServerAPI.getVideoSignedUrl(filePath);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                url: signedUrl,
            },
            message: "Fetched voice url successfully."
        });
    } catch (error) {
        console.error("Error in GET /api/video/url:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get video URL"
        });
    }
}