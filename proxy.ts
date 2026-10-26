import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuth } from '@/lib/auth/server';
import { getNeonDb } from '@/lib/db/neon';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

/**
 * 로그인 가드 — Neon Auth 세션으로 판정 (Supabase에서 이관).
 * getSession이 edge/proxy에서 깨지면 auth.middleware로 폴백할 것.
 */
export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname;

    // 1. /admin 하위 경로 보호
    if (path.startsWith('/admin')) {
        const secretParam = request.nextUrl.searchParams.get('secret');
        const adminSecretKey = process.env.ADMIN_SECRET_KEY;

        // secret 파라미터가 없거나, 환경 변수 값과 다르면 메인으로 리다이렉트
        if (!secretParam || secretParam !== adminSecretKey) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    // 2. 세션 검사 및 라우팅 보호 — Neon Auth 세션 (Better Auth ID는 UUID가 아니라 email 브릿지로 판단)
    const auth = getAuth();
    const { data: session } = await auth.getSession();
    const user = session?.user ?? null;

    if (path.startsWith('/sign-in')) {
        if (user) {
            return NextResponse.redirect(new URL('/workspace/dashboard', request.url));
        }
        return NextResponse.next();
    }

    // 3. /workspace 하위 경로 보호 (구독 플랜 확인 — Neon users 테이블)
    if (path.startsWith('/workspace')) {
        if (!user || !user.email) {
            const signInUrl = new URL('/sign-in', request.url);
            signInUrl.searchParams.set('redirectTo', path);
            return NextResponse.redirect(signInUrl);
        }

        const db = getNeonDb();
        const [userData] = await db
            .select({ plan: users.plan })
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

        if (!userData?.plan || userData.plan === 'none') {
            return NextResponse.redirect(new URL('/profile', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    // 미들웨어가 실행될 경로 지정
    matcher: [
        '/admin/:path*',    // /admin 및 그 하위 모든 경로
        '/sign-in',         // 로그인 페이지
        '/workspace/:path*', // /workspace 및 그 하위 모든 경로
    ],
};
