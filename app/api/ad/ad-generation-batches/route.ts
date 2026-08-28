import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { adGenerationBatchServerAPI } from "@/lib/api/server/ad/adGenerationBatchServerAPI";

export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. Missing userId.",
        });
    }

    try {
        const limitParam = request.nextUrl.searchParams.get('limit');
        const offsetParam = request.nextUrl.searchParams.get('offset');

        const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10) || 20, 1), 50) : 20;
        const offset = offsetParam ? Math.max(parseInt(offsetParam, 10) || 0, 0) : 0;

        const batches = await adGenerationBatchServerAPI.listAdGenerationBatchesByUserId(userId, {
            limit,
            offset,
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                batches,
                pagination: {
                    limit,
                    offset,
                    count: batches.length,
                },
            },
        });
    } catch (error) {
        console.error("Error in GET /api/ad/ad-generation-batches:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to list batches",
        });
    }
}
