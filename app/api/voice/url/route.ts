import { voiceServerAPI } from '@/api/server/voiceServerAPI';
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {NextRequest} from "next/server";

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: true, // Replicate가 재시도하지 않도록 200 OK 처리하되 에러 로그 남김
            status: 400,
            error: "Missing param 'taskId'"
        });
    }

    try {
        const voiceUrl = await voiceServerAPI.getVoiceSignedUrl(taskId);

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