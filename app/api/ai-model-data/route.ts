import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { asc, desc } from "drizzle-orm";
import { getNeonDb } from "@/lib/db/neon";
import { aiModelData } from "@/lib/db/schema";
import { AIModelData } from "@/lib/api/types/supabase/AIModelData";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";

export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const db = getNeonDb();

    try {
        const rows = await db
            .select()
            .from(aiModelData)
            .orderBy(asc(aiModelData.display_name), desc(aiModelData.category));

        // DB 행은 nullable 컬럼(thumbnail_url 등)을 string | null로 돌려주므로
        // 기존 응답 계약(AIModelData[])과의 호환을 위해 캐스팅한다.
        const aiModelDataList = rows as unknown as AIModelData[];

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                aiModelDataList,
                count: rows.length
            }
        });
    } catch (error) {
        console.error("AI Model Fetch Error:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            message: "Internal server error during fetch",
            error: error instanceof Error ? error.message : "Internal server error during fetch"
        });
    }
}
