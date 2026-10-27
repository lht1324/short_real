/**
 * short-real-cron — Vercel Cron(vercel.json) 대체 스케줄러 워커.
 *
 * Vercel을 내리면 `0 * * * *` 다운그레이드 크론이 사라지므로 본 워커로 대체한다.
 * 대상: GET https://shortreal.ai/api/polar/subscriptions/cron
 *   - Polar 구독 만료 예정 유저의 다운그레이드를 실행하는 기존 엔드포인트 그대로 재사용.
 *   - 인증: Bearer CRON_SECRET (본 워커의 Secret 바인딩, 값은 기존 Vercel/Workers와 동일)
 *
 * 이 워커는 라우트를 점유하지 않는다(스케줄 트리거 전용).
 * shortreal.ai가 Vercel에 물려있는 동안엔 Vercel을, 컷오버 후엔 short-real Workers를 친다.
 *
 * 수동 테스트: GET https://<cron-worker>.workers.dev/__run?secret=<CRON_SECRET>
 *   - 스케줄 핸들러와 동일 로직을 1회 실행. secret 불일치 시 401.
 *   - 엔드포인트 오픈을 위한 길이 아니라 검증 전용 — 사용 후 방치해도 secret 없으면 동작 불가.
 */
export default {
    async scheduled(controller, env, ctx) {
        await onCronTick(env);
    },

    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        if (url.pathname !== '/__run') {
            return new Response('Not Found', { status: 404 });
        }
        if (!env.CRON_SECRET || url.searchParams.get('secret') !== env.CRON_SECRET) {
            return new Response('Unauthorized', { status: 401 });
        }
        const result = await onCronTick(env);
        return new Response(JSON.stringify(result), {
            status: result.ok ? 200 : 502,
            headers: { 'content-type': 'application/json' },
        });
    },
};

async function onCronTick(env) {
    const target = env.TARGET_URL;
    if (!target) {
        console.error('[cron] TARGET_URL is not set');
        return { ok: false, status: 0, detail: 'TARGET_URL missing' };
    }
    try {
        const res = await fetch(target, {
            method: 'GET',
            headers: {
                'authorization': `Bearer ${env.CRON_SECRET}`,
            },
        });
        console.log(`[cron] GET ${target} -> ${res.status}`);
        if (!res.ok) {
            const body = await res.text();
            console.error(`[cron] failed: ${res.status} ${body.slice(0, 500)}`);
            return { ok: false, status: res.status, detail: body.slice(0, 500) };
        }
        return { ok: true, status: res.status };
    } catch (e) {
        console.error('[cron] exception:', String(e));
        return { ok: false, status: 0, detail: String(e) };
    }
}
