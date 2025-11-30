// DB를 3개 파야 한다. 각 플랫폼마다 하나씩 파야 한다. 인증을 Authenticated처럼 편하게 할 수 없다.
// 일단 유튜브는 refresh_token, access_token, 발급 시간을 저장해야 한다.
// refresh_token은 에지간하면 만료되지 않는데, access_token은 AI가 1시간에 만료된다 주장한다.
// 처음 Export를 눌러 refresh_token이 없다면 발급받고, access_token을 refresh_token으로 발급받아 저장하고 Youtube API를 호출한다.
// refresh_token을 발급받은 뒤 Youtube 테이블의 row를 조회한다. access_token이 만료됐다면 새로 발급받고, 만료되지 않았다면 조회한 access_token 그대로 Youtube API를 호출한다.

// app/api/youtube/auth/initiate/route.ts
import { NextRequest } from 'next/server';
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {PostVideoExportYoutubeRequest} from "@/api/types/api/video/export/youtube/PostVideoExportYoutubeRequest";

export async function POST(request: NextRequest) {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        const { userId }: PostVideoExportYoutubeRequest = await request.json();

        if (!userId) {
            return getNextBaseResponse({
                success: false,
                status: 401,
                error: 'Unauthorized'
            });
        }

        // OAuth URL 생성
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_YOUTUBE_CLIENT_ID!,
            redirect_uri: `${process.env.BASE_URL}/callback/youtube`,
            // redirect_uri: `http://localhost:3001/callback/youtube`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            access_type: 'offline',
            prompt: 'consent',
            state: encodeURIComponent(JSON.stringify({
                userId: userId,
                taskId: taskId,
            }))
        });

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;

        console.log(authUrl);

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                authUrl: authUrl,
            },
            message: "Requested Youtube OAuth successfully."
        });
    } catch (error) {
        console.error('YouTube auth initiate error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error'
        });
    }
}
