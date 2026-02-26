// app/api/callback/youtube/route.ts
import {NextRequest, NextResponse} from 'next/server';
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {ExportPlatform, ExportStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";


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

            const taskId = state ? JSON.parse(state)?.taskId : null;
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
                    const taskId = state ? JSON.parse(state)?.taskId : null;
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

        // 2. State에서 userId 추출
        const { userId, taskId } = JSON.parse(decodeURIComponent(state));

        if (!userId || !taskId) {
            console.error('Missing required query param: userId, taskId');
            if (taskId) {
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });
            }
            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
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

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        // 4. Supabase에 토큰 저장 (Service Role 사용)
        const expiresAt = new Date(
            Date.now() + tokens.expires_in * 1000
        ).toISOString();

        const { error: dbError } = await supabase
            .from('user_youtube_tokens')
            .upsert({
                user_id: userId,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                expires_at: expiresAt,
                updated_at: new Date().toISOString()
            });

        if (dbError) {
            console.error('Database error:', dbError);

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return NextResponse.redirect(`${originUrl}/workspace/dashboard`);
        }

        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${taskId}`, {
            method: 'POST',
        }, {
            userId: userId,
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
