import {NextRequest, NextResponse} from 'next/server'
import {usersServerAPI} from '@/lib/api/server/usersServerAPI'
import { getAuth } from "@/lib/auth/server";
import {SubscriptionPlan, User} from "@/lib/api/types/supabase/Users";

/**
 * OAuth 귀환 처리 — Managed Auth가 소셜 교환을 끝낸 뒤 여기로 보낸다.
 * 세션 email 기준 find-or-create (Better Auth ID는 UUID가 아니라 users.id로 못 씀).
 * 기존 행 재사용이라 잔액·이력·플랜 상태가 그대로 이어진다.
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const redirectTo = searchParams.get('redirectTo');

        const auth = getAuth();
        const { data: session } = await auth.getSession();

        const authUser = session?.user ?? null;
        const email = authUser?.email ?? null;
        if (!authUser || !email) {
            // verifier 미교환 상태 — 서버 쿠키에 세션이 아직 없음.
            // 쿼리(verifier 포함) 유지한 채 클라 세션 페이지로 넘기면
            // SDK가 verifier를 교환(쿠키 설정)한 뒤 여기로 복귀한다.
            const origin = process.env.NODE_ENV === 'production' ? request.url : "http://localhost:3000";
            return NextResponse.redirect(
                new URL(`/callback/session?${request.nextUrl.searchParams.toString()}`, origin),
            );
        }

        let user: User | null = await usersServerAPI.getUserByEmail(email);
        if (user === null) {
            const fullName = authUser.name ?? "";
            user = await usersServerAPI.postUsers({
                email,
                name: fullName,
                avatar_url: authUser.image ?? '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
        }

        if (!user) {
            throw Error("User is invalid");
        }

        const redirectPath = redirectTo
            ? redirectTo === "pricing"
                ? "/#pricing"
                : "/profile"
            : !user.plan || user.plan === SubscriptionPlan.NONE
                ? "/profile"
                : "/workspace/dashboard"

        return NextResponse.redirect(new URL(redirectPath, process.env.NODE_ENV === 'production' ? request.url : "http://localhost:3000"))
    } catch (error) {
        console.error('Unexpected auth callback error:', error)
        return NextResponse.redirect(new URL('/sign-in?error=oauth_failed', request.url))
    }
}
