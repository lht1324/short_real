import { getFetch, postFetch } from "@/lib/api/client/baseFetch";

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
    },

    async postImageRegenerate(payload: {
        taskId: string;
        sceneNumber: number;
        selectedImageModelId?: string;
        selectedI2VModelId?: string;
        isAlsoRegenerateVideo?: boolean;
    }): Promise<{
        success: boolean;
        imageUrl?: string;
        isAlsoRegenerateVideo?: boolean;
        error?: string;
    }> {
        try {
            const response = await postFetch('/api/image/regenerate', payload);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const regenerateResult = await response.json();

            if (!regenerateResult.success || !regenerateResult.data?.imageUrl) {
                throw Error(regenerateResult.error ?? "Failed to regenerate scene image.");
            }

            return {
                success: true,
                imageUrl: regenerateResult.data.imageUrl,
                isAlsoRegenerateVideo: regenerateResult.data.isAlsoRegenerateVideo,
            };
        } catch (error) {
            console.error("Image regenerate API call failed:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Failed to regenerate scene image",
            };
        }
    }
}