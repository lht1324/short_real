import { NextRequest, NextResponse } from 'next/server';
import { internalFireAndForgetFetch } from '@/lib/utils/internalFetch';
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {ExportPlatform, ExportStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import { cryptoUtils } from "@/lib/utils/cryptoUtils";


export async function GET(request: NextRequest) {
    const originUrl = process.env.NODE_ENV === 'production' || !request.nextUrl.origin.includes("localhost")
            ? request.nextUrl.origin
            : request.nextUrl.origin.replaceAll("https", "http");
    
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // 1. 에러 확인
        if (error) {
            console.error('TikTok OAuth error:', error);

            const taskId = state ? JSON.parse(state)?.taskId : null;
            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });
            }

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        if (!code || !state) {
            if (!code) {
                console.error("Missing required query param: code");

                if (state) {
                    const taskId = state ? JSON.parse(state)?.taskId : null;
                    if (taskId) {
                        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                            export_status: ExportStatus.FAILED,
                            export_platform: ExportPlatform.TIKTOK,
                        });
                    }
                }
            }
            if (!state) console.error('Missing required query param: state');
            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        // 2. State에서 데이터 추출
        const stateData = JSON.parse(state);
        const { taskId, userId, seriesId, mode, targetTokenId } = stateData;
        const isAutopilot = mode === 'autopilot';
        const isProfileMode = mode === 'profile';

        // 필수 파라미터 체크: 오토파일럿이나 프로필 연동은 userId만 있으면 됨, 매뉴얼은 taskId 필수
        if (!userId || (!isAutopilot && !isProfileMode && !taskId)) {
            console.error('Invalid token or missing taskId/userId');
            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });
            }
            return NextResponse.redirect(isAutopilot ? `${originUrl}/workspace/autopilot?seriesId=${seriesId}` : (isProfileMode ? `${originUrl}/profile` : `${originUrl}/workspace/dashboard`));
        }

        // 3. code → access_token 교환
        const tokenResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_key: process.env.TIKTOK_CLIENT_KEY!,
                client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                code,
                grant_type: 'authorization_code',
                redirect_uri: `${process.env.BASE_URL}/callback/tiktok`,
            }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            console.error('TikTok token exchange error:', tokens);

            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });
            }

            return NextResponse.redirect(isAutopilot ? `${originUrl}/workspace/autopilot?seriesId=${seriesId}` : `${originUrl}/workspace/dashboard`);
        }

        // 4. Supabase에 토큰 저장
        const supabase = createSupabaseServiceRoleClient();

        // [수정] TikTok 사용자 정보 조회 (Display Name + avatar_url)
        let displayName = null;
        let avatarUrl = null;
        try {
            const userRes = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            const userData = await userRes.json();

            if (userData.error) {
                console.error(`[TikTok Callback] API Inner Error:`, JSON.stringify(userData.error));
            }

            if (userData.data?.user) {
                displayName = userData.data.user.display_name || null;
                avatarUrl = userData.data.user.avatar_url || null;
                console.log(`[TikTok Callback] Fetched profile: ${displayName} (Avatar: ${avatarUrl})`);
            }
        } catch (e) {
            console.error('[TikTok Callback] Failed to fetch user info:', e);
        }

        // --- 3단계 수정 내용 시작 ---
        // (1) 기존 레코드의 ID를 조회 (중복 연동 판단)
        let findQuery = supabase
            .from('user_tiktok_tokens')
            .select('id')
            .eq('user_id', userId);

        let decryptedTokenId: string | null = null;
        if (!isAutopilot && targetTokenId && targetTokenId !== 'null' && targetTokenId !== 'undefined') {
            try {
                decryptedTokenId = cryptoUtils.decrypt(targetTokenId, userId);
            } catch (e) {
                console.error('[TikTok Callback] Failed to decrypt targetTokenId:', e);
            }
        }

        if (decryptedTokenId) {
            findQuery = findQuery.eq('id', decryptedTokenId);
        } else if (tokens.open_id) {
            findQuery = findQuery.eq('tiktok_user_id', tokens.open_id);
        } else {
            findQuery = findQuery.eq('id', '00000000-0000-0000-0000-000000000000');
        }

        const { data: existingRecord } = await findQuery.maybeSingle();

        const tokenPayload = {
            user_id: userId,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
            refresh_expires_at: new Date(Date.now() + tokens.refresh_expires_in * 1000).toISOString(),
            tiktok_user_id: tokens.open_id,
            display_name: displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
            last_used_at: new Date().toISOString(),
        };

        let dbResult;
        if (existingRecord?.id) {
            // (2) 이미 존재하는 경우: id 기준으로 UPDATE
            dbResult = await supabase
                .from('user_tiktok_tokens')
                .update(tokenPayload)
                .eq('id', existingRecord.id)
                .select('id')
                .single();
        } else {
            // (3) 존재하지 않는 경우: INSERT
            dbResult = await supabase
                .from('user_tiktok_tokens')
                .insert(tokenPayload)
                .select('id')
                .single();
        }

        const dbError = dbResult.error;
        // --- 3단계 수정 내용 끝 ---

        if (dbError) {
            console.error('Database error:', dbError);

            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });
            }

            return NextResponse.redirect(isAutopilot ? `${originUrl}/workspace/autopilot?seriesId=${seriesId}` : (isProfileMode ? `${originUrl}/profile` : `${originUrl}/workspace/dashboard`));
        }

        const finalTokenId = existingRecord?.id || dbResult.data?.id;

        // 5. 모드에 따른 후속 작업 및 리다이렉트
        if (isProfileMode) {
            return NextResponse.redirect(`${originUrl}/profile`);
        }

        if (isAutopilot) {
            if (finalTokenId) {
                await supabase
                    .from('autopilot_data')
                    .update({
                        tiktok_token_id: finalTokenId,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', seriesId);
            }
            return NextResponse.redirect(`${originUrl}/workspace/autopilot?seriesId=${seriesId}`);
        }

        // 수동 업로드 모드인 경우
        const encryptedTokenId = finalTokenId ? cryptoUtils.encrypt(finalTokenId, userId) : '';
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video/export/tiktok/upload?taskId=${taskId}&tokenId=${encryptedTokenId}`,
            { method: 'POST' },
            { userId }
        );

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            export_status: ExportStatus.UPLOADING,
            export_platform: ExportPlatform.TIKTOK,
        });

        return NextResponse.redirect(`${originUrl}/workspace/dashboard`);

    } catch (error) {
        console.error('TikTok callback error:', error);
        const isProfileMode = state ? (JSON.parse(state)?.mode === 'profile') : false;
        return NextResponse.redirect(isProfileMode ? `${originUrl}/profile` : `${originUrl}/workspace/dashboard`);
    }
}
