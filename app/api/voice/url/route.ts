import { voiceServerAPI } from '@/lib/api/server/voiceServerAPI';
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {NextRequest} from "next/server";

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');
    const sessionUserId = searchParams.get('userId');

    if (!taskId) {
        return getNextBaseResponse({
            success: true,
            status: 400,
            error: "Missing param 'taskId'"
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: true,
            status: 400,
            error: "Missing param 'userId'"
        });
    }

    try {
        const voiceUrl = await voiceServerAPI.getVoiceSignedUrl(taskId, sessionUserId);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                voiceUrl: voiceUrl,
            },
            message: "Fetched voice url successfully.",
        });
    } catch (error) {
        console.error('Error fetching voice url:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Failed to fetch voice url'
        });
    }
}