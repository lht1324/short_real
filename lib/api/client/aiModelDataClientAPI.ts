import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {getFetch} from "@/lib/api/client/baseFetch";

export const aiModelDataClientAPI = {
    async getAIModelData(): Promise<AIModelData[]> {
        try {
            const response = await getFetch(`/api/ai-model-data`);
            const result = await response.json();

            if (!result.success || !result.data) {
                throw Error(result.error ?? 'Unknown error while fetching ai model data list.');
            }

            return result.data.aiModelDataList;
        } catch (error) {
            console.error(error);
            return [];
        }
    },
}