import { NextRequest, NextResponse } from 'next/server';
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { ExportPlatform, ExportStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { cryptoUtils } from "@/lib/utils/cryptoUtils";

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
        const targetTokenIdRaw = request.nextUrl.searchParams.get('targetTokenId');
        let targetTokenId = (targetTokenIdRaw === 'null' || targetTokenIdRaw === 'undefined') ? null : targetTokenIdRaw;

        if (!privacySetting) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Youtube privacy setting is invalid.'
            });
        }

        // 복호화 시도 (DB 조회용)
        let decryptedTokenId: string | null = null;
        if (targetTokenId) {
            try {
                decryptedTokenId = cryptoUtils.decrypt(targetTokenId, user.id);
            } catch (e) {
                console.error('[YouTube OAuth] Failed to decrypt targetTokenId:', e);
                targetTokenId = null;
            }
        }

        // 2. 해당 고유 토큰 ID에 매칭되는 기존 토큰이 있는지 조회
        let tokenQuery = supabase
            .from('user_youtube_tokens')
            .select('id, refresh_token, expires_at')
            .eq('user_id', user.id);

        if (decryptedTokenId) {
            tokenQuery = tokenQuery.eq('id', decryptedTokenId);
        }

        const { data: existingToken } = await tokenQuery.maybeSingle();

        if (existingToken?.refresh_token) {
            // 토큰 있음 → OAuth 건너뛰고 바로 업로드 트리거 (암호화된 targetTokenId 전달)
            // 만약 targetTokenId가 없었다면 (예: legacy 수동 연동 복구), 새로 암호화하여 생성
            const tokenToPass = targetTokenId || cryptoUtils.encrypt(existingToken.id, user.id);
            
            internalFireAndForgetFetch(
                `${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${taskId}&privacySetting=${privacySetting}&tokenId=${tokenToPass}`,
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
                targetTokenId: targetTokenId || null, // 암호화된 상태 그대로 유지하여 전달
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
