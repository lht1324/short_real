import {getFetch} from "@/api/client/baseFetch";

export const imageClientAPI = {
    async getImages(taskId: string, sceneCount: number): Promise<string[]> {
        try {
            const response = await getFetch(`/api/image?taskId=${taskId}&sceneCount=${sceneCount}`);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.imageUrls) {
                throw Error('Failed to get image URLs');
            }

            return data.imageUrls;
        } catch (error) {
            console.error('Get images API call failed:', error);
            return [];
        }
    }
}