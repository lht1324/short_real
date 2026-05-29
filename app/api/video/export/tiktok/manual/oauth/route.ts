import { NextRequest, NextResponse } from 'next/server';
import { getIsValidRequestC2S } from '@/lib/utils/getIsValidRequest';
import { getNextBaseResponse } from '@/lib/utils/getNextBaseResponse';

export async function GET(request: NextRequest) {
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!isValidRequest || !user || !user.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized. Sign-in required.',
        });
    }

    const searchParams = request.nextUrl.searchParams;

    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    try {
        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            scope: 'user.info.basic,video.publish',
            response_type: 'code',
            redirect_uri: `${process.env.BASE_URL}/callback/tiktok`,
            state: JSON.stringify({ taskId, userId: user.id }),
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
