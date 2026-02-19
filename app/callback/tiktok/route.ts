// app/api/callback/tiktok/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { ExportResult } from '@/components/page/workspace/dashboard/ExportResult';
import { internalFireAndForgetFetch } from '@/utils/internalFetch';

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // 1. 에러 확인
        if (error) {
            console.error('TikTok OAuth error:', error);
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        if (!code || !state) {
            if (!code) console.error('Missing required query param: code');
            if (!state) console.error('Missing required query param: state');
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        // 2. 쿠키에서 state, taskId, userId 추출 및 검증
        const cookieStore = await cookies();
        const raw = cookieStore.get('tiktok_oauth')?.value;

        if (!raw) {
            console.error('Missing tiktok_oauth cookie');
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        const { state: savedState, taskId, userId } = JSON.parse(raw);
        cookieStore.delete('tiktok_oauth');

        if (state !== savedState || !taskId || !userId) {
            console.error('Invalid state or missing taskId/userId');
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
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
                redirect_uri: `${process.env.BASE_URL}/api/callback/tiktok`,
            }).toString(),
        });

        const tokens = await tokenResponse.json();

        if (!tokens.access_token) {
            console.error('TikTok token exchange error:', tokens);
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        // 4. Supabase에 토큰 저장
        const supabase = await createSupabaseServer();
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
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        // 5. 업로드 트리거
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video/export/tiktok/upload?taskId=${taskId}`,
            { method: 'POST' },
            { userId }
        );

        // 6. 성공 리다이렉트
        return NextResponse.redirect(
            `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.SUCCESS}`
        );

    } catch (error) {
        console.error('TikTok callback error:', error);
        return NextResponse.redirect(
            `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
        );
    }
}