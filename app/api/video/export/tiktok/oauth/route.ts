import { NextRequest, NextResponse } from 'next/server';
import { getIsValidRequestS2S } from '@/utils/getIsValidRequest';
import { getNextBaseResponse } from '@/utils/getNextBaseResponse';

export async function GET(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;

    const taskId = searchParams.get('taskId')
    const sessionUserId = searchParams.get('userId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
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
            state: JSON.stringify({ taskId, userId: sessionUserId }),
        });

        return NextResponse.redirect(`https://www.tiktok.com/v2/auth/authorize?${params}`);
    } catch (error) {
        console.error('TikTok auth initiate error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error',
        });
    }
}
