// app/api/roadmap/route.ts

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { asc } from "drizzle-orm";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { getNeonDb } from "@/lib/db/neon";
import { roadmapItems } from "@/lib/db/schema";
import { unstable_cache, revalidateTag } from "next/cache";

/**
 * 로드맵 아이템 목록을 조회하는 내부 함수 (캐싱 대상)
 */
const getCachedRoadmapItems = unstable_cache(
    async () => {
        console.log('❌ Cache MISS - Fetching roadmap items from Neon');
        const db = getNeonDb();
        return db
            .select()
            .from(roadmapItems)
            .orderBy(asc(roadmapItems.status));
    },
    ['roadmap_items'],
    {
        revalidate: 60 * 60,
        tags: ['roadmap']
    }
);

/**
 * GET /api/roadmap
 * 로드맵 아이템 목록을 조회합니다.
 */
export async function GET(_request: NextRequest) {
    try {
        const roadmapItemList = await getCachedRoadmapItems();

        console.log('✅ Cache HIT or Fresh Data - Roadmap items served');
        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { roadmapItemList },
            message: "Successfully fetched roadmap items."
        });

    } catch (error) {
        console.error("Error in GET /api/roadmap:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch roadmap items."
        });
    }
}

export async function POST(
    request: NextRequest,
) {
    const db = getNeonDb();

    try {
        const newRoadmapItem: Partial<RoadmapItem> = await request.json();

        // Supabase upsert(PK 기준) → Drizzle onConflictDoUpdate로 동일 계약 유지.
        // 페이로드는 admin 클라이언트가 풀 아이템을 보내며, 누락 필드는 DB의 NOT NULL이 걸러준다.
        const { id, ...updateFields } = newRoadmapItem;
        const insertPayload = {
            ...(id !== undefined ? { id } : {}),
            ...updateFields,
        } as typeof roadmapItems.$inferInsert;
        const [postRoadmapItemResult] = await db
            .insert(roadmapItems)
            .values(insertPayload)
            .onConflictDoUpdate({
                target: roadmapItems.id,
                set: updateFields,
            })
            .returning();

        // 데이터가 변경되었으므로 'roadmap' 태그가 달린 캐시 무효화
        revalidateTag('roadmap', 'hours');
        console.log('🔄 Cache Revalidated - Roadmap items updated');

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                roadmapItem: postRoadmapItemResult,
            },
            message: "Successfully posted roadmap items."
        });

    } catch (error) {
        console.error("Error in POST /api/roadmap:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch roadmap items."
        });
    }
}
