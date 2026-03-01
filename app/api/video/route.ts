import { NextRequest, NextResponse } from "next/server";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {BaseResponse} from "@/lib/api/types/api/BaseResponse";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";
import {getIsValidRequestC2S} from "@/utils/getIsValidRequest";
import {
    BASE_CREDIT_PER_SCENE,
    BASE_CREDIT_PER_VIDEO_DURATION,
    BASE_SCENE_COUNT_STANDARD,
    BASE_VIDEO_DURATION_STANDARD
} from "@/lib/ADDITIONAL_CREDIT_AMOUNT";

export async function POST(request: NextRequest): Promise<NextResponse<BaseResponse>> {
    const {
        user,
        isValidRequest,
    } = await getIsValidRequestC2S();

    if (!isValidRequest) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const userId = user!.id;

    const {
        selectedStyleId,
    }: {
        selectedStyleId: string;
    } = await request.json();

    if (!taskId || !userId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "Missing required query param: taskId or userId"
        });
    }

    try {
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        const user = await usersServerAPI.getUserByUserId(userId);

        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Task not found."
            });
        }

        if (!user) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "User not found."
            });
        }

        const sceneDataList = videoGenerationTask.scene_breakdown_list;
        const sceneCount = sceneDataList.length;
        const totalDuration = sceneDataList.reduce((acc, sceneData) => {
            return acc + sceneData.sceneDuration;
        }, 0);
        const additionalTotalDurationUsage = totalDuration > BASE_VIDEO_DURATION_STANDARD
            ? Math.ceil(totalDuration - BASE_VIDEO_DURATION_STANDARD) * BASE_CREDIT_PER_VIDEO_DURATION
            : 0;
        const additionalSceneCountUsage = sceneCount > BASE_SCENE_COUNT_STANDARD
            ? (sceneCount - BASE_SCENE_COUNT_STANDARD) * BASE_CREDIT_PER_SCENE
            : 0;
        const creditUsage = 100 + additionalTotalDurationUsage + additionalSceneCountUsage;

        if (!user.credit_count || user.credit_count < creditUsage) {
            return getNextBaseResponse({
                success: false,
                status: 402,
                error: "Insufficient credits."
            });
        }

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
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