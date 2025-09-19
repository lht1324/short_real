import { getFetch, postFetch } from './baseFetch';
import {Voice} from "@/api/types/eleven-labs/Voice";

export const voiceClientAPI = {
    // GET /api/voice - 사용 가능한 음성 목록 조회
    async getVoices(): Promise<Voice[]> {
        const response = await getFetch('/api/voice');
        return await response.json();
    },
}