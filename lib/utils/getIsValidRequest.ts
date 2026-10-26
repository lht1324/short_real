import { getAuth } from "@/lib/auth/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";

export async function getIsValidRequestC2S() {
    // 세션 → email → 우리 users 행. 게이트웨이에 주입되는 userId는 우리 UUID라
    // 하류(IDOR 대조·DB 조회)가 그대로 동작한다.
    // 안전망: 세션 유효한데 행 없음 (콜백 미경유) → 최소 행 생성 후 유효.
    const auth = getAuth();
    const { data: session } = await auth.getSession();
    const authUser = session?.user ?? null;
    const email = authUser?.email ?? null;
    if (!authUser || !email) {
        return { user: null, isValidRequest: false };
    }

    let user = await usersServerAPI.getUserByEmail(email);
    if (!user) {
        const created = await usersServerAPI.postUsers({
            email,
            name: authUser.name ?? '',
            avatar_url: authUser.image ?? '',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        user = created ?? await usersServerAPI.getUserByEmail(email);
    }

    return {
        user,
        isValidRequest: user !== null
    }
}

export function getIsValidRequestS2S(request: Request) {
    const secret = request.headers.get('x-internal-secret');

    return secret === process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET;
}
