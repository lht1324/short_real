import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

/**
 * OpenNext Cloudflare 빌드 설정 — 필수 파일 (없으면 빌드 자체가 실패).
 *
 * incrementalCache = ISR/SSG 라우트 캐시용. short_real은 SSG 라우트가 0건
 * (generateStaticParams·getStaticProps 없음 — 전부 동적 라우트 또는 정적 에셋).
 *
 * static-assets 오버라이드 선택: 빌드가 .open-next/cache → assets/cdn-cgi/_next_cache로
 * 복사하고 워커가 ASSETS 바인딩으로 읽는다 — R2·KV 버킷 불필요 (TailoredAd 동일 구성).
 * 제약: 읽기 전용 — ISR/SSG 라우트를 추가하게 되면 R2 캐시(kv-incremental-cache)로 교체 검토.
 */
export default defineCloudflareConfig({
    incrementalCache: staticAssetsIncrementalCache,
});
