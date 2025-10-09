import {NextRequest, NextResponse} from 'next/server';
import {videoGenerationTasksServerAPI} from '@/api/server/videoGenerationTasksServerAPI';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ userId: string }> }
) {
    try {
        const { userId } = await context.params;

        if (!userId) {
            return NextResponse.json(
                { error: 'User ID is required' },
                { status: 400 }
            );
        }

        const tasks = await videoGenerationTasksServerAPI.getVideoGenerationTasksByUserId(userId);

        return NextResponse.json(tasks, { status: 200 });
    } catch (error) {
        console.error('Failed to get user video tasks:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video tasks' },
            { status: 500 }
        );
    }
}