import { voiceServerAPI } from '@/api/server/voiceServerAPI';
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function GET() {
    try {
        const voices = await voiceServerAPI.getVoices();

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                voiceDataList: voices,
            },
            message: "Fetched music data successfully.",
        });
    } catch (error) {
        console.error('Error fetching voices:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Failed to fetch voices'
        });
    }
}