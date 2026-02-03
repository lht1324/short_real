import { voiceServerAPI } from '@/api/server/voiceServerAPI';
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {LRUCache} from "lru-cache";
import {Voice} from "@/api/types/eleven-labs/Voice";

const voiceCache = new LRUCache<string, Voice[]>({
    max: 1,
    ttl: 1000 * 60 * 60, // 1시간
});
export async function GET() {
    try {
        // 캐시 확인
        const cacheKey = 'voices';
        const cached = voiceCache.get(cacheKey);

        if (cached) {
            console.log('✅ Cache HIT - Voices in /voice served from cache');
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: {
                    voiceDataList: cached,
                },
                message: "Successfully fetched products from cache."
            });
        }

        console.log('❌ Cache MISS - Fetching from ElevenLabs API');

        const voiceDataList = await voiceServerAPI.getVoices();

        // 캐시에 저장
        voiceCache.set(cacheKey, voiceDataList);
        console.log(`💾 Cached ${voiceDataList.length} voices for 1 hour`);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                voiceDataList: voiceDataList,
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