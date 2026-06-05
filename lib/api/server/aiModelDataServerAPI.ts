import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {AIModelData} from "@/lib/api/types/supabase/AIModelData";

export const aiModelDataServerAPI = {
    async getAIModelDataList(): Promise<AIModelData[]> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ai_model_data')
            .select('*');

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return [];
            }
            throw new Error(`Failed to get ai model data list: ${error.message}`);
        }

        return data;
    },

    async getAIModelDataById(id: string): Promise<AIModelData | null> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ai_model_data')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw new Error(`Failed to get ai model data: ${error.message}`);
        }

        return data;
    }
}