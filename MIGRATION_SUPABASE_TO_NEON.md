# Supabase → Neon + Cloudflare 마이그레이션 계획 (ShortReal Ad)

작성일: 2026-10-23. ShortReal Ad 파이프라인 유지보수 중 착수.

## 목표

ShortReal의 Supabase 의존 4종(Auth·Postgres·Storage·Realtime)을 Neon + Cloudflare 스택으로 이전한다. TailoredAd(`../tailored-ad`)가 동일 마이그레이션을 완료한 선례이므로 동일 패턴을 재사용한다.

## ShortReal 현재 Supabase 사용 규모 (실측 2026-10-23)

* **DB 테이블 10종**: `users`, `video_generation_tasks`, `autopilot_data`, `ai_model_data`, `user_youtube_tokens`, `user_tiktok_tokens`, `user_instagram_tokens`, `background_musics`, `roadmap_items`, `subscription_grants` (`subscription_grants`는 Polar 과금 — 선택적)
* **RPC 2종**: `increment_user_credit`, `update_scene_request_id` (creative 2종은 tailored-ad 흔적 — 2026-10-24 제거, 아래 흔적 제거 절 참조)
* **Storage 6버킷 / 5.06GB / 1,760건**: `processed_video_storage` 4.18GB가 대부분
* **Realtime 채널 3곳**: `video_generation_tasks_changes`, `video_task_editor_${taskId}`, `user-${user.id}` (ad 2곳은 2026-10-24 코드 삭제로 소멸)
* **Auth**: Google OAuth (`signInWithOAuth`) + `getUser()` 세션 검사 + proxy.ts 쿠키 가드
* **웹훅 3곳 리포인트 필요**: `polar/checkouts`, `fal-ai/video`, `suno-api` (ad/replicate 2곳은 2026-10-24 라우트 삭제로 소멸)
* **무거운 연산은 이미 off-platform**: ffmpeg→Replicate, 영상 렌더→trigger.dev, LLM→내부 서버(ngrok). Workers 호스팅 블로커 없음.

## Workstream 1. DB → Neon

* 테이블 12종 이식 (OpenAPI 스펙 기반 DDL, `db/neon/01_schema.sql`).
* RPC 2종 PL/pgSQL 함수 이식 (Supabase에서 `pg_get_functiondef`로 추출, `db/neon/02_functions.sql`). creative 2종은 tailored-ad 흔적으로 제외.
* RLS는 service role 위주라 이관 불필요 — 인가는 API 게이트로.
* **선행 조건 완료**: Supabase에서 RPC 4개 원본 정의 추출 완료 (2026-10-23).
* TailoredAd 패턴 재사용: `src/lib/db/neon.ts` (싱글톤) + `schema.ts` (Drizzle 거울), `stripUndefined` 필수, email find-or-create 브릿지 (Neon Auth ID ≠ UUID).
* `users.credit_count integer` 컬럼 포함 (OpenAPI 누락분, `increment_user_credit` 참조).

## Workstream 2. Storage → R2

* private 버킷 4개 (`narration_voice`·`video_music_temp`·`scene_image_temp`·`processed_video`) → R2 버킷 `short-real`(운영)/`short-real-dev`(개발), 유저폴더 체계 `{userId}/{taskId}/` (private, presigned URL). `ad_image_storage`는 tailored-ad 흔적 — 코드 삭제(2026-10-24)로 이전 대상 자체가 소멸.
* 데모 mp4 (Vercel Blob) → R2 버킷 `short-real-demo` (public, 커스텀 도메인 `assets.shortreal.ai`).
* 서명 URL은 R2 presigned URL로 교체 (`r2.ts` 패턴 재사용).
* 코드 교체점: serverAPI 4종(voice·music·video·videoGenerationTasks) + `app/api` 6곳 + `trigger` 1곳.
* 데이터 이전: 찌꺼기 정리 후 184파일/656MB — `short-real-dev` 업로드 완료 (사장 직접). Supabase 원본·로컬 덤프·zip 백업 3중 보존.
* 비용: R2 Free(월 저장 10GB + transform 5,000건)로 시작. 초기 $0 예상.

## Workstream 3. Realtime → Upstash pub/sub + SSE

* stage 완료 지점에 `publish(batch:{id})` 1줄씩 추가.
* `GET /api/events` SSE route가 Upstash subscribe 스트림을 중계.
* 클라 `channel()` 5곳 → `useBatchEvents` 훅 1개로 교체. `EventSource` 자동 재연결 내장.
* Neon REST는 SUBSCRIBE 불가라 Upstash Streams + XADD/XRANGE 조합 (TailoredAd 선례).
* 비용: Free(월 50만 커맨드) 범위.

## Workstream 4. Auth → Neon Auth (마지막)

* Neon Auth(매니지드 Better Auth). 소셜 Google.
* `AuthContext`·`proxy.ts`·`callback/auth`·게이트웨이 인증 교체.
* 전원 재로그인 (테스트 계정만). 소셜은 버튼 1회.
* 비밀번호 해시 이전 불가. 릴리즈 전이라 영향 없음.
* Gotcha: verifier 미교환 — 서버 콜백 전 `/callback/session` 클라 교환 페이지 경유.

## Workstream 5. Hosting → Cloudflare Workers

* `@opennextjs/cloudflare` + `wrangler.jsonc` (TailoredAd 패턴 재사용).
* 배포: GitHub 연동(Workers Builds) 추천 — Build command `npx @opennextjs/cloudflare build`, Deploy command `npx @opennextjs/cloudflare deploy`. 환경변수는 Build Variables에 등록 (`NEXT_PUBLIC_*` 인라인).
* Vercel Blob 데모 자산 → R2로 통일.

## 확정 인프라 (2026-10-23)

* Neon: Singapore 리전, `production` + `development` 브랜치, PG17, Neon Auth 미활성 (콘솔 토글 필요).
* Cloudflare: R2 버킷 2개 생성됨 (`short-real-images` private, `short-real-demo` public) — 설정 미완 (CORS·커스텀 도메인·API 토큰·dev URL).
* Upstash: 미생성.

## 순서

2 → 1 → 3 → 4 → 5. Storage부터인 이유: 의존성 0, 교체점 단일, 눈으로 바로 확인 가능. Auth는 사용자 영향 최대라 맨 나중.

## 컷오버 통과 조건

* staging 풀사이클 E2E (가입→결제→생성→Profile).
* 크레딧 증감 신/구 diff 0.
* 이미지 동등성 육안 확인.
* Realtime 진행 표시 확인.
* 웹훅 4곳(polar/replicate/fal/suno) 리포인트 + E2E.

## 진행 상태 (2026-10-27 갱신 — 마이그레이션 종결)

* ** 컷오버 및 서비스 전환 종결 (2026-10-27)**:
  * [x] **prod 커스텀 도메인 컷오버 완료** — `shortreal.ai` NS가 Cloudflare DNS, Vercel A/CNAME 레코드 삭제, Workers `short-real` 바인딩. 실측: `server: cloudflare` + `cf-ray`, x-vercel 지문 소멸, `/` 200·`/api` 401. www 바인딩은 NXDOMAIN 확인 후 사장님 추가 진행 (실측 대기).
  * [x] **Vercel 프로젝트 삭제 + Free 플랜 하향** — 트래픽 0 확정 후 삭제. 레포 잔재도 정리: 커밋 `df22dc8` (vercel.json 삭제, layout.tsx의 `@vercel/analytics` 제거, package.json에서 `@vercel/analytics`·`@vercel/functions` 제거).
  * [x] **Supabase 프로젝트 삭제** — 백업 후 삭제 완료. "production이 비어도 development = Supabase 데이터면 OK" 정책 확정.
  * [x] **Polar 웹훅 체인 완주** — 근본 원인 = Polar 등록 URL이 옛 경로(`/api/polar/checkouts/success`, 실제 라우트는 `/webhook/polar/checkouts/success`). 제 MCP API로 URL 수정 + 실패 이벤트 재전송 → HTTP 200 → DB 실측 `plan=plan-1`·`subscription_id` 부여. endpoint id `a031822c-2bdb-490c-863b-6605b8142ff7`.
  * [x] **cron 워커 `short-real-cron`** (커밋 `a68a513`) — 레포 `cron-worker/` (`0 * * * *`, `TARGET_URL` var + `CRON_SECRET` Secret). `/__run?secret=` 수동실행 → `{"ok":true,"status":200}` 실측. ⚠️ 교훈: Git CI 배포 성공 후 대시보드 수동 배포가 얹히면 라이브가 구 코드로 되돌아감 — 배포 후 `/`→404·`/__run`→401 실측 루틴 유지.
  * [x] **users 중복 정리** — production에서 lht1324@gmail.com 2행 → 1행 (plan 부여 최신행 유지) + `users_email_uidx` 유니크 인덱스 생성 (이중 create race 차단).
  * [x] **`credit_count`/`image_limit`/`subscription_grants` 판정** — 셋 모두 코드 참조 0 (schema.ts 정의만 존재). 웹훅이 plan·subscription_id만 쓰는 것은 설계상 정확. Polar 제품 metadata `imageLimit`도 현재 미참조.
  * [ ] **Polar 웹훅 이벤트 확장 (나중에)** — endpoint 이벤트가 `subscription.created` 1개뿐. 취소·환불 lifecycle은 필요 시 별도 설계 (현재 `scheduled_downgrade_at`은 cancel 라우트담당 추정).
* [x] Neon 프로젝트 (Singapore) + production/development 브랜치 + PG17.
* [x] DB 스키마 10 테이블 + 인덱스 + FK → production/development 양쪽 적용 완료 (`db/neon/01_schema.sql`). ad_generation_batches·usage_ledger는 2026-10-24 흔적 제거로 DROP.
* [x] RPC **3종** 이식 → production/development 양쪽 적용 완료 (`db/neon/02_functions.sql`). `users.credit_count` 컬럼 추가.
  * ⚠️ 10-24에 `increment_and_get_scene_count(uuid, text, text DEFAULT 'completed')` 누락 발견 → Supabase에서 `pg_get_functiondef` 재추출 후 양쪽 브랜치에 추가 완료 (10-24). 이 RPC는 영상 파이프라인 병합 트리거(마지막 씬 판정)라 누락 시 영상 생성이 마지막 단계에서 멈춘다.
* [x] R2 버킷: `short-real`(운영용 빈 폴더 구조)·`short-real-dev`(개발, 184파일 업로드 완료)·`short-real-demo`(데모, `assets.shortreal.ai` 연결). R2 API 토큰은 `short-real`+`short-real-dev` 스코프로 재발급 완료 (demo는 public이라 토큰 불필요 — 콘솔 수동 관리).
* [x] R2 설정 — 스모크 테스트 통과 (listKeys 184개, 구 버킷명 폴더 구조 확인). CORS는 필요 시점에 추가.
* [x] Neon Auth 활성화 — production 브랜치 + GitHub·Google OAuth 연동 (사장 콘솔 작업 완료). **development 브랜치는 미활성** — dev에서 로그인 테스트 시 활성화 필요할 수 있음 (현재 로컬 로그인은 production 경유로 동작 확인됨).
* [x] Upstash Redis — `short-real-redis`, Singapore(ap-southeast-1), Pay-as-you-go + Max budget $20. Ratelimit용이 아니라 **Realtime Streams 전용**으로 결정 (fal은 동시 실행수 제한 모델이라 사전 스로틀 불필요 — fal 공식 문서 확인).
* [x] Drizzle schema.ts + neon.ts 작성 (`lib/db/`) — `01_schema.sql` 1:1 미러, timestamptz mode:'string', numeric[]/text[] 배열 매핑, 부분 유니크 인덱스(`reason='trial'`) 포함. tsc 0에러.
* [x] **코드 교체 완료 — Supabase 의존 0 달성 (2026-10-26)**:
  * **DB**: serverAPI 3종 + route 22종 → Drizzle (`getNeonDb()` 싱글턴). RPC 3종은 `db.execute(sql\`SELECT func(...)::uuid...\`)` 패턴. Supabase `.single()`/`.maybeSingle()` 계약은 `limit(1)+[0]??null`로 유지.
  * **Storage**: serverAPI 4종 + route 6종 + trigger 1종 → `r2ServerAPI` (`lib/r2.ts`). 키 규칙 = 구 버킷명을 폴더 접두로(`scene_image_temp_storage/{user}/{task}/...`).
  * **Realtime → Upstash Streams + SSE**: `lib/taskEvents.ts`(XADD+MAXLEN 트림, fail-soft) + `app/api/events/route.ts`(SSE 중계, 5초 틱·100초 후 재연결, taskId 소유권 검증) + `components/public/useTaskEvents.ts`(커서 보존 재연결, 백그라운드 탭 정지). 채널 3종(대시보드·에디터·AuthContext users) 전부 교체. AuthContext의 user 채널은 TailoredAd 10-21 선례대로 제거(소비자가 자기 자신뿐).
  * **Auth → Neon Auth(Managed Better Auth)**: `lib/auth/{client,server}.ts` + `app/api/auth/[...path]/route.ts`(프록시) + `app/callback/session`(verifier 클라 교환 페이지 — gotcha 해소) + `callback/auth`(email find-or-create 브릿지) + `getIsValidRequestC2S`(세션→email→행, 안전망 생성 포함) + `proxy.ts` 가드. **기존 유저는 email 브릿지로 행 승계** (재로그인 1회).
  * **Supabase 잔존**: `lib/supabase/` 4종 삭제 + `@supabase/ssr`·`@supabase/supabase-js` 의존성 제거. env의 `SUPABASE_*` 5개도 제거 대상. `lib/api/types/supabase/` 폴더명은 레거시 명칭으로 유지 (타입 경로일 뿐 의존 없음).
* [x] 데이터 이전 → development 브랜치 136 rows 적용 완료 (2026-10-24, Supabase REST JSON 덤프 → INSERT, 카운트 전수 일치·FK 고아 0건 검증). production은 스키마만 유지.
* [x] client-gateway in-process 개조 (2026-10-26) — fetch 프록시(외부 도메인 재발사) → **라우트 테이블 매칭 + 모듈 lazy import + 핸들러 직접 호출**. 이유: (a) 터널 왕복 제거·터널 단절에 dev API가 죽지 않음 (b) **CF Workers 이관의 하드 블로커 해소** — 워커의 자기 zone 재진입(inner invocation)은 금지라 fetch 프록시 방식은 동작 불가 (TailoredAd 실측, `../tailored-ad/src/app/api/client-gateway/route.ts` develop 브랜치가 검증 원본). 테이블 33파일/46 엔트리 — **브라우저(baseFetch) 경유 C2S 라우트만** 등록, S2S(internalFireAndForgetFetch)·웹훅·trigger·auth 프록시·events는 제외. 전수 대조 검증(테이블↔실제 라우트 파일)으로 누락 0 확인. **운영 규칙: 새 클라 API 라우트 추가 시 ROUTE_ENTRIES 1줄 필수 (누락 시 404).**
* [ ] **internalFireAndForgetFetch의 Workers 대응** — 자기 API를 향한 FnF는 in-process 호출+`ctx.waitUntil`로 전환 필요. 현재 37곳 중 자기 API 대상만. `getCloudflareContext()` 로컬 폴백 패턴은 TailoredAd `internalFetch.ts` 참조. **Workers 이관 전 필수.**
* [ ] Cloudflare Workers 배포 세팅 (Paid $5 결제 완료 — 30s CPU 확보) + 웹훅 리포인트 (fal·suno·polar → CF Tunnel `dev.shortreal.ai` → 배포 후 prod 도메인으로).
* [x] 개발 환경 — ngrok 완전 은퇴 → **Cloudflare Tunnel**(tunnel `dev`, `dev.shortreal.ai` → localhost:3001). 포트 배치(사장 확정): short_real 3000(클라)/3001(서버), tailored-ad 3002/3003, LocalAgentsLink 3004/3005, jaeholee.xyz 3006/3007. `BASE_URL=https://dev.shortreal.ai`, `NEXT_PUBLIC_BASE_URL=http://localhost:3001`. Docker Desktop 설치 후 제거 — **systemd dockerd + CLI만 사용** (DD는 자체 VM이라 소켓·락 충돌 유발 실측). 디스크 27.6GB 정리(볼륨 71개 19.67GB + 이미지 7.95GB), `.dockerignore`에 node_modules·.next 추가.

## tailored-ad 흔적 제거 (2026-10-24)

`../tailored-ad` 분리 전 이 프로젝트와 DB·코드를 공유하던 시절 잔재를 전부 제거. 사장 컨펌 완료.

* **배경**: 메인 랜딩은 영상 스튜디오(`/`, `LandingPageServer`)이고 `/ad`는 네비게이션 링크 0개·sitemap 미등록 — UI적으로도 고립. workspace 코드의 ad lib 참조 0곳 확인 후 삭제.
* **코드 삭제 63파일** (`git rm`): `app/ad/`(페이지 4+layout), `app/api/ad/`(라우트 13), `app/webhook/ad/`(replicate 웹훅 2), `components/page/ad/`(33), `lib/api/client/ad/`(2), `lib/api/server/ad/`(5 — adGenerationBatchServerAPI·adServerAPI·creativeCombinationSampler·imageServerAPI·llmServerAPI), `lib/api/types/supabase/ad/`(1), `lib/llm-prompts/ad/`(2). 삭제 후 `npx tsc --noEmit` 에러 0건.
* **Neon DB** (development + production 양쪽): `update_creative_prompt_outputs`·`update_creative_image_analysis` RPC 2종 DROP → `usage_ledger`의 `usage_ledger_batch_fk` DROP → `ad_generation_batches` 테이블 DROP (방금 이전했던 13 rows 포함 소멸).
* **추가 DROP (사장 컨펌)**: `usage_ledger` 풀 DROP — 컬럼이 `(user_id, batch_id, creative_index, ratio_key)`뿐이라 Polar 과금이 아니라 ad 이미지 생성 크레딧 추적용 흔적으로 확정 (금액 필드 0, 코드 참조 0곳). Polar 과금은 `subscription_grants`가 담당.
* **유지**: `increment_user_credit`(users 전용), `update_scene_request_id`(video 전용), `ad_image_storage` Supabase 버킷(폐기 예정 DB라 방치).
* **문서**: RPC 4→2, 웹훅 4→3, Realtime 채널 5→3, 테이블 12→11 반영.

## 비용 요약

| 항목 | 초기 | 트래픽 후 |
|---|---|---|
| R2 + Transformations | $0 (Free, 10GB) | transform $0.50/1,000건 |
| Upstash pub/sub | $0 (Free) | 월 수 달러 |
| Workers | $0 (Free) | 일 10만 요청 초과 시 $5 |
| Neon | Free (0.5GiB) | 별도 확인 |

## 참고

* TailoredAd 선례: `../tailored-ad/MIGRATION_SUPABASE_TO_NEON.md` + `../tailored-ad/src/lib/db/neon.ts`, `schema.ts`, `r2.ts`, `src/lib/batchEvents.ts`.
* ShortReal 파이프라인 상세: `SHORTREAL-AD.md`, `context.md`.
* Supabase 사용처 상세: `context.md` §4 Reminders.

## 개발 토폴로지 (2026-10-26 확정)

```
외부 웹훅 (fal·suno·polar) → CF Tunnel(dev.shortreal.ai) → localhost:3001 (서버 B, Docker)
브라우저 → localhost:3000 (클라 A, 호스트) — baseFetch는 NEXT_PUBLIC_BASE_URL(3001)로 클라→서버 직행
                └ 클라 fetch는 전부 gateway(?path=) 경유 → in-process 디스패치 → 라우트 실행
```

* **A(3000, 호스트)** = UI 서버: 페이지·클라 번들. gateway는 여기서 실행되지만 라우트는 B에서.
* **B(3001, Docker `short-real-server`)** = API 서버: 모든 라우트·DB·R2 접근. Dockerfile CMD `npm run dev` (컨테이너 내부 3000 = 호스트 3001).
* **gateway 우선순위**: `BASE_URL(터널) || NEXT_PUBLIC_BASE_URL` — 어느 인스턴스의 gateway가 실행되든 터널(=서버 3001)로 종착하는 단일 진실. ⚠️ `NEXT_PUBLIC 우선`으로 바꾸면 컨테이너에서 `localhost:3001`이 자기 자신(내부 3000)을 못 가리켜 ECONNREFUSED — 실측된 함정.
* **localhost의 함정**: `localhost`는 실행 주체 좌표계로 풀이된다 — 컨테이너에서 localhost = 컨테이너 자신. 크로스 홉 주소 지정 시 항상 "어느 프로세스가 이 코드를 실행하는가"를 먼저 물어라.
* **CF Tunnel은 외부 진입 전용** — 터널이 흔들려도(QUIC `network is unreachable` 자동 복구 실측) 로컬 개발 API는 영향 없어야 정상. gateway가 터널을 우회하던 시절에는 터널 단절이 곧 dev API 전멸이었다.
* **lazydocker** = 컨테이너 관리 TUI (DD 제거 후 대체). Docker Desktop은 자체 VM이라 systemd dockerd와 소켓·락 충돌 유발 — 사용 금지 확정.

## Workers 호출 모델 (이관 시 개념 — 2026-10-26 사장-에이전트 합의)

* **Vercel 모델과 다름**: Vercel은 요청당 새 함수 인스턴스(spawn-and-die)라 "URL = 호출 수단". Workers는 **요청 하나 = isolate 하나 = 그 안에서 페이지·API 전부 실행**.
* **자기 zone fetch 금지** (inner invocation) — isolate 밖으로 나갔다 다시 들어오는 순환이라 플랫폼이 차단. TailoredAd 실측.
* 그래서 "서버→서버" 개념이 **통째로 소멸**: gateway→라우트→유틸 전부 **같은 isolate 안의 일반 함수 호출**(모듈 lazy import + 핸들러 직접 호출). `new NextRequest("http://internal...")`은 생성자 형식 요건을 채우는 껍데기 URL일 뿐.
* **FnF** = in-process 함수 호출 + `getCloudflareContext().ctx.waitUntil(promise)` — 응답 후 isolate 회수를 막아 백그라운드 완료 보장.
* **제한**: wall-clock은 무제한(클라 연결 유지 시) — **CPU 시간만 제한** (Paid 기본 30s, 최대 5분). I/O 대기는 CPU 시간에 불산출 → I/O 중심 체인(A→B→C 10초 걸려도 실 CPU 수십 ms)은 안전. 무거운 연산은 기존대로 trigger.dev가 담당.
* **제외 없는 진실**: 진짜 외부 서비스(fal·suno·Replicate·Neon·R2·Upstash) 호출은 URL fetch 그대로 유효 — 금지는 "자기 워커/자기 zone"뿐.
