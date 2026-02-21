import { NextRequest, NextResponse } from 'next/server';
import { internalFireAndForgetFetch } from '@/utils/internalFetch';
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {ExportStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {ExportPlatform} from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";

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

        // 2. 쿠키에서 state, taskId, userId 추출 및 검증
        const { taskId, userId } = JSON.parse(state);

        if (!taskId || !userId) {
            console.error('Invalid token or missing taskId/userId');
            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });
            }
            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
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

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        // 4. Supabase에 토큰 저장
        const supabase = createSupabaseServiceRoleClient();
        const { error: dbError } = await supabase
            .from('user_tiktok_tokens')
            .upsert({
                user_id: userId,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                refresh_expires_at: new Date(Date.now() + tokens.refresh_expires_in * 1000).toISOString(),
                tiktok_user_id: tokens.open_id,
                updated_at: new Date().toISOString(),
                last_used_at: new Date().toISOString(),
            });

        if (dbError) {
            console.error('Database error:', dbError);

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        // 5. 업로드 트리거
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video/export/tiktok/upload?taskId=${taskId}`,
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

        return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
    }
}