import {NextRequest} from 'next/server';
import {videoGenerationTasksServerAPI} from '@/lib/api/server/videoGenerationTasksServerAPI';
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'User ID is required'
            });
        }

        const tasks = await videoGenerationTasksServerAPI.getVideoGenerationTasksByUserId(userId);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                videoGenerationTaskList: tasks,
            },
            message: "Fetched video generation task list successfully.",
        });
    } catch (error) {
        console.error('Failed to get user video tasks:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Failed to fetch video tasks'
        });
    }
}