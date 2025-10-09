import { BGMInfo, BGMType } from "@/api/types/supabase/BackgroundMusics";
import { getFetch } from "@/api/client/baseFetch";
import { MusicData } from "@/api/types/supabase/VideoGenerationTasks";

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
    },

    async getMusicData(taskId: string): Promise<MusicData[] | null> {
        try {
            const response = await getFetch(`/api/music/data?taskId=${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Music data not found for task: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get music data:', error);
            return null;
        }
    }
}