import { NextRequest, NextResponse } from "next/server";
import { PostVideoRequest } from "@/api/types/api/video/PostVideoRequest";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";

export async function POST(request: NextRequest) {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return NextResponse.json({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        const processRequest: PostVideoRequest = await request.json();

        // fire and forget
        fetch(`${process.env.BASE_URL}/api/video/process/master-style?taskId=${taskId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(processRequest),
        }).catch((error) => {
            console.error("Failed to trigger video process:", error);
        });

        return NextResponse.json({
            success: true,
            status: 200,
            message: "Video generation flow started successfully.",
        });
    } catch (error) {
        console.error("Error in POST /api/video:", error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return NextResponse.json({
            success: false,
            status: 500,
            error: "Failed to process request"
        });
    }
}