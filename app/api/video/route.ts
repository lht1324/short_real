import { NextRequest, NextResponse } from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {BaseResponse} from "@/api/types/api/BaseResponse";
import {usersServerAPI} from "@/api/server/usersServerAPI";
import {createSupabaseServer} from "@/lib/supabaseServer";

export async function POST(request: NextRequest): Promise<NextResponse<BaseResponse>> {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    const supabase = await createSupabaseServer();
    const {data: {user: authUser}, error: authError} = await supabase.auth.getUser();

    if (authError || !authUser) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const userId = authUser.id;

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
        const additionalTotalDurationUsage = totalDuration > 30
            ? Math.ceil((totalDuration - 30) / 2) * 5
            : 0;
        const additionalSceneCountUsage = sceneCount > 6
            ? (sceneCount - 6) * 5
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