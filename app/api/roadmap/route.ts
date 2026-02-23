// app/api/roadmap/route.ts

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { RoadmapItem } from "@/api/types/supabase/RoadmapItem";
import { LRUCache } from "lru-cache";

const roadmapCache = new LRUCache<string, RoadmapItem[]>({
    max: 1,
    ttl: 1000 * 60 * 60, // 1시간
});

const CACHE_KEY = 'roadmap_items';

/**
 * GET /api/roadmap
 * 로드맵 아이템 목록을 조회합니다.
 */
export async function GET(_request: NextRequest) {
    try {
        const cached = roadmapCache.get(CACHE_KEY);
        if (cached) {
            console.log('✅ Cache HIT - Roadmap items');
            return getNextBaseResponse({
                success: true,
                status: 200,
                data: { roadmapItemList: cached },
                message: "Successfully fetched roadmap items from cache."
            });
        }
        console.log('❌ Cache MISS - Roadmap items');

        const supabase = createSupabaseServiceRoleClient();
        const { data, error } = await supabase
            .from('roadmap_items')
            .select('*')
            .order('status', { ascending: true });

        if (error) {
            console.error('Roadmap fetch error:', error);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to fetch roadmap items.'
            });
        }

        const roadmapItemList = data as RoadmapItem[];

        roadmapCache.set(CACHE_KEY, roadmapItemList);

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