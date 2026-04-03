import { NextRequest } from "next/server";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { VideoGenerationTask } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { taskId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        const task = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!task) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Task not found."
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                videoGenerationTask: task,
            },
            message: "Fetched video generation task successfully."
        });
    } catch (error) {
        console.error("Error in GET /api/video/task/[taskId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to get task"
        });
    }
}

export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { taskId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        const body: Partial<VideoGenerationTask> = await request.json();

        // taskId 존재 여부 확인
        const existingTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!existingTask) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Task not found"
            });
        }

        // Task 업데이트
        const updatedTask = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, body);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                videoGenerationTask: updatedTask
            }
        });
    } catch (error) {
        console.error("Error in PATCH /api/video/task/[taskId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update task"
        });
    }
}

export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { taskId } = await context.params;
    const sessionUserId = request.nextUrl.searchParams.get('userId');

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        // Task 삭제
        const deleteVideoGenerationTaskResult = await videoGenerationTasksServerAPI.deleteVideoGenerationTask(taskId);

        if (!deleteVideoGenerationTaskResult) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Task not found"
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Task deleted successfully"
        });
    } catch (error) {
        console.error("Error in DELETE /api/video/task/[taskId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete task"
        });
    }
}