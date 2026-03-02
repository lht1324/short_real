// app/api/roadmap/route.ts

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { unstable_cache, revalidateTag } from "next/cache";

/**
 * 로드맵 아이템 목록을 조회하는 내부 함수 (캐싱 대상)
 */
const getCachedRoadmapItems = unstable_cache(
    async () => {
        console.log('❌ Cache MISS - Fetching roadmap items from Supabase');
        const supabase = createSupabaseServiceRoleClient();
        const { data, error } = await supabase
            .from('roadmap_items')
            .select('*')
            .order('status', { ascending: true });

        if (error) throw error;
        return data as RoadmapItem[];
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
    const supabase = createSupabaseServiceRoleClient();

    try {
        const newRoadmapItem: Partial<RoadmapItem> = await request.json();

        const { data: postRoadmapItemResult, error } = await supabase
            .from('roadmap_items')
            .upsert({
                ...newRoadmapItem,
            })
            .select()
            .single();

        if (error) {
            console.error('Roadmap patch error:', error);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to post roadmap items.'
            });
        }

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