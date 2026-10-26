import { NextRequest } from "next/server";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { dispatchC2S, PUBLIC_ROUTE_PATHS } from "@/lib/api/internalDispatch";

/**
 * Client Gateway — C2S 전용 인증 브릿지.
 *
 * [역할]
 * 1. 브라우저의 모든 API 호출이 반드시 통과하는 단일 입구 (baseFetch가 /api/* → ?path= 로 감쌈)
 * 2. 쿠키 세션 검증 (getIsValidRequestC2S) + userId 쿼리 주입
 *    → 라우트의 S2S 가드가 그대로 동작 (외부 직접 호출 차단)
 *
 * [전달 수단 — in-process 직접 호출]
 * fetch 프록시(외부 도메인 재발사)는 터널 왕복 비용·단절 의존이 있고, CF Workers 이관 시
 * 자기 zone 재진입(inner invocation)이 금지되어 동작 불가(실측).
 * 디스패치 로직은 lib/api/internalDispatch.ts로 분리 — S2S(FnF)와 같은 테이블을 공유한다.
 * new NextRequest("http://internal...")는 네트워크 주소가 아니라 생성자 형식 요건을 채우는 껍데기.
 *
 * [운영 부담] — 새 라우트 추가 시 internalDispatch.ts의 테이블에 1줄 필수 (누락 시 404).
 */

async function handleGatewayRequest(request: NextRequest) {
    const method = request.method;
    const { searchParams } = new URL(request.url);
    const targetPath = searchParams.get('path'); // e.g., "/api/roadmap"

    if (!targetPath) {
        return getNextBaseResponse({ success: false, status: 400, error: "Missing 'path' param." });
    }

    // 1. Check if the route is public
    const isPublic = PUBLIC_ROUTE_PATHS.some(route =>
        route.method === method && route.path === targetPath
    );

    // 2. Authenticate Session (Always attempt, but enforce only if not public)
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!(isPublic || (isValidRequest && user))) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized: Sign-in required."
        });
    }

    // 3. Inject userId (provide empty string if anonymous but public)
    const userId = user?.id || "";

    // 4. Inject userId into Query (dispatch로 전달)
    const internalParams = new URLSearchParams(searchParams);
    internalParams.delete('path');

    if (!isPublic) {
        internalParams.set('userId', userId); // Always provide userId for internal consumption
    }

    try {
        // 5. in-process 디스패치 — C2S 테이블(S2S 전용 경로는 차단)
        return await dispatchC2S(
            method,
            targetPath,
            request,
            Object.fromEntries(internalParams.entries()),
        );
    } catch (error) {
        console.error(`[Gateway Error] ${method} ${targetPath}:`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: "Gateway failed to dispatch the request."
        });
    }
}

export const GET = handleGatewayRequest;
export const POST = handleGatewayRequest;
export const PATCH = handleGatewayRequest;
export const PUT = handleGatewayRequest;
export const DELETE = handleGatewayRequest;
