// app/api/tiktok/auth/initiate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIsValidRequestC2S } from '@/utils/getIsValidRequest';
import { getNextBaseResponse } from '@/utils/getNextBaseResponse';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    const { user, isValidRequest } = await getIsValidRequestC2S();

    if (!isValidRequest || !user?.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized request.',
        });
    }

    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    try {
        // state 생성 후 쿠키 저장
        const state = crypto.randomBytes(16).toString('hex');
        const cookieStore = await cookies();

        cookieStore.set('tiktok_oauth', JSON.stringify({ state, taskId, userId: user.id }), {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 10,
            path: '/',
        });

        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            scope: 'user.info.profile,video.publish',
            response_type: 'code',
            redirect_uri: `${process.env.BASE_URL}/callback/tiktok`,
            state,
        });

        return NextResponse.redirect(
            `https://www.tiktok.com/v2/auth/authorize?${params}`
        );

    } catch (error) {
        console.error('TikTok auth initiate error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error',
        });
    }
}
