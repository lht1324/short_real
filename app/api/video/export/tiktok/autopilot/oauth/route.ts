import { NextRequest, NextResponse } from 'next/server';
import { getIsValidRequestS2S } from '@/lib/utils/getIsValidRequest';
import { getNextBaseResponse } from '@/lib/utils/getNextBaseResponse';

/**
 * GET /api/video/export/tiktok/autopilot/oauth
 * Initiates TikTok OAuth process for an Autopilot series.
 */
export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;
    const seriesId = searchParams.get('seriesId') || searchParams.get('taskId');
    const sessionUserId = searchParams.get('userId');

    if (!seriesId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: seriesId',
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            scope: 'user.info.basic,video.publish',
            response_type: 'code',
            redirect_uri: `${process.env.BASE_URL}/callback/tiktok`,
            state: JSON.stringify({ 
                seriesId: seriesId, 
                userId: sessionUserId, 
                mode: 'autopilot' 
            }),
        });

        return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize?${params}`);
    } catch (error) {
        console.error('TikTok autopilot auth initiate error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error',
        });
    }
}
