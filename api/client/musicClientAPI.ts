import { BGMInfo, BGMType } from "@/api/types/supabase/BackgroundMusics";
import { getFetch } from "@/api/client/baseFetch";

export const musicClientAPI = {
    async getBackgroundMusics(type: BGMType = BGMType.Preview): Promise<BGMInfo[]> {
        try {
            const response = await getFetch(`/api/music?type=${type}`);
            const data = await response.json();

            if (!data.bgmInfoList) {
                throw new Error('Background musics not found');
            }

            return data.bgmInfoList;
        } catch (error) {
            console.error('Error fetching background musics:', error);
            return [];
        }
    }
}