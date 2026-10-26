# 작업 진행 상황 (Last Updated: 2026-10-26 21:59)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: Supabase → Neon + Cloudflare 마이그레이션 — **코드 교체 전부 완료, Supabase 의존 0 달성** (2026-10-26)
* **이번 세션 완성물 (2026-10-24~26)**
  * **DB**: Drizzle `lib/db/schema.ts`(10테이블 1:1 미러) + `lib/db/neon.ts`(싱글톤) + serverAPI·route 25파일 교체. RPC 3종(`increment_user_credit`, `update_scene_request_id`, 누락 복구한 `increment_and_get_scene_count`)을 `db.execute(sql...)`로 호출. Supabase `.single()`/`.maybeSingle()` 계약 = `limit(1)+[0]??null`. 검증: 카운트 전수 일치·FK 고아 0·RPC 스모크 통과.
  * **Storage → R2**: `lib/r2.ts`(put/presign/get/list/delete/copy, Blob 지원, ResponseContentDisposition=다운로드 강제). serverAPI 4종+route 6종+trigger 1종 교체. 키 규칙 = 구 버킷명이 폴더 접두(`processed_video_storage/{user}/{task}/...`). 스모크: `short-real-dev` 184파일 정확 일치.
  * **Realtime → Upstash Streams + SSE**: `lib/taskEvents.ts`(XADD+MAXLEN 100, fail-soft) + `app/api/events/route.ts`(5초 틱·100초 후 커서 재연결·taskId 소유권 검증) + `components/public/useTaskEvents.ts`(커서 보존 재연결·백그라운드 탭 정지). 발행은 `videoGenerationTasksServerAPI` post/patch×3/delete에 훅 — **모든 mutation 경로가 이 파일을 지나므로 파이프라인 전체 이벤트가 흐름**. 스모크: XADD/XRANGE 왕복 정상.
  * **Auth → Neon Auth (Managed Better Auth)**: `lib/auth/{client,server}.ts` + `/api/auth/[...path]` 프록시 + `/callback/session`(verifier 클라 교환 페이지) + `callback/auth`(email find-or-create — 기존 행 승계) + `getIsValidRequestC2S`(세션→email→행, 안전망 생성) + `proxy.ts` 가드. **사장님 로컬 OAuth 로그인 성공 확인 (2026-10-26)**. env: `NEON_AUTH_BASE_URL`·`NEON_AUTH_COOKIE_SECRET` (JWKS_URL 불필요 — JWT 직접 검증 코드 0).
  * **client-gateway in-process 개조 (Workers 이관 하드 블로커 해소)**: fetch 프록시(외부 도메인 재발사) → **라우트 테이블 매칭 + 모듈 lazy import + 핸들러 직접 호출**. 테이블 33파일/46 엔트리 = **브라우저(baseFetch) C2S 경유만**. 전수 대조(테이블↔실제 라우트 파일)로 누락 0 기계 검증. **운영 규칙: 새 클라 API 라우트 추가 시 ROUTE_ENTRIES 1줄 필수(누락 시 404).**
  * **Supabase 의존 0**: `lib/supabase/` 4종 삭제 + `@supabase/ssr`·`@supabase/supabase-js` 제거. `lib/api/types/supabase/` 폴더명은 레거시 명칭으로 유지(타입 경로일 뿐 의존 없음). `@upstash/ratelimit`도 제거(Redis는 Streams 전용 — fal은 동시실행수 모델이라 사전 스로틀 불필요, fal 공식 문서 확인).
  * **개발 환경 정비**: ngrok 은퇴 → **CF Tunnel**(`dev.shortreal.ai`→localhost:3001, 4프로젝트 동시 상주). 포트 배치 확정: **short_real 3000(클라)/3001(서버)**, tailored-ad 3002/3003, LocalAgentsLink 3004/3005, jaeholee.xyz 3006/3007. Docker Desktop 설치 시도 후 제거(자체 VM이 systemd dockerd와 소켓·락 충돌 실측) → **systemd dockerd + CLI만**. 디스크 27.6GB 정리(죽은 볼륨 71개 19.67GB+이미지 7.95GB), `.dockerignore`에 node_modules·.next·env 추가.
* **직전 구현 (2026-09-05, tsc 클린) — 유효**: 로고 업로드·프롬프트·Detail 표시·FormatTile Canvas 합성 다운로드·로고 투명 강제 등은 그대로 유지.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-27. Neon 마이그레이션 코드 교체 전체 완료 (2026-10-24~26)
* DB(25파일)·Storage(R2 11파일)·Realtime(Upstash SSE 4파일)·Auth(Neon Auth 12파일)·client-gateway in-process 개조. Supabase 의존 0. 상세는 `MIGRATION_SUPABASE_TO_NEON.md` §진행 상태(2026-10-26 갱신) + §개발 토폴로지 + §Workers 호출 모델.
* **스토리지 찌꺼기 정리 (2026-10-24)**: 규칙 확정("현행 명명 규격 파일 0개" ‖ "DB에 id 없음" → 폐기) 후 Supabase 4버킷 정리 — 폐기 5 task(90파일/382MB+music·scene)+d0cc01df(32파일)+슬림화 948파일/3.4GB+레거시 잔여 → 최종 184파일/656MB, 로컬 덤프와 1:1 일치, DB 23→6 rows. 백업 zip 재생성(`~/다운로드/shortreal-supabase-storage.zip`).
* **DB 데이터 이전 (2026-10-24)**: Supabase REST JSON 덤프(136 rows) → Neon development INSERT. numeric[]/text[] 배열 리터럴 변환. FK 고아 0.

### 2-26. Neon 마이그레이션 Phase 0/1 (2026-10-23)
* Neon 프로젝트+브랜치+스키마+RPC+R2 버킷+계획서 (상세 git 히스토리).

### 2-25 이전 (2026-09-05 ~)
* FormatTile 합성 다운로드, 로고 업로드·배선, 썸네일 v2, 폰트 34개 등 (상세 git 히스토리).

---

## 3. 향후 작업 (Next Steps)

### 🔴 Workers 이관 (마지막 단계) — 선행 블로커 있음
1. **internalFireAndForgetFetch의 in-process 전환** ⚠️ 하드 블로커 — 자기 API를 향한 FnF(~20곳)를 함수 호출+`ctx.waitUntil`로. TailoredAd `internalFetch.ts` 패턴(로컬 폴백 포함). gateway 디스패처를 공유하는 형태가 깔끔.
2. **Cloudflare Workers 배포 세팅** — `@opennextjs/cloudflare` + `wrangler.jsonc`(TailoredAd 패턴), GitHub 연동(Workers Builds). **Paid $5 결제 완료(30s CPU)**. env는 Build Variables + Secrets(`process.env`는 Workers에서 빌드타임 값 — 런타임 Secrets은 serverEnv 패턴 필요, 이때 getNeonDb·getR2·getAuth가 async 전환 필요할 수 있음 — 호출부 await 여부 점검).
3. **웹훅 리포인트 3곳** — fal·suno·polar → prod 도메인 (지금은 CF Tunnel `dev.shortreal.ai`로 실측 완료된 상태).
4. **컷오버 E2E** — 가입→결제→생성→Export 풀사이클, 크레딧 증감 신/구 diff 0, SSE 진행 표시, Supabase 프로젝트 폐기.

### 🟡 짧은 잔여
* **dev 브랜치 Neon Auth 활성화** — production만 켜짐. dev에서 로그인 재현되면 콘솔 토글 (현재는 prod 경유 동작 확인됨).
* **`lib/api/types/supabase/` 폴더 개명** — 레거시 명칭 정리 (기능 무관, 여유 시).
* **`.env.local`의 `SUPABASE_*` 5개 제거** — 의존 제거됐으니 env 정리 (사장님 몫).
* **dev 세션 401 이슈 관찰** — A/B 재시작 사이클에서 세션 쿠키 무효화(클라는 이메일 보유, 서버는 세션 없음) 재현되면 auth 쿠키 오리진 점검. 재로그인으로 해결되는 상태.

### 🟢 ShortReal 기존 대기 (마이그레이션과 병행 가능)
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
* **Workers 호출 모델 (이관 시)**: 요청 1 = isolate 1 = 페이지·API 전부 같은 실행 컨텍스트. **자기 zone fetch 금지**(inner invocation — TailoredAd 실측 사망) → 라우트 간 호출은 함수 직접 호출(라우트 테이블). FnF = in-process 호출 + `ctx.waitUntil`. **제한은 CPU 시간만**(Paid 30s 기본 — wall-clock 무제한, I/O 대기 불산출). 무거운 연산은 trigger.dev가 담당하는 기존 구조 유지.
* **Neon 프로젝트**: `short-real` (id `green-dawn-44947241`), Singapore, PG17. 브랜치: `production`(br-holy-art-b3f7doa0) + `development`(br-damp-unit-b38v2xhi). DB `neondb`. 데이터는 development만(136 rows).
* **R2**: 버킷 `short-real`(운영)/`short-real-dev`(개발·184파일)/`short-real-demo`(public·`assets.shortreal.ai`). 코드는 `CLOUDFLARE_R2_BUCKET=short-real` base명만 받고 dev에서 `-dev` 접미 자동. R2 토큰 스코프: `short-real`+`short-real-dev` (demo는 public이라 불필요).
* **Upstash**: `short-real-redis` Singapore, PayG($0.2/10만 커맨드)+Max budget $20. Streams 전용(prefix `short-real:user/{id}`·`short-real:task/{id}`).
* **Neon Auth**: production 브랜치 활성화, Google+GitHub. env `NEON_AUTH_BASE_URL`·`NEON_AUTH_COOKIE_SECRET`. Better Auth ID는 UUID가 아님 → **email 브릿지**(find-or-create) 필수 패턴.
* **배포**: Cloudflare Workers Builds (GitHub 연동) — Build command `npx @opennextjs/cloudflare build`, Deploy `npx @opennextjs/cloudflare deploy`. `NEXT_PUBLIC_*`는 Build Variables 인라인.
* **요청 경로 / RPC / 파일 경로 / LLM / 썸네일 / 다운로드 / 용어 계약 / 시드 규칙 / 사장 UI 원칙 / Remotion** 등 ShortReal 파이프라인 상세는 이전 세션 기록 및 `SHORTREAL-AD.md` 참조.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
