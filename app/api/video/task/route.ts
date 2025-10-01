import { NextRequest, NextResponse } from "next/server";
import { videoGenerationTasksServerAPI } from "@/api/server/videoGenerationTasksServerAPI";
import { VideoGenerationTask } from "@/api/types/supabase/VideoGenerationTasks";

export async function POST(request: NextRequest) {
    try {
        const body: VideoGenerationTask = await request.json();

        // 필수 필드 검증
        if (!body.user_id) {
            return NextResponse.json(
                { error: "user_id is required" },
                { status: 400 }
            );
        }

        if (!body.narration_script) {
            return NextResponse.json(
                { error: "narration_script is required" },
                { status: 400 }
            );
        }

        if (!body.scene_breakdown_list) {
            return NextResponse.json(
                { error: "scene_breakdown_list is required" },
                { status: 400 }
            );
        }

        // Task 생성 (upsert 사용)
        const createdTask = await videoGenerationTasksServerAPI.postVideoGenerationTask(body);

        return NextResponse.json(createdTask, { status: 201 });
    } catch (error) {
        console.error("Error in POST /api/video/task:", error);
        return NextResponse.json(
            { error: "Failed to create task" },
            { status: 500 }
        );
    }
}