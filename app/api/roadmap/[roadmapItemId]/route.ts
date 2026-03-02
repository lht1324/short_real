// app/api/roadmap/route.ts

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { revalidateTag } from "next/cache";

export async function DELETE(
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

        const { error } = await supabase
            .from('roadmap_items')
            .delete()
            .eq('id', roadmapItemId);

        if (error) {
            console.error('Roadmap delete error:', error);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to delete roadmap items.'
            });
        }

        // 삭제 성공 시 캐시 무효화
        revalidateTag('roadmap');
        console.log('🔄 Cache Revalidated - Roadmap item deleted');

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Successfully deleted roadmap item."
        });

    } catch (error) {
        console.error("Error in DELETE /api/roadmap[roadmapItemId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete roadmap items."
        });
    }
}

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

        // 수정 성공 시 캐시 무효화
        revalidateTag('roadmap');
        console.log('🔄 Cache Revalidated - Roadmap item patched');

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                roadmapItem: patchRoadmapItemResult,
            },
            message: "Successfully patched roadmap item."
        });

    } catch (error) {
        console.error("Error in PATCH /api/roadmap[roadmapItemId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to patch roadmap items."
        });
    }
}