# 작업 진행 상황 (Last Updated: 2026-10-27 17:24)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: Supabase → Neon + Cloudflare 마이그레이션 — **컷오버 완료, 서비스 인프라 전환 종결** (2026-10-27)
* **컷오버 완료 (2026-10-27)**: `shortreal.ai`가 Cloudflare Workers에서 서빙 중 (`server: cloudflare` + `cf-ray` 실측, x-vercel 지문 소멸). apex 200, `/api` 401 정상.
* **Vercel 완전 하차 (2026-10-27)**: 프로젝트 Delete 완료 + **Free 플랜 하향**. 웹훅 재전송 기록의 404 응답이 Vercel 404 페이지였던 과거는 종료.
* **Supabase 완전 하차 (2026-10-27)**: 프로젝트 **삭제 완료** (백업 후). "production이 비어도 development = Supabase 데이터면 OK" 정책으로 확정.
* **Polar 웹훅 체인 완주 (2026-10-27)**: 원인 = **Polar에 등록된 웹훅 URL이 옛 경로** (`/api/polar/checkouts/success` 등록 vs 실제 라우트 `/webhook/polar/checkouts/success`) → 제 API에서 URL 수정 (`https://shortreal.ai/webhook/polar/checkouts/success`) + 실패 이벤트 재전송 → HTTP 200 "Received successfully" → DB 실측 `plan=plan-1`, `subscription_id=b392ddd8-4294-4e96-8a34-44c65c355f45` 부여 확인. 기존 4건 전송은 모두 404.
* **cron 워커 `short-real-cron` 완주 (2026-10-27)**: 커밋 `a68a513` + Git CI 배포 성공(로그 실측) + 수동 deploy까지 진행됐었으나 **CI 성공 후 대시보드 수동 Hello World 배포 2건이 얹혀 라이브 되돌아가는 사고** → 결국 `y` overwrite 컨펌 후 수동 deploy로 정상화: `/`→404, `/__run`(secret 없이)→401 실측. 수동실행 `{"ok":true,"status":200}` — Vercel 경유 체인 확인. 스케줄 `0 * * * *` 등록 확인.
* **users 중복 정리 (2026-10-27)**: production 브랜치에서 lht1324@gmail.com 중복 2행 → 1행 정리 (plan 부여된 최신행 유지) + `users_email_uidx` 유니크 인덱스 생성. 실측: users 총 1행, 인덱스 존재.
* **`credit_count`/`image_limit` 판정 (2026-10-27)**: 코드 참조 0 (schema.ts 정의만 존재) — 웹훅이 plan·subscription_id만 쓰는 것은 설계상 정확. Polar 제품 metadata `imageLimit` 100/500/1000도 현재 코드 미참조.
* **`subscription_grants` 테이블**: 코드 참조 0 — legacy 유물, INSERT가 코드에 존재 없음.
* **@opentelemetry/api 직접 의존 추가** (OpenNext issue #969 대응).
* **Vercel 잔재 코드 정리 커밋 (2026-10-27, `df22dc8`)**: `vercel.json` 삭제, `app/layout.tsx`의 `@vercel/analytics` import·렌더 제거, `package.json`에서 `@vercel/analytics`·`@vercel/functions` 의존성 제거. develop→master push 완료. **`npm install`은 사장님이 직접 실행 예정**.
* **이전 세션 완성물 (2026-10-24~26, 유효)**: DB(25파일)·Storage(R2 11파일)·Realtime(Upstash SSE 4파일)·Auth(Neon Auth 12파일)·client-gateway in-process 개조·Supabase 의존 0. 상세는 `MIGRATION_SUPABASE_TO_NEON.md`.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-28. 컷오버 및 서비스 인프라 완전 전환 (2026-10-27)
* Workers prod 커스텀 도메인 컷오버, Vercel 삭제+Free, Supabase 삭제, Polar 웹훅 URL 수정+재전송(200), cron 워커(수동+정각), users 중복 정리+유니크, Vercel 잔재 코드 정리(`df22dc8`).
* www.shortreal.ai: DNS 레코드 삭제 후 바인딩 누락으로 NXDOMAIN 실측 — Workers(short-real)에 www 추가 요청 중 (사장님). **추가 후 실측 필요** (000 → 200 확인).

### 2-27. Neon 마이그레이션 코드 교체 전체 완료 (2026-10-24~26)
* 상세는 `MIGRATION_SUPABASE_TO_NEON.md` §진행 상태 + §개발 토폴로지 + §Workers 호출 모델 참조.

### 2-25 이전 (2026-09-05 ~)
* FormatTile 합성 다운로드, 로고 업로드·배선, 썸네일 v2, 폰트 34개 등 (상세 git 히스토리).

---

## 3. 향후 작업 (Next Steps)

### 🔴 마무리 확정 대기
1. **www.shortreal.ai 바인딩 확인** — 사장님이 Workers → short-real에 www 추가했다고 함. NXDOMAIN 해소 실측 필요 (추가 완료 응답 받으면 curl 재측정: 000 → 200).
2. **`npm install` 사장님 실행** — package.json에서 @vercel/* 2건 제거 반영. 이후 Cloudflare Workers 자동 배포가 df22dc8로 다시 돌 것 (무해).
3. **Polar 웹훅 lifecycle 이벤트 확장 (난이도 낮음, 나중에)** — 현재 endpoint 이벤트가 `subscription.created` 1개뿐. 구독 취소·환불·갱신 시 `scheduled_downgrade_at` 세팅은 cancel 라우트(사용자 요청)담당 추정 — 필요 시 별도 설계.
4. **매시 정각 cron 자동실행 로그 관찰** — `short-real-cron` Logs에서 `[cron] GET ... -> 200` 확인하면 항목 완전히 닫힘.

### 🟡 짧은 잔여
* **dev 브랜치 Neon Auth 활성화** — production만 켜짐. dev에서 로그인 재현되면 콘솔 토글 (현재는 prod 경유 동작 확인됨).
* **`.env.local`의 `SUPABASE_*` 5개 제거** — 의존 제거됐으니 env 정리 (사장님 몫).
* **`lib/api/types/supabase/` 폴더 개명** — 레거시 명칭 정리 (기능 무관, 여유 시).
* **prod 참조 카탈로그 비어있음** — production 브랜치의 `ai_model_data`·`roadmap_items` = 0행. "prod 비면 dev 확정 카탈로그 의존" 정책 OK지만, UI에서 모델 목록 안 보이면 dev 브랜치 데이터 카피 필요.

### 🟢 ShortReal 기존 대기
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기
* 과금 확정 — `success only` 이전 (Polar 차감 기준)
* Remotion 폴더 구조 정리, 액센트 색 불일치, ESLint 순환참조
* 폰트 결정 주체 이관 (2단계) — prompt=패밀리+문구, analysis=배치+색/두께

---

## 4. 참고 (Reminders)

* 공용: `getNextBaseResponse()` 사용, UI는 영어, 들여쓰기 4칸, 함수명 약어 금지. ESLint 불가 — `npx tsc --noEmit`으로 검증.
* **개발 토폴로지 (2026-10-26 확정)**:
  ```
  외부 웹훅 (fal·suno·polar) → CF Tunnel(dev.shortreal.ai) → localhost:3001 (서버 B, Docker)
  브라우저 → localhost:3000 (클라 A, 호스트) → baseFetch(NEXT_PUBLIC_BASE_URL=3001) → gateway → in-process 디스패치(라우트는 B에서 실행)
  ```
  * gateway 우선순위 = `BASE_URL(터널) || NEXT_PUBLIC_BASE_URL` — 어느 인스턴스에서 실행되든 터널(=서버 3001)로 종착하는 단일 진실. ⚠️ `NEXT_PUBLIC 우선`으로 바꾸면 컨테이너에서 `localhost:3001`이 존재하지 않는 포트라 ECONNREFUSED (실측 함정).
  * **localhost는 실행 주체 좌표계** — 컨테이너에서 localhost = 컨테이너 자신. 크로스 홉 주소 지정 시 "어느 프로세스가 이 코드를 실행하는가"를 먼저 물어라.
  * CF Tunnel은 외부 진입 전용 — 터널이 흔들려도(QUIC 단절 자동복구 실측) 로컬 API는 영향 없어야 정상.
  * **Docker Desktop 사용 금지 확정** — 자체 VM이 systemd dockerd와 소켓·락 충돌. CLI + lazydocker(TUI)만.
* **Workers 호출 모델**: 요청 1 = isolate 1 = 페이지·API 전부 같은 실행 컨텍스트. **자기 zone fetch 금지**(inner invocation — TailoredAd 실측 사망) → 라우트 간 호출은 함수 직접 호출(라우트 테이블). FnF = in-process 호출 + `ctx.waitUntil`. **제한은 CPU 시간만**(Paid 30s 기본). 무거운 연산은 trigger.dev가 담당하는 기존 구조 유지.
* **Neon 프로젝트**: `short-real` (id `green-dawn-44947241`), Singapore, PG17. 브랜치: `production`(br-holy-art-b3f7doa0) + `development`(br-damp-unit-b38v2xhi). DB `neondb`. 데이터는 development만(136 rows).
* **R2**: 버킷 `short-real`(운영)/`short-real-dev`(개발·184파일)/`short-real-demo`(public·`assets.shortreal.ai`). 코드는 `CLOUDFLARE_R2_BUCKET=short-real` base명만 받고 dev에서 `-dev` 접미 자동. R2 토큰 스코프: `short-real`+`short-real-dev`.
* **Upstash**: `short-real-redis` Singapore, PayG($0.2/10만 커맨드)+Max budget $20. Streams 전용(prefix `short-real:user/{id}`·`short-real:task/{id}`).
* **Neon Auth**: production 브랜치 활성화, Google+GitHub. env `NEON_AUTH_BASE_URL`·`NEON_AUTH_COOKIE_SECRET`. Better Auth ID는 UUID가 아님 → **email 브릿지**(find-or-create) 필수 패턴. Google OAuth 등록 redirect URI는 prod endpoint 기준 — dev(calm-leaf) 쪽 필요하면 구글 콘솔에 별도 추가.
* **배포**: Cloudflare Workers Builds (GitHub 연동) — Build command `npx @opennextjs/cloudflare build`, Deploy `npx @opennextjs/cloudflare deploy`. `NEXT_PUBLIC_*`는 Build Variables 인라인. Workers 프로젝트: 본앱 `short-real` + 스케줄러 `short-real-cron` (`0 * * * *`, `TARGET_URL` var + `CRON_SECRET` Secret; 레포 `cron-worker/`).
  * **⚠️ cron-worker 배포 교훈**: Git CI 배포 성공 로그가 나와도 대시보드 수동 배포가 이후 얹히면 라이브가 되돌아간다(Hello World 사고 실측). 배포 후 `/`→404·`/__run`→401 실측 루틴 유지.
* **Polar**: 웹훅 endpoint id `a031822c-2bdb-490c-863b-6605b8142ff7` (url `https://shortreal.ai/webhook/polar/checkouts/success`), org `4bc098db-677b-4267-a729-39b3ca0f3317` 짧은 프로젝트. tailored-ws org는 별도 제품(tailoredad.com)과 무관. 제품: Starter/Growth/Pro/Agency/Studio/Studio 60/Indie 등, metadata planId plan-1~4.
* **CRON_SECRET은 스크린샷 노출 이력 있음** — 외부 공유 시 가리고, 이슈 생기면 본앱+cron 3곳 동시 교체.
* **요청 경로 / RPC / 파일 경로 / LLM / 썸네일 / 다운로드 / 용어 계약 / 시드 규칙 / 사장 UI 원칙 / Remotion** 등 ShortReal 파이프라인 상세는 `SHORTREAL-AD.md` 참조.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
