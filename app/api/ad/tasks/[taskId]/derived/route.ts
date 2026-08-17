import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adServerAPI } from "@/lib/api/server/ad/adServerAPI";
import { AD_SIZE_PRESETS } from "@/lib/api/client/ad/adClientAPI";

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> },
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const { taskId } = await context.params;

    try {
        const body = await request.json();
        const { candidateId, presetId } = body as { candidateId?: string; presetId?: string };

        if (!candidateId || !presetId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "candidateId and presetId are required",
            });
        }

        if (!AD_SIZE_PRESETS.some((preset) => preset.id === presetId)) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Invalid size preset",
            });
        }

        const derived = await adServerAPI.postDerivedSize(taskId, candidateId, presetId);

        if (!derived) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "Task or candidate not found",
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                derived,
            },
            message: "Derived size created successfully",
        });
    } catch (error) {
        console.error("Error in POST /api/ad/tasks/[taskId]/derived:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to derive size",
        });
    }
}
