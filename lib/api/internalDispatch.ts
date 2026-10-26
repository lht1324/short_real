import { NextRequest, NextResponse } from "next/server";

/**
 * in-process 라우트 디스패처 — client-gateway와 internalFireAndForgetFetch가 공유.
 *
 * [왜 존재하는가] CF Workers는 isolate 안에서 자기 zone(공개 URL)을 fetch하면 금지(inner
 * invocation — TailoredAd 실측 사망). 그래서 "같은 워커 안의 라우트 간 호출"은 네트워크가
 * 아니라 함수 직접 호출로 전환해야 한다. 라우트 테이블을 여기서 1원으로 관리해 gateway(C2S)
 * 와 FnF(S2S)가 같은 테이블을 쓴다.
 *
 * [new NextRequest("http://internal...")] — 네트워크 주소가 아니라 NextRequest 생성자가
 * URL 형식을 요구하는 껍데기. 실제 fetch는 일어나지 않는다.
 *
 * [운영 규칙] 새 라우트를 gateway 경유(클라)나 FnF(서버)로 노출하면 ROUTE_ENTRIES에 1줄 필수.
 * 누락 시 404. (컴파일타임 강제 불가 — 리뷰 룰)
 */

type RouteHandler = (
    req: NextRequest,
    ctx: { params: Promise<Record<string, string>> },
) => Promise<Response>;

type RouteModule = Record<string, unknown>;
interface RouteEntry {
    method: string;
    pattern: string[];
    load: () => Promise<RouteModule>;
}

// 고정 경로는 파라미터(:userId)보다 먼저 — 먼저 매칭된 쪽이 이긴다.
// scope: 'c2s' = 브라우저 경유만, 's2s' = 서버 FnF 경유만, 양쪽 허용이면 둘 다 일치시킨다.
const ROUTE_ENTRIES: RouteEntry[] = [
    // ai-model-data
    { method: 'GET', pattern: ['api', 'ai-model-data'], load: () => import("@/app/api/ai-model-data/route") },

    // autopilot-data
    { method: 'POST', pattern: ['api', 'autopilot-data'], load: () => import("@/app/api/autopilot-data/route") },
    { method: 'GET', pattern: ['api', 'autopilot-data', 'platform-connection'], load: () => import("@/app/api/autopilot-data/platform-connection/route") },
    { method: 'DELETE', pattern: ['api', 'autopilot-data', 'platform-connection'], load: () => import("@/app/api/autopilot-data/platform-connection/route") },
    { method: 'GET', pattern: ['api', 'autopilot-data', 'series', ':seriesId'], load: () => import("@/app/api/autopilot-data/series/[seriesId]/route") },
    { method: 'PATCH', pattern: ['api', 'autopilot-data', 'series', ':seriesId'], load: () => import("@/app/api/autopilot-data/series/[seriesId]/route") },
    { method: 'DELETE', pattern: ['api', 'autopilot-data', 'series', ':seriesId'], load: () => import("@/app/api/autopilot-data/series/[seriesId]/route") },
    { method: 'GET', pattern: ['api', 'autopilot-data', 'user', ':userId'], load: () => import("@/app/api/autopilot-data/user/[userId]/route") },
    { method: 'PATCH', pattern: ['api', 'autopilot-data', 'user', ':userId'], load: () => import("@/app/api/autopilot-data/user/[userId]/route") },
    { method: 'DELETE', pattern: ['api', 'autopilot-data', 'user', ':userId'], load: () => import("@/app/api/autopilot-data/user/[userId]/route") },

    // image
    { method: 'GET', pattern: ['api', 'image'], load: () => import("@/app/api/image/route") },
    { method: 'POST', pattern: ['api', 'image', 'regenerate'], load: () => import("@/app/api/image/regenerate/route") },

    // music
    { method: 'GET', pattern: ['api', 'music', 'data'], load: () => import("@/app/api/music/data/route") },

    // open-ai (스크립트·씬 생성 — 생성 플로우 첫 단계)
    { method: 'POST', pattern: ['api', 'open-ai', 'script'], load: () => import("@/app/api/open-ai/script/route") },
    { method: 'POST', pattern: ['api', 'open-ai', 'scene'], load: () => import("@/app/api/open-ai/scene/route") },

    // polar (과금)
    { method: 'POST', pattern: ['api', 'polar', 'checkouts'], load: () => import("@/app/api/polar/checkouts/route") },
    { method: 'GET', pattern: ['api', 'polar', 'orders'], load: () => import("@/app/api/polar/orders/route") },
    { method: 'GET', pattern: ['api', 'polar', 'products'], load: () => import("@/app/api/polar/products/route") },
    { method: 'GET', pattern: ['api', 'polar', 'subscriptions'], load: () => import("@/app/api/polar/subscriptions/route") },
    { method: 'DELETE', pattern: ['api', 'polar', 'subscriptions', 'cancel'], load: () => import("@/app/api/polar/subscriptions/cancel/route") },
    { method: 'POST', pattern: ['api', 'polar', 'subscriptions', 'change'], load: () => import("@/app/api/polar/subscriptions/change/route") },

    // roadmap
    { method: 'GET', pattern: ['api', 'roadmap'], load: () => import("@/app/api/roadmap/route") },
    { method: 'POST', pattern: ['api', 'roadmap'], load: () => import("@/app/api/roadmap/route") },
    { method: 'DELETE', pattern: ['api', 'roadmap', ':roadmapItemId'], load: () => import("@/app/api/roadmap/[roadmapItemId]/route") },
    { method: 'PATCH', pattern: ['api', 'roadmap', ':roadmapItemId'], load: () => import("@/app/api/roadmap/[roadmapItemId]/route") },

    // user
    { method: 'GET', pattern: ['api', 'user', 'by-email'], load: () => import("@/app/api/user/by-email/route") },
    { method: 'GET', pattern: ['api', 'user', ':userId'], load: () => import("@/app/api/user/[userId]/route") },
    { method: 'PATCH', pattern: ['api', 'user', ':userId'], load: () => import("@/app/api/user/[userId]/route") },
    { method: 'PATCH', pattern: ['api', 'user', ':userId', 'api-key'], load: () => import("@/app/api/user/[userId]/api-key/route") },
    { method: 'GET', pattern: ['api', 'user', ':userId', 'social-channels'], load: () => import("@/app/api/user/[userId]/social-channels/route") },
    { method: 'DELETE', pattern: ['api', 'user', ':userId', 'social-channels'], load: () => import("@/app/api/user/[userId]/social-channels/route") },

    // video
    { method: 'POST', pattern: ['api', 'video'], load: () => import("@/app/api/video/route") },
    { method: 'POST', pattern: ['api', 'video', 'merge', 'final'], load: () => import("@/app/api/video/merge/final/route") },
    { method: 'POST', pattern: ['api', 'video', 'regenerate'], load: () => import("@/app/api/video/regenerate/route") },
    { method: 'POST', pattern: ['api', 'video', 'task'], load: () => import("@/app/api/video/task/route") },
    { method: 'GET', pattern: ['api', 'video', 'task', 'user', ':userId'], load: () => import("@/app/api/video/task/user/[userId]/route") },
    { method: 'GET', pattern: ['api', 'video', 'task', ':taskId'], load: () => import("@/app/api/video/task/[taskId]/route") },
    { method: 'PATCH', pattern: ['api', 'video', 'task', ':taskId'], load: () => import("@/app/api/video/task/[taskId]/route") },
    { method: 'DELETE', pattern: ['api', 'video', 'task', ':taskId'], load: () => import("@/app/api/video/task/[taskId]/route") },
    { method: 'POST', pattern: ['api', 'video', 'task', ':taskId', 'retry'], load: () => import("@/app/api/video/task/[taskId]/retry/route") },
    { method: 'GET', pattern: ['api', 'video', 'task', ':taskId', 'urls'], load: () => import("@/app/api/video/task/[taskId]/urls/route") },
    { method: 'GET', pattern: ['api', 'video', 'url', 'final'], load: () => import("@/app/api/video/url/final/route") },
    { method: 'GET', pattern: ['api', 'video', 'url', 'voice'], load: () => import("@/app/api/video/url/voice/route") },

    // voice
    { method: 'GET', pattern: ['api', 'voice'], load: () => import("@/app/api/voice/route") },
    { method: 'GET', pattern: ['api', 'voice', 'url'], load: () => import("@/app/api/voice/url/route") },
];

// S2S(FnF) 전용 라우트 — 클라는 절대 호출하지 않는다 (파이프라인 내부 전용).
// gateway(C2S) 테이블과 분리한 이유: 클라가 S2S 전용 경로를 직접 치는 것을 구조적으로 차단.
const S2S_ROUTE_ENTRIES: RouteEntry[] = [
    // 파이프라인 체인 (FnF로 호출)
    { method: 'POST', pattern: ['api', 'video', 'process', 'master-style'], load: () => import("@/app/api/video/process/master-style/route") },
    { method: 'POST', pattern: ['api', 'video', 'process', 'image'], load: () => import("@/app/api/video/process/image/route") },
    { method: 'POST', pattern: ['api', 'video', 'process', 'video'], load: () => import("@/app/api/video/process/video/route") },
    { method: 'POST', pattern: ['api', 'video', 'process', 'speed'], load: () => import("@/app/api/video/process/speed/route") },
    { method: 'POST', pattern: ['api', 'video', 'process', 'speed', 'regenerate'], load: () => import("@/app/api/video/process/speed/regenerate/route") },
    { method: 'POST', pattern: ['api', 'music'], load: () => import("@/app/api/music/route") },
    { method: 'POST', pattern: ['api', 'music', 'upload'], load: () => import("@/app/api/music/upload/route") },

    // 재생성 연쇄
    { method: 'POST', pattern: ['api', 'image', 'regenerate', 'process'], load: () => import("@/app/api/image/regenerate/process/route") },
    { method: 'POST', pattern: ['api', 'video', 'regenerate', 'process'], load: () => import("@/app/api/video/regenerate/process/route") },

    // export 업로드 (OAuth 콜백·autopilot에서 FnF)
    { method: 'POST', pattern: ['api', 'video', 'export', 'youtube', 'upload'], load: () => import("@/app/api/video/export/youtube/upload/route") },
    { method: 'POST', pattern: ['api', 'video', 'export', 'tiktok', 'upload'], load: () => import("@/app/api/video/export/tiktok/upload/route") },

    // autopilot 파이프라인 (trigger.dev → FnF)
    { method: 'POST', pattern: ['api', 'autopilot', 'video-metadata'], load: () => import("@/app/api/autopilot/video-metadata/route") },
    { method: 'POST', pattern: ['api', 'autopilot', 'music'], load: () => import("@/app/api/autopilot/music/route") },
    { method: 'POST', pattern: ['api', 'autopilot', 'test', 'music'], load: () => import("@/app/api/autopilot/test/music/route") },
];

function matchRoute(
    method: string,
    targetPath: string,
    tables: RouteEntry[][],
): { entry: RouteEntry; params: Record<string, string> } | null {
    const segs = targetPath.split('/').filter((s) => s.length > 0);
    for (const table of tables) {
        for (const r of table) {
            if (r.method !== method || r.pattern.length !== segs.length) continue;
            const params: Record<string, string> = {};
            let ok = true;
            for (let i = 0; i < segs.length; i++) {
                const p = r.pattern[i];
                if (p.startsWith(':')) {
                    params[p.slice(1)] = decodeURIComponent(segs[i]);
                } else if (p !== segs[i]) {
                    ok = false;
                    break;
                }
            }
            if (ok) return { entry: r, params };
        }
    }
    return null;
}

async function dispatch(
    method: string,
    targetPath: string,
    tables: RouteEntry[][],
    request: NextRequest,
    extraQuery?: Record<string, string>,
): Promise<Response> {
    const matched = matchRoute(method, targetPath, tables);
    if (!matched) {
        return NextResponse.json(
            { success: false, status: 404, error: `No internal route for ${method} ${targetPath}.` },
            { status: 404 },
        );
    }

    const at = (mod: RouteModule, key: string): RouteHandler | undefined =>
        typeof mod[key] === 'function' ? (mod[key] as RouteHandler) : undefined;
    const handler = at(await matched.entry.load(), method);
    if (!handler) {
        return NextResponse.json(
            { success: false, status: 404, error: `No handler for ${method} ${targetPath}.` },
            { status: 404 },
        );
    }

    const headers = new Headers(request.headers);
    headers.set(
        "x-internal-secret",
        process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET ?? '',
    );
    headers.delete("content-length"); // body 재조립 시 길이 불일치 방지

    // URL 합성 — extraQuery는 gateway의 userId 주입 / FnF의 body→query 등에 사용
    const url = new URL(request.url);
    const internalParams = new URLSearchParams(url.searchParams);
    if (extraQuery) {
        for (const [k, v] of Object.entries(extraQuery)) internalParams.set(k, v);
    }
    const queryString = internalParams.toString();

    const hasBody = method !== 'GET' && method !== 'HEAD';
    const internalReq = new NextRequest(
        `http://internal${targetPath}${queryString ? `?${queryString}` : ""}`,
        {
            method,
            headers,
            body: hasBody ? await request.arrayBuffer() : undefined,
        },
    );

    return handler(internalReq, { params: Promise.resolve(matched.params) });
}

/**
 * C2S 디스패치 — client-gateway 전용. 클라 테이블만 매칭 (S2S 전용 경로 차단).
 */
export async function dispatchC2S(
    method: string,
    targetPath: string,
    request: NextRequest,
    extraQuery?: Record<string, string>,
): Promise<Response> {
    return dispatch(method, targetPath, [ROUTE_ENTRIES], request, extraQuery);
}

/**
 * S2S 디스패치 — internalFireAndForgetFetch 전용. FnF 테이블 + 클라 테이블 모두 허용
 * (파이프라인이 클라용 라우트를 재사용하는 경우 — 예: video/task retry → merge/final).
 */
export async function dispatchS2S(
    method: string,
    targetPath: string,
    request: NextRequest,
    extraQuery?: Record<string, string>,
): Promise<Response> {
    return dispatch(method, targetPath, [S2S_ROUTE_ENTRIES, ROUTE_ENTRIES], request, extraQuery);
}

/** gateway가 PUBLIC_ROUTES 판정에 쓰는 상수 재노출 */
export const PUBLIC_ROUTE_PATHS: { method: string; path: string }[] = [
    { method: "GET", path: "/api/polar/products" },
    { method: "GET", path: "/api/roadmap" },
    { method: "GET", path: "/api/voice" },
    { method: "GET", path: "/api/ai-model-data" },
];
