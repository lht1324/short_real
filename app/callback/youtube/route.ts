// app/api/callback/youtube/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { waitUntil } from '@vercel/functions'
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {ExportResult} from "@/components/page/workspace/dashboard/ExportResult";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";

export async function GET(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // 1. 에러 확인
        if (error) {
            console.log("1")
            console.error(error);
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        if (!code || !state) {
            console.log("2")
            if (!code) console.error("Missing required query param: code");
            if (!state) console.error("Missing required query param: state");

            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        // 2. State에서 userId 추출
        const { userId, taskId } = JSON.parse(decodeURIComponent(state));

        if (!userId || !taskId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Missing required query param: userId, taskId'
            });
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
            console.log("3")
            console.error('Token exchange error:', tokens.error);
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
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
            return NextResponse.redirect(
                `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
            );
        }

        internalFireAndForgetFetch(`${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${taskId}`, {
            method: 'POST',
        }, {
            userId: userId,
        });

        // 5. 성공 리다이렉트
        return NextResponse.redirect(
            // `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.SUCCESS}`
            `http://localhost:3000/workspace/dashboard?export-result=${ExportResult.SUCCESS}`
        );

    } catch (error) {
        console.log("4")
        console.error('YouTube callback error:', error);
        return NextResponse.redirect(
            `${request.nextUrl.origin}/workspace/dashboard?export-result=${ExportResult.ERROR}`
        );
    }
}
