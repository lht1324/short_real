import {getFetch, patchFetch} from "@/lib/api/client/baseFetch";
import {RoadmapItem} from "@/lib/api/types/supabase/RoadmapItem";

export const roadmapClientAPI = {
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
    },

    async patchRoadmapItemById(roadmapItemId: string, roadmapItem: Partial<RoadmapItem>): Promise<RoadmapItem | null> {
        try {
            const response = await patchFetch(`/api/roadmap/${roadmapItemId}`, roadmapItem);
            const patchRoadmapItemByIdResult = await response.json();

            if (!patchRoadmapItemByIdResult.success || !patchRoadmapItemByIdResult.data) {
                throw Error(patchRoadmapItemByIdResult.error ?? 'Unknown error while patching roadmap item.');
            }

            return patchRoadmapItemByIdResult.data.patchedRoadmap;
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}