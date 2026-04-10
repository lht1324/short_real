// app/api/youtube/manual/oauth/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { ExportPlatform, ExportStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";

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
            error: 'Missing required query param: taskId'
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const privacySetting = request.nextUrl.searchParams.get('privacySetting');

        if (!privacySetting) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Youtube privacy setting is invalid.'
            });
        }

        const { data: existingToken } = await supabase
            .from('user_youtube_tokens')
            .select('refresh_token, expires_at')
            .eq('user_id', sessionUserId)
            .single();

        if (existingToken?.refresh_token) {
            // 토큰 있음 → OAuth 건너뛰고 바로 업로드 트리거
            internalFireAndForgetFetch(
                `${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${taskId}&privacySetting=${privacySetting}`,
                { method: 'POST' },
                { sessionUserId }
            );

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.UPLOADING,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return NextResponse.redirect(`${process.env.BASE_URL}/workspace/dashboard`);
        }

        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_YOUTUBE_CLIENT_ID!,
            redirect_uri: `${process.env.BASE_URL}/callback/youtube`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            access_type: 'offline',
            prompt: 'consent',
            state: encodeURIComponent(JSON.stringify({
                userId: sessionUserId,
                taskId: taskId,
                privacySetting: privacySetting,
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