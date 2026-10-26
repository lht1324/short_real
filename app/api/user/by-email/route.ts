import { NextRequest } from "next/server";
import { usersServerAPI } from "@/lib/api/server/usersServerAPI";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";

// 세션 본인의 프로필 행 조회 — GET /api/user/by-email?email=
// C2S 세션 검증 + email이 세션 본인 것과 일치해야만 응답 (타인 조회 차단).
// Better Auth ID는 UUID가 아니라 ID 직조회 불가 → email 브릿지.
export async function GET(request: NextRequest) {
    const { user, isValidRequest } = await getIsValidRequestC2S();

    if (!isValidRequest || !user) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized.',
        });
    }

    try {
        const email = request.nextUrl.searchParams.get('email') ?? '';
        if (!email) {
            return getNextBaseResponse({ success: false, status: 400, error: 'Missing email.' });
        }

        // 세션 유저의 email과 요청 email이 다르면 타인 정보 — 존재 여부도 숨기고 null
        if (user.email !== email) {
            return getNextBaseResponse({ success: true, status: 200, data: { user: null } });
        }

        return getNextBaseResponse({ success: true, status: 200, data: { user } });
    } catch (error) {
        console.error('[api/user/by-email] failed:', error);
        return getNextBaseResponse({ success: false, status: 500, error: 'Failed to load profile.' });
    }
}
