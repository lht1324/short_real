import { NextRequest, NextResponse } from "next/server";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { VideoGenerationTask } from "@/api/types/supabase/VideoGenerationTasks";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
) {
    try {
        const { taskId } = await params;

        const task = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!task) {
            return NextResponse.json(
                { error: "Task not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(task, { status: 200 });
    } catch (error) {
        console.error("Error in GET /api/video/task/[taskId]:", error);
        return NextResponse.json(
            { error: "Failed to get task" },
            { status: 500 }
        );
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
            return NextResponse.json(
                { error: "Task not found" },
                { status: 404 }
            );
        }

        // Task 업데이트
        const updatedTask = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, body);

        return NextResponse.json(updatedTask, { status: 200 });
    } catch (error) {
        console.error("Error in PATCH /api/video/task/[taskId]:", error);
        return NextResponse.json(
            { error: "Failed to update task" },
            { status: 500 }
        );
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
            return NextResponse.json(
                { error: "Task not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Task deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error in DELETE /api/video/task/[taskId]:", error);
        return NextResponse.json(
            { error: "Failed to delete task" },
            { status: 500 }
        );
    }
}