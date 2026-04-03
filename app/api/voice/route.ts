import { voiceServerAPI } from '@/lib/api/server/voiceServerAPI';
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {unstable_cache} from "next/cache";

/**
 * 목소리 목록을 조회하는 내부 함수 (캐싱 대상)
 */
const getCachedVoices = unstable_cache(
    async () => {
        console.log('❌ Cache MISS - Fetching voices from ElevenLabs API');
        return await voiceServerAPI.getVoices();
    },
    ['voices'],
    { 
        revalidate: 3600, // 1시간 캐시
        tags: ['voices'] 
    }
);

export async function GET() {
    try {
        const voiceDataList = await getCachedVoices();

        console.log('✅ Cache HIT or Fresh Data - Voices in /voice served');
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                voiceDataList: voiceDataList,
            },
            message: "Successfully fetched voices.",
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