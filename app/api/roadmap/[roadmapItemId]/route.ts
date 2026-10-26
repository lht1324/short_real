// app/api/roadmap/[roadmapItemId]/route.ts

import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { eq } from "drizzle-orm";
import { RoadmapItem } from "@/lib/api/types/supabase/RoadmapItem";
import { revalidateTag } from "next/cache";
import { getNeonDb } from "@/lib/db/neon";
import { roadmapItems } from "@/lib/db/schema";

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ roadmapItemId: string }> }
) {
    const db = getNeonDb();

    try {
        const { roadmapItemId } = await params;

        if (!roadmapItemId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Roadmap id is invalid.'
            });
        }

        await db
            .delete(roadmapItems)
            .where(eq(roadmapItems.id, roadmapItemId));

        // 삭제 성공 시 캐시 무효화
        revalidateTag('roadmap', 'hours');
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
    const db = getNeonDb();

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

        // Supabase .select().single() 계약 — 업데이트 대상이 없으면 에러
        const patchResult = await db
            .update(roadmapItems)
            .set({
                ...newRoadmapItem,
                updated_at: currentDateString,
            })
            .where(eq(roadmapItems.id, roadmapItemId))
            .returning();

        const patchRoadmapItemResult = patchResult[0];
        if (!patchRoadmapItemResult) {
            console.error('Roadmap patch error: no row updated');
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to patch roadmap items.'
            });
        }

        // 수정 성공 시 캐시 무효화
        revalidateTag('roadmap', 'hours');
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
