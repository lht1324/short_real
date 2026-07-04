import { NextRequest, NextResponse } from 'next/server';
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { ExportPlatform, ExportStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";

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

    const taskId = searchParams.get('taskId')

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const privacySetting = request.nextUrl.searchParams.get('privacySetting');
        const targetSeriesId = request.nextUrl.searchParams.get('targetSeriesId');

        if (!privacySetting) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Youtube privacy setting is invalid.'
            });
        }

        // 1. 수동 내보내기 시 선택한 채널(시리즈 ID)이 있다면 해당 태스크의 series_id에 맵핑
        if (targetSeriesId) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                series_id: targetSeriesId,
            });
        }

        // 2. 해당 채널(시리즈 ID)에 매칭되는 기존 토큰이 있는지 조회
        let tokenQuery = supabase
            .from('user_youtube_tokens')
            .select('refresh_token, expires_at')
            .eq('user_id', user.id);

        if (targetSeriesId) {
            tokenQuery = tokenQuery.eq('series_id', targetSeriesId);
        } else {
            tokenQuery = tokenQuery.is('series_id', null);
        }

        const { data: existingToken } = await tokenQuery.maybeSingle();

        if (existingToken?.refresh_token) {
            // 토큰 있음 → OAuth 건너뛰고 바로 업로드 트리거
            internalFireAndForgetFetch(
                `${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${taskId}&privacySetting=${privacySetting}`,
                { method: 'POST' }
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
            scope: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
            access_type: 'offline',
            prompt: 'consent',
            state: encodeURIComponent(JSON.stringify({
                userId: user.id,
                taskId: taskId,
                privacySetting: privacySetting,
                targetSeriesId: targetSeriesId || null,
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
