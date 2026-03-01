// app/api/roadmap/route.ts

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";

/**
 * GET /api/roadmap
 * 로드맵 아이템 목록을 조회합니다.
 */
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ roadmapItemId: string }> }
) {
    const supabase = createSupabaseServiceRoleClient();

    try {
        const { roadmapItemId } = await params;

        if (!roadmapItemId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Roadmap id is invalid.'
            });
        }
        const newRoadmapItem: Partial<RoadmapItem> = await request.json();

        const currentDateString = new Date().toISOString();

        const { data: patchRoadmapItemResult, error } = await supabase
            .from('roadmap_items')
            .update({
                ...newRoadmapItem,
                updated_at: currentDateString,
            })
            .eq('id', roadmapItemId)
            .select()
            .single();

        if (error) {
            console.error('Roadmap patch error:', error);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to patch roadmap items.'
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                roadmapItem: patchRoadmapItemResult,
            },
            message: "Successfully patched roadmap items."
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