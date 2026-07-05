// app/api/callback/youtube/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {createSupabaseServiceRoleClient} from "@/lib/supabase/supabaseServiceRole";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {ExportPlatform, ExportStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import { cryptoUtils } from "@/lib/utils/cryptoUtils";


export async function GET(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();
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
            console.error(error);

            const taskId = state ? JSON.parse(decodeURIComponent(state))?.taskId : null;
            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.YOUTUBE,
                });
            }

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        if (!code || !state) {
            if (!code) {
                console.error("Missing required query param: code");

                if (state) {
                    const taskId = state ? JSON.parse(decodeURIComponent(state))?.taskId : null;
                    if (taskId) {
                        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                            export_status: ExportStatus.FAILED,
                            export_platform: ExportPlatform.YOUTUBE,
                        });
                    }
                }
            }
            if (!state) console.error("Missing required query param: state");

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        // 2. State에서 데이터 추출
        const stateData = JSON.parse(decodeURIComponent(state));
        const { userId, taskId, seriesId, mode, privacySetting, targetTokenId } = stateData;
        const isAutopilot = mode === 'autopilot';

        // 필수 파라미터 체크: 오토파일럿은 userId만 있으면 됨, 매뉴얼은 taskId/privacySetting 필수
        if (!userId || (!isAutopilot && (!taskId || !privacySetting))) {
            console.error('Missing required query param: userId, taskId, privacySetting');
            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.YOUTUBE,
                });
            }
            return NextResponse.redirect(isAutopilot ? `${originUrl}/workspace/autopilot?seriesId=${seriesId}` : `${originUrl}/workspace/dashboard`);
        }

        // 3. Authorization code를 access_token + refresh_token으로 교환
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_YOUTUBE_CLIENT_ID!,
                client_secret: process.env.GOOGLE_YOUTUBE_CLIENT_SECRET!,
                redirect_uri: `${process.env.BASE_URL}/callback/youtube`,
                grant_type: 'authorization_code',
            }).toString()
        });

        const tokens = await tokenResponse.json();

        if (tokens.error) {
            console.error('Token exchange error:', tokens.error);

            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.YOUTUBE,
                });
            }

            return NextResponse.redirect(isAutopilot ? `${originUrl}/workspace/autopilot?seriesId=${seriesId}` : `${originUrl}/workspace/dashboard`);
        }

        // 4. Supabase에 토큰 저장 (Service Role 사용)
        const expiresAt = new Date(
            Date.now() + tokens.expires_in * 1000
        ).toISOString();

        // [수정] Google 프로필 정보 조회 (유튜브 채널 대신 구글 계정 정보 활용)
        let handleName = null;
        let displayName = null;
        let avatarUrl = null;
        try {
            const profileRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokens.access_token}` }
            });
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                displayName = profileData.name || null;      // 구글 프로필 이름 (예: "이재호")
                handleName = profileData.email || null;       // 구글 이메일 (예: "jaeho@email.com")
                avatarUrl = profileData.picture || null;      // 프로필 이미지 URL
                console.log(`[YouTube Callback] Fetched profile: ${displayName} (${handleName})`);
            }
        } catch (e) {
            console.error('[YouTube Callback] Failed to fetch Google userinfo:', e);
        }

        // --- 3단계 수정 내용 시작 ---
        // (1) 기존 레코드의 ID를 조회 (오토파일럿/수동 업로드 모드 분기 처리)
        let findQuery = supabase
            .from('user_youtube_tokens')
            .select('id')
            .eq('user_id', userId);

        let decryptedTokenId: string | null = null;
        if (!isAutopilot && targetTokenId && targetTokenId !== 'null' && targetTokenId !== 'undefined') {
            try {
                decryptedTokenId = cryptoUtils.decrypt(targetTokenId, userId);
            } catch (e) {
                console.error('[YouTube Callback] Failed to decrypt targetTokenId:', e);
            }
        }

        if (isAutopilot) {
            findQuery = findQuery.eq('series_id', seriesId);
        } else if (decryptedTokenId) {
            findQuery = findQuery.eq('id', decryptedTokenId);
        } else {
            findQuery = findQuery.is('series_id', null);
        }

        const { data: existingRecord } = await findQuery.maybeSingle();

        const tokenPayload = {
            user_id: userId,
            series_id: isAutopilot ? seriesId : null,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expires_at: expiresAt,
            handle_name: handleName,
            display_name: displayName,
            avatar_url: avatarUrl,
            updated_at: new Date().toISOString()
        };

        let dbResult;
        if (existingRecord?.id) {
            // (2) 이미 존재하는 경우: id 기준으로 UPDATE
            dbResult = await supabase
                .from('user_youtube_tokens')
                .update(tokenPayload)
                .eq('id', existingRecord.id)
                .select('id')
                .single();
        } else {
            // (3) 존재하지 않는 경우: INSERT
            dbResult = await supabase
                .from('user_youtube_tokens')
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
                    export_platform: ExportPlatform.YOUTUBE,
                });
            }

            return NextResponse.redirect(isAutopilot ? `${originUrl}/workspace/autopilot?seriesId=${seriesId}` : `${originUrl}/workspace/dashboard`);
        }

        // 5. 모드에 따른 후속 작업 및 리다이렉트
        if (isAutopilot) {
            // 오토파일럿 모드인 경우: 설정 페이지로 리다이렉트
            return NextResponse.redirect(`${originUrl}/workspace/autopilot?seriesId=${seriesId}`);
        }

        // 수동 업로드 모드인 경우: 기존 업로드 트리거 로직 실행
        const finalTokenId = existingRecord?.id || dbResult.data?.id;
        const encryptedTokenId = finalTokenId ? cryptoUtils.encrypt(finalTokenId, userId) : '';
        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${taskId}&privacySetting=${privacySetting}&tokenId=${encryptedTokenId}`, {
            method: 'POST',
        });

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            export_status: ExportStatus.UPLOADING,
            export_platform: ExportPlatform.YOUTUBE,
        });

        return NextResponse.redirect(`${originUrl}/workspace/dashboard`);

    } catch (error) {
        console.error('YouTube callback error:', error);
        return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
    }
}
