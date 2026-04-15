import { NextRequest, NextResponse } from 'next/server';
import { getIsValidRequestC2S } from '@/lib/utils/getIsValidRequest';
import { getNextBaseResponse } from '@/lib/utils/getNextBaseResponse';
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";

/**
 * GET /api/video/export/tiktok/autopilot/oauth
 * Initiates TikTok OAuth process for an Autopilot series.
 * Now includes a check for existing tokens to provide a better UX.
 */
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
    const seriesId = searchParams.get('seriesId') || searchParams.get('taskId');

    if (!seriesId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: seriesId',
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. 이미 연동된 토큰이 있는지 확인 (유튜브와 로직 동기화)
        const { data: existingToken } = await supabase
            .from('user_tiktok_tokens')
            .select('refresh_token')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingToken?.refresh_token) {
            // 이미 연동되어 있다면 즉시 오토파일럿 설정 페이지로 리다이렉트
            return NextResponse.redirect(`${process.env.BASE_URL}/workspace/autopilot?seriesId=${seriesId}`);
        }

        // 2. 연동되지 않은 경우 틱톡 OAuth 프로세스 시작
        const params = new URLSearchParams({
            client_key: process.env.TIKTOK_CLIENT_KEY!,
            scope: 'user.info.basic,video.publish',
            response_type: 'code',
            redirect_uri: `${process.env.BASE_URL}/callback/tiktok`,
            state: JSON.stringify({ 
                seriesId: seriesId, 
                userId: user.id, 
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
