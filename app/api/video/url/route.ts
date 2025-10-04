import { NextRequest, NextResponse } from "next/server";
import { videoServerAPI } from "@/api/server/videoServerAPI";

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

        const filePath = `${taskId}/${taskId}.mp4`;
        const signedUrl = await videoServerAPI.getVideoSignedUrl(filePath);

        return NextResponse.json(
            { url: signedUrl },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in GET /api/video/url:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to get video URL" },
            { status: 500 }
        );
    }
}