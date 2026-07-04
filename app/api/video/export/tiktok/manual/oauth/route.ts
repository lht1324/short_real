import { NextRequest, NextResponse } from 'next/server';
import { getIsValidRequestC2S } from '@/lib/utils/getIsValidRequest';
import { getNextBaseResponse } from '@/lib/utils/getNextBaseResponse';
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

    const taskId = searchParams.get('taskId');
    const targetSeriesId = searchParams.get('targetSeriesId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. 수동 내보내기 시 선택한 채널(시리즈 ID)이 있다면 해당 태스크의 series_id에 맵핑
        if (targetSeriesId) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                series_id: targetSeriesId,
            });
        }

        // 2. 해당 채널(시리즈 ID)에 매칭되는 기존 토큰이 있는지 조회
        let tokenQuery = supabase
             .from('user_tiktok_tokens')
             .select('refresh_token, refresh_expires_at')
             .eq('user_id', user.id);

        if (targetSeriesId) {
            tokenQuery = tokenQuery.eq('series_id', targetSeriesId);
        } else {
            tokenQuery = tokenQuery.is('series_id', null);
        }

        const { data: existingToken } = await tokenQuery.maybeSingle();

        // 3. 토큰이 유효하게 남아있다면 OAuth 없이 즉시 업로드 트리거
        if (existingToken?.refresh_token && Date.now() < new Date(existingToken.refresh_expires_at).getTime()) {
            internalFireAndForgetFetch(
                `${process.env.BASE_URL}/api/video/export/tiktok/upload?taskId=${taskId}`,
                { method: 'POST' },
                { userId: user.id }
            );

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.UPLOADING,
                export_platform: ExportPlatform.TIKTOK,
            });

            return NextResponse.redirect(`${process.env.BASE_URL}/workspace/dashboard`);
        }

        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            scope: 'user.info.basic,video.publish',
            response_type: 'code',
            redirect_uri: `${process.env.BASE_URL}/callback/tiktok`,
            state: JSON.stringify({
                taskId,
                userId: user.id,
                targetSeriesId: targetSeriesId || null,
            }),
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
