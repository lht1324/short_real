import { NextRequest, NextResponse } from "next/server";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { BaseResponse } from "@/lib/api/types/api/BaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import {VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";

export async function POST(request: NextRequest): Promise<NextResponse<BaseResponse>> {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;

    const taskId = searchParams.get('taskId')
    const sessionUserId = searchParams.get('userId');
    const selectedStyleId = searchParams.get('selectedStyleId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    if (!selectedStyleId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Style is not selected."
        });
    }

    try {
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT,
            selected_style_id: selectedStyleId,
        });

        // fire and forget
        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/process/master-style?taskId=${taskId}`, {
            method: "POST",
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