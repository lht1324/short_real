import { NextRequest } from "next/server";
import { dispatchS2S } from "@/lib/api/internalDispatch";

/**
 * Fire-and-forget — 서버 내부 라우트 체이닝 (파이프라인 전용).
 *
 * [역사] 이 함수 때문에 client-gateway가 생겼다 — 모든 엔드포인트를 FnF로 묶은 파이프라인을
 * 만들다 보니 "이 구조 좋다"가 되어 단일 진입점화. 원래는 URL fetch 방식이었으나:
 *
 * [Workers 전환] CF Workers는 isolate 안에서 자기 zone(공개 URL) fetch가 금지(inner
 * invocation — TailoredAd 실측 사망). 그래서 URL 문자열은 유지하되 내부에서 파싱해
 * in-process 핸들러 직접 호출로 전환했다. **호출부 23곳은 무수정** — URL을 그대로 넘긴다.
 *
 * [waitUntil] Workers에서는 응답 후 isolate가 회수될 수 있어 백그라운드 작업이 도중에
 * 죽는다. getCloudflareContext().ctx.waitUntil(promise)로 실행 보장. 로컬(Node)은
 * 컨텍스트가 없어 폴백 — 그냥 실행되고 보장만 생략 (@opennextjs/cloudflare 설치 시 자동 활성).
 *
 * [범위] 대상은 전부 자기 API (외부 서비스 fetch가 아님 — 금지 규칙은 "자기 zone"뿐이고
 * 이 함수는 애초에 자기 API 전용).
 *
 * [차단] 클라가 이 경로로 노출되지 않게 S2S 전용 라우트는 gateway 테이블에 없다.
 * x-internal-secret 헤더는 그대로 부착 — 라우트의 S2S 가드가 동작.
 */
export async function internalFireAndForgetFetch(url: string, options: RequestInit = {}, body?: unknown): Promise<void> {
    const method = options.method ?? "POST";

    // URL 파싱 — 호출부는 BASE_URL+path 형태를 그대로 넘긴다. path와 query만 추출하면
    // 오리진(BASE_URL·localhost·터널)이 무엇이든 무관하게 in-process로 처리된다.
    let pathWithQuery: string;
    try {
        const parsed = new URL(url);
        pathWithQuery = `${parsed.pathname}${parsed.search}`;
    } catch {
        // 상대 경로(/api/...)가 오면 그대로 사용
        pathWithQuery = url;
    }

    const headers = new Headers(options.headers);
    headers.set("x-internal-secret", process.env.INTERNAL_FIRE_AND_FORGET_API_SECRET ?? '');
    if (!headers.has("Content-Type") && body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    const fetchPromise = (async () => {
        try {
            const req = new NextRequest(`http://internal${pathWithQuery}`, {
                method,
                headers,
                body: body !== undefined ? JSON.stringify(body, null, 2) : undefined,
            });

            const response = await dispatchS2S(method, new URL(`http://internal${pathWithQuery}`).pathname, req);

            if (!response.ok) {
                // FnF라 호출부가 없다 — 실패는 로그로만 가시화 (파이프라인 상태는 DB가 진실)
                const text = await response.text().catch(() => '');
                console.error(`[Internal Dispatch Error] ${method} ${pathWithQuery}: ${response.status} ${text.slice(0, 200)}`);
            }
        } catch (error) {
            console.error(`[Internal Dispatch Error] ${method} ${pathWithQuery}:`, error);
        }
    })();

    // waitUntil — Workers에서 isolate 수명 연장 (로컬은 no-op 폴백)
    await attachWaitUntil(fetchPromise);
}

async function attachWaitUntil(promise: Promise<void>): Promise<void> {
    try {
        // @opennextjs/cloudflare 설치 시 자동 활성. 미설치 환경(현재 로컬)은 import 실패로 폴백.
        const { getCloudflareContext } = await import("@opennextjs/cloudflare");
        const { ctx } = await getCloudflareContext();
        ctx.waitUntil(promise);
    } catch {
        // 로컬 Node 런타임 — 컨텍스트 없음. fetch 자체는 이미 실행 중이므로 그냥 두면 된다.
        // 보장(waitUntil)만 생략. 로컬 dev 서버는 프로세스가 살아있어 FnF도 완료된다.
        await promise.catch(() => {}); // 로컬에서는 완료를 기다리지 않고 유실만 방지
    }
}
