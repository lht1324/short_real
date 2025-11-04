import { NextRequest } from "next/server";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { VideoGenerationTask } from "@/api/types/supabase/VideoGenerationTasks";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;

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
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;
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
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;

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