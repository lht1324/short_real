import {getFetch} from "@/lib/api/client/baseFetch";
import {RoadmapItem} from "@/lib/api/types/supabase/RoadmapItem";

export const roadmapItemClientAPI = {
    async getRoadmaps(): Promise<RoadmapItem[]> {
        try {
            const response = await getFetch('/api/roadmap');
            const getRoadmapsResult = await response.json();

            if (!getRoadmapsResult.success || !getRoadmapsResult.data) {
                throw Error(getRoadmapsResult.error ?? 'Unknown error while fetching roadmap items.');
            }

            return getRoadmapsResult.data.roadmapItemList;
        } catch (error) {
            console.error(error);
            return [];
        }
    }
}