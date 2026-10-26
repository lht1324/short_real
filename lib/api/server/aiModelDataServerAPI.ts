import {AIModelData} from "@/lib/api/types/supabase/AIModelData";
import {and, eq} from "drizzle-orm";
import {getNeonDb} from "@/lib/db/neon";
import {aiModelData} from "@/lib/db/schema";

export const aiModelDataServerAPI = {
    async getAIModelDataList(): Promise<AIModelData[]> {
        try {
            const db = getNeonDb();
            const rows = await db
                .select()
                .from(aiModelData);

            return rows as unknown as AIModelData[];
        } catch (error) {
            throw new Error(`Failed to get ai model data list: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    async getAIModelDataById(id: string): Promise<AIModelData | null> {
        try {
            const db = getNeonDb();
            const rows = await db
                .select()
                .from(aiModelData)
                .where(eq(aiModelData.id, id))
                .limit(1);

            // Supabase .single() 계약 — 0 rows면 null
            return rows[0] ? rows[0] as unknown as AIModelData : null;
        } catch (error) {
            throw new Error(`Failed to get ai model data: ${error instanceof Error ? error.message : String(error)}`);
        }
    },

    async getAIModelDataByDisplayNameAndCategory(displayName: string, category: string): Promise<AIModelData | null> {
        try {
            const db = getNeonDb();
            const rows = await db
                .select()
                .from(aiModelData)
                .where(and(
                    eq(aiModelData.display_name, displayName),
                    eq(aiModelData.category, category),
                ))
                .limit(1);

            // Supabase .maybeSingle() 계약 — 0 rows면 null
            return rows[0] ? rows[0] as unknown as AIModelData : null;
        } catch (error) {
            throw new Error(`Failed to get ai model data by display name & category: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
