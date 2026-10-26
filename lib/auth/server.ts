import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * Neon Auth(Managed Better Auth) 서버 싱글톤.
 * neon.ts·r2.ts와 동일 패턴: process.env 인라인 체크 후 throw.
 * 클라 번들에서는 호출 금지 — 클라는 `@/lib/auth/client`의 authClient 사용.
 */
let cached: ReturnType<typeof createNeonAuth> | null = null;

export function getAuth(): ReturnType<typeof createNeonAuth> {
    if (!process.env.NEON_AUTH_BASE_URL || !process.env.NEON_AUTH_COOKIE_SECRET) {
        throw new Error('Neon Auth environment variables are not set.')
    }
    if (!cached) {
        cached = createNeonAuth({
            baseUrl: process.env.NEON_AUTH_BASE_URL,
            cookies: { secret: process.env.NEON_AUTH_COOKIE_SECRET },
        });
    }
    return cached;
}
