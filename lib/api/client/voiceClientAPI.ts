import { getFetch } from './baseFetch';
import {Voice} from "@/lib/api/types/eleven-labs/Voice";

export const voiceClientAPI = {
    // GET /api/voice - 사용 가능한 음성 목록 조회
    async getVoices(): Promise<Voice[]> {
        const response = await getFetch('/api/voice');

        if (!response.ok) {
            throw Error(`HTTP error! status: ${response.status}`);
        }

        const getVoicesResult = await response.json();

        if (!getVoicesResult.success || !getVoicesResult.data) {
            throw Error(getVoicesResult.error ?? "Unknown error occurred while fetching voice data list.");
        }

        return getVoicesResult.data.voiceDataList;
    },

    async getVoiceUrl(taskId: string): Promise<string | null> {
        try {
            const response = await getFetch(`/api/voice/url?taskId=${taskId}`);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const getVoiceUrlResult = await response.json();

            if (!getVoiceUrlResult.success || !getVoiceUrlResult.data) {
                throw Error(getVoiceUrlResult.error ?? "Unknown error occurred while fetching voice data list.");
            }

            return getVoiceUrlResult.data.voiceUrl;
        } catch (error) {
            console.error(error instanceof Error ? error.message : "Unexpected error while fetching voice url.");

            return null;
        }
    }
}