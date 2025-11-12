import { getFetch } from "@/api/client/baseFetch";
import { MusicData } from "@/api/types/supabase/VideoGenerationTasks";

export const musicClientAPI = {
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

            const getMusicDataResult = await response.json();

            if (!getMusicDataResult.success || !getMusicDataResult.data) {
                throw Error(getMusicDataResult.error ?? "Unknown error occurred while fetching music data.");
            }

            return getMusicDataResult.data.musicDataList;
        } catch (error) {
            console.error('Failed to get music data:', error);
            return null;
        }
    }
}