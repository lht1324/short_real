import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";

export async function POST(
    request: NextRequest,
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("taskId");
        const seriesId = searchParams.get("seriesId");

        if (!taskId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Task Id is not valid.',
            });
        }

        if (!seriesId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Series Id is not valid.',
            });
        }

        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/autopilot/music?taskId=${taskId}&seriesId=${seriesId}`,
            {
                method: 'POST',
            },
        );

        return getNextBaseResponse({
            status: 200,
            success: true,
            message: `Music analysis triggered for taskId=${taskId}, seriesId=${seriesId}`,
        });
    } catch (error) {
        console.error("Error in POST /api/autopilot/test/music:", error);
        return getNextBaseResponse({
            status: 500,
            success: false,
            message: "Failed to trigger music analysis",
        });
    }
}
