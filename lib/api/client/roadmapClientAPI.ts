import {getFetch, patchFetch, postFetch} from "@/lib/api/client/baseFetch";
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

    async postRoadmapItem(newRoadmapItem: Omit<RoadmapItem, 'id' | 'created_at' | 'updated_at'>): Promise<RoadmapItem | null> {
        try {
            const response = await postFetch(`/api/roadmap`, newRoadmapItem);
            const postRoadmapItemResult = await response.json();

            if (!postRoadmapItemResult.success || !postRoadmapItemResult.data) {
                throw Error(postRoadmapItemResult.error ?? 'Unknown error while creating roadmap item.');
            }

            return postRoadmapItemResult.data.roadmapItem;
        } catch (error) {
            console.error(error);
            return null;
        }
    },

    async patchRoadmapItemById(roadmapItemId: string, roadmapItem: Partial<RoadmapItem>): Promise<RoadmapItem | null> {
        try {
            const response = await patchFetch(`/api/roadmap/${roadmapItemId}`, roadmapItem);
            const patchRoadmapItemByIdResult = await response.json();

            if (!patchRoadmapItemByIdResult.success || !patchRoadmapItemByIdResult.data) {
                throw Error(patchRoadmapItemByIdResult.error ?? 'Unknown error while patching roadmap item.');
            }

            return patchRoadmapItemByIdResult.data.roadmapItem;
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}