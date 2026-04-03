import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTask} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {NextResponse} from "next/server";

export async function taskCheckAndCleanupIfCancelled(videoGenerationTask: VideoGenerationTask): Promise<NextResponse | null> {
    if (videoGenerationTask.is_user_cancelled_task && videoGenerationTask.id) {
        const deleteVideoGenerationTaskResult = await videoGenerationTasksServerAPI.deleteVideoGenerationTask(videoGenerationTask.id);

        return deleteVideoGenerationTaskResult
            ? NextResponse.json({
                success: true,
                message: "Task cancelled by user and deleted successfully.",
            }, { status: 410 }) : NextResponse.json({
                error: "Failed to delete cancelled task.",
                taskId: videoGenerationTask.id,
            }, { status: 500 });
    } else {
        return null;
    }
}