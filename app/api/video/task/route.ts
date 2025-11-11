import { NextRequest } from "next/server";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { VideoGenerationTask } from "@/api/types/supabase/VideoGenerationTasks";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function POST(request: NextRequest) {
    try {
        const body: VideoGenerationTask = await request.json();

        // 필수 필드 검증
        if (!body.user_id) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "user_id is required"
            });
        }

        if (!body.narration_script) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "narration_script is required"
            });
        }

        if (!body.scene_breakdown_list) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "scene_breakdown_list is required"
            });
        }

        // Task 생성 (upsert 사용)
        const createdTask = await videoGenerationTasksServerAPI.postVideoGenerationTask(body);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                videoGenerationTask: createdTask,
            },
            message: `Video generation task created`
        });
    } catch (error) {
        console.error("Error in POST /api/video/task:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Failed to create task"
        });
    }
}