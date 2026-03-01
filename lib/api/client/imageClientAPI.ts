import {getFetch} from "@/lib/api/client/baseFetch";

export const imageClientAPI = {
    async getImages(taskId: string, sceneCount: number): Promise<string[]> {
        try {
            const response = await getFetch(`/api/image?taskId=${taskId}&sceneCount=${sceneCount}`);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const getImagesResult = await response.json();

            if (!getImagesResult.success || !getImagesResult.data?.imageUrls) {
                throw Error('Failed to get image URLs');
            }

            return getImagesResult.data.imageUrls;
        } catch (error) {
            console.error('Get images API call failed:', error);
            return [];
        }
    }
}