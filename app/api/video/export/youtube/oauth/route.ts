// app/api/youtube/auth/initiate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { getIsValidRequestC2S } from "@/utils/getIsValidRequest";

export async function GET(request: NextRequest) {
    const {
        user,
        isValidRequest,
    } = await getIsValidRequestC2S();

    if (!isValidRequest) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized request."
        });
    }

    const taskId = request.nextUrl.searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        const userId = user?.id;

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 401,
                error: 'Unauthorized'
            });
        }

        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_YOUTUBE_CLIENT_ID!,
            redirect_uri: `${process.env.BASE_URL}/callback/youtube`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            access_type: 'offline',
            prompt: 'consent',
            state: encodeURIComponent(JSON.stringify({
                userId: userId,
                taskId: taskId,
            }))
        });

        return NextResponse.redirect(
            `https://accounts.google.com/o/oauth2/v2/auth?${params}`
        );
    } catch (error) {
        console.error('YouTube auth initiate error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error'
        });
    }
}