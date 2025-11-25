import { NextRequest, NextResponse } from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {BaseResponse} from "@/api/types/api/BaseResponse";

export async function POST(request: NextRequest): Promise<NextResponse<BaseResponse>> {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const {
        selectedStyleId,
    }: { selectedStyleId: string } = await request.json();

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: taskId"
        });
    }

    try {
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            selected_style_id: selectedStyleId,
        });

        // fire and forget
        fetch(`${process.env.BASE_URL}/api/video/process/master-style?taskId=${taskId}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }).catch((error) => {
            console.error("Failed to trigger video process:", error);
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Video generation flow started successfully.",
        });
    } catch (error) {
        console.error("Error in POST /api/video:", error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Failed to process request"
        });
    }
}