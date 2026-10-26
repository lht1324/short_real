import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import dummyIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/dummy-incremental-cache";

/**
 * OpenNext Cloudflare 빌드 설정 — 필수 파일 (없으면 빌드 자체가 실패).
 *
 * incrementalCache = ISR/SSG 라우트 캐시용. short_real은 SSG 라우트가 0건
 * (generateStaticParams·getStaticProps 없음 — 전부 동적 라우트 또는 정적 에셋),
 * TailoredAd와 달리 ISR·revalidate 라우트 캐시 의존도 없어 기본(dummy) 캐시로 시작.
 *
 * 주의: dummy 캐시는 ●(SSG) 라우트를 서빙 못 한다 (TailoredAd 실측 — /blog/[slug] 404).
 * 추후 SSG·ISR 라우트를 추가하게 되면 staticAssetsIncrementalCache 또는 R2 캐시로 교체:
 *   import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";
 */
export default defineCloudflareConfig({
    incrementalCache: dummyIncrementalCache,
});
