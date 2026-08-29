# 작업 진행 상황 (Last Updated: 2026-08-30 00:40)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: Projects Realtime 전환 + RPC 캐스팅 버그 수정 + 프롬프트 영어 고정 (2026-08-29)
* **이번 세션 추가 구현 (2026-08-29 야간, tsc 클린)**
  * **Realtime 전환 (폴링 제거)**: `ProjectsPageClient.tsx:52` 4초 `setInterval` 제거 → `supabase.channel('ad-batches-list-${user.id}-${rand}').on('postgres_changes', filter: user_id=eq.userId)` 로 리스트 patch (INSERT/UPDATE/DELETE). `ProjectDetailClient.tsx:49` 3초 폴링 제거 → `supabase.channel('ad-batch-${projectId}-${rand}').on('postgres_changes', filter: id=eq.projectId)` 로 `fetchProject()` 즉시 재조회. StrictMode 이중 마운트 충돌(`cannot add postgres_changes after subscribe`)은 채널명에 랜덤 suffix로 해결, `removeChannel`で 정리. 끊기면 수동 Refresh로 대응(폴링 fallback 없음, 불평 시 추가 예정).
  * **Supabase Realtime/RLS**: `alter publication supabase_realtime add table public.ad_generation_batches;` + `enable row level security` + 4개 정책(`select/insert/update/delete`) `user_id = auth.uid()::text` (text=uuid 캐스팅 필요). `user_id`가 `text` 타입이라 `::text` 필수. service_role은 RLS 우회하므로 S2S 경로는 영향 없음.
  * **RPC 캐스팅 버그 수정**: `update_creative_prompt_outputs`/`update_creative_image_analysis` 본문 `array[p_creative_index, '...']` → `array[p_creative_index::text, '...']` 로 수정. `int`+`text` 혼합 배열이 `int[]`로 추론돼 `'imagePromptRecord'/'imageResults'`를 `int`로 캐스팅하려다 `invalid input syntax for type integer` 발생. `-> p_creative_index`(jsonb 인덱스)는 `int` 그대로 유지, `jsonb_set` 경로만 `text[]`라 캐스팅 필요. `update_creative_image_by_ratio_generation_completed`는 `p_file_extension text default null, p_error jsonb default null`로 두고 `DROP FUNCTION ... (uuid,int,text)/(uuid,int,text,text)/(uuid,int,text,text,jsonb)` 후 재생성해야 `cannot remove parameter defaults` 회피.
  * **버킷 진단**: `ad_image_storage` 버킷이 프로젝트(`tbgymsmw...`)에 없음 → `storage.buckets` 조회 결과 5개만 있고 `ad_image_storage` 없음. 대시보드 Storage → New bucket `ad_image_storage` (private) 또는 `insert into storage.buckets...` 필요. 이게 `Bucket not found` 원인이었고, RLS와 별개.
  * **프롬프트 영어 고정**: `POST_AD_CREATIVE_PROMPT.ts`/`POST_AD_IMAGE_ANALYSIS_PROMPT.ts` `constraint`에 `ALL output text MUST be English only` 추가. `output_schema`는 이미 `llmServerAPI` 파싱 키(`image_prompt_record`/`copy`/`reasoning`/`ratio_reasonings` ↔ `cleanAndParseJSON`)와 일치함을 재확인.
  * **rawOutput 로그**: `llmServerAPI.ts:82,190` 파싱 직전 `console.log(raw LLM output first 4000)` + `PARSE_ERROR` 시 `console.error(raw)` 추가. 다음 실패 시 `[ad/creative/N] raw LLM output`으로 즉시 확인 가능. `docker compose restart short-real-server`로 PostgREST 스키마 캐시 갱신 필요.
  * **Create Bento 유지**: `Subjects(8) | How many+CTA(4) / Where(8) | Brand(4)` 12col Bento, `Where`는 `whereRowRef` + `ResizeObserver`로 안쪽 폭 `W`를 재서 `H=(W-32)/4.806` 공통 높이·`aspectRatio`로 5개 1행 돌담, 가로 중앙 정렬. 섹션 높이는 내용 높이대로(`space-y-4` + `lg:items-start`), `Where` 높이 고정 제거 상태로 유지.

* **사장 작업 완료 (이번 세션)**: RLS 4개 정책 `::text` 캐스팅 버전으로 재생성 성공. 1번·3번 RPC 본문 `::text` 수정도 대시보드에서 Success. 버킷 생성은 잔여.

* **이전 세션 (2026-08-29 17:00) — 유효**: Projects 정석 분리(`ad-generation-batches` + `adProjectClientAPI` 래핑), gateway `postFormFetch`, `.../[batchId]/images` 업로드, `Projects` 리스트/상세 상황실, Create 텍스트 pill 한 줄 압축은 그대로 유지.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-16. Realtime 채널 전환 + RPC 캐스팅 수정 + 프롬프트 영어 고정 + 로그 (2026-08-29)
* 위 "이번 세션 추가 구현" 전체. 폴링 제거→Realtime, StrictMode 채널 충돌 수정, RLS publication/정책, RPC `::text` 캐스팅, 버킷 진단, 영어 고정, raw 로그.

### 2-15. Projects 정석 분리 + 업로드 + 텍스트 pill 한 화면 (2026-08-29)
* 서버 `ad-generation-batches` 정석 경로 + ByUserId 리스트/상세 + gateway FormData + 업로드 엔드포인트 + Projects 리스트/상세 상황실 + Create mock 제거 및 업로드 연동 + 텍스트 pill 압축 + 한 화면 조정.

### 2-14. 프롬프트 엘리트화 + 전 구간 배선 + fail-soft/팔레트/UI (2026-08-28)
* B안 개명·brand_palette·HARD_BANNED 8개·프롬프트 2개 전면 재작성·prompt/analysis 배선·생성/프로세스 fail-soft n=1 재시도·UI Background 제거/팔레트/높이 조정.

### 2-13. generation/webhook/process + LLM 스켈레톤 구현 (2026-08-27)
* AdImageResult 확장자·RPC 새 시그니처·imageServerAPI 버킷 헬퍼·generation 2종·webhook 검증·process 2종·ReplicateClient 정리·QWEN 모델 조사 및 llmServerAPI/프롬프트 스켈레톤.

### 2-12. 서버 파이프라인 설계 확정 + LLM 경계까지 구현 (2026-08-26)
* 용어 논쟁 종결, 배분 주체=코드 확정, 플로우 뼈대 확정, RPC 3종 갱신, ReplicateClient 작성, `adGenerationBatchServerAPI`·`creativeCombinationSampler`·`image/route.ts`·`creative/specs/route.ts`·`prompt` 스캐폴드.

### 이전 마일스톤 요약 (상세는 git 히스토리 참조)
* **2-11 (08-24)**: results 구조 확정 — `AdCreativeResult[]`(copy+imageResults 미러)
* **2-10 (08-24)**: 변주 설계 합의 — 다름의 단위=Creative, LLM=creative당 1회, 헤드라인/CTA 오버레이 분리
* **2-9 (08-22)**: 결과 화면 — 실비율 카드, Creative 용어, 균등 높이 행, 캐노니컬 정렬
* **2-5~2-8 (08-22)**: CreateForm 0스크롤 리디자인, px→rem 일괄 교체, UploadZone 개선, fal I2I 스키마 조사
* **2-1~2-4 (08-20~21)**: 데스크탑 최적화, concept 우선 구조, batch 용어 교체

---

## 3. 향후 작업 (Next Steps)

### 🔴 ad 파이프라인 잔여 (UI 전)
* **버킷 생성 확인** — `ad_image_storage` (private) 대시보드 또는 `insert into storage.buckets` 로 생성 후 `docker compose restart short-real-server` 로 PostgREST 리프레시. 이후 `product/person` 업로드 `Bucket not found` 해소 후 `prompt → generation → analysis` 종단 테스트 재시도.
* **구 결과 페이지 정리** — `app/ad/create/results`는 비교용으로 유지 중, 신 `app/ad/projects/[projectId]`와 비교 완료 후 리다이렉트 처리.

### 🔴 다음 (UI)
1. **Create 한 화면 숨 틔우기** — `Where` 돌담 실측(`H=(W-32)/4.806`, 5개 1행, 가로 중앙)은 적용됨. 섹션 높이는 내용 높이대로 복구(`space-y-4` + `lg:items-start`), `Where` 고정 높이 제거 상태. 추가 60px 복구는 보류.
2. **과금 확정** — `success only` 문구 교체 완료, 실제 Polar 차감은 성공 에셋 수 기준으로 이전 필요 (현재 `totalImages` 선차감).
3. **Projects 리스트 썸네일 고도화** — 현재 카드가 상태 시각화만, 실제 결과 1장 썸네일은 상세에서만 보임. 리스트 API에 썸네일 1장 signed URL을 포함하는 최적화는 v2.

### 🟡 대기
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기 (Bento + 돌담 실측 후 재확인 필요)
* 요금 표시 방식(달러 vs 잔여 장수) 미결정
* Remotion 폴더 구조 정리 (미완료)
* 랜딩 CTA `/ad/create` 미연결, 액센트 색 불일치(#EF2B70 vs #E25E2C), ESLint 순환참조(tsc 대체 운용), 결과 화면 에디터 진입 버튼
* 배치 간 재사용 추적 v1 미구현

---

## 4. 참고 (Reminders)

* 공용: `getNextBaseResponse()` 사용, UI는 영어, 들여쓰기 4칸, 함수명 약어 금지. ESLint 불가 — `npx tsc --noEmit`으로 검증.
* **요청 경로**: 클라이언트 `postFetch('/api/ad/image')` / `postFormFetch('/api/ad/ad-generation-batches/${batchId}/images', fd)` → baseFetch가 `/api/client-gateway?path=...`로 래핑 → gateway가 세션 인증(C2S)+`userId` 주입(멀티파트면 `formData`, 아니면 `json`) → `${BASE_URL}`(ngrok)으로 `x-internal-secret`과 함께 전달 → 내부 라우트는 S2S 가드. 내부 체이닝은 `internalFireAndForgetFetch(BASE_URL + 경로)` (query로 식별자, body로 페이로드, waitUntil로 실행 보장).
* **API 경로 정석**: DB `ad_generation_batches` ↔ 서버 `app/api/ad/ad-generation-batches` + `[batchId]` (kebab-case 복수, ByUserId). 페이지는 UX 별칭 `app/ad/projects` + `[projectId]` 유지. 클라는 `adGenerationBatchClientAPI`가 정석 경로로 호출하고 `adProjectClientAPI`가 `projects/project` 별칭으로 래핑. 내부 타입/변수는 `batch`, 화면 텍스트/URL만 `Project`.
* **Realtime**: `alter publication supabase_realtime add table public.ad_generation_batches;` + RLS `user_id = auth.uid()::text` 4개 정책. 리스트는 `channel('ad-batches-list-${user.id}-${rand}').on('postgres_changes', filter: user_id=eq.userId)`, 상세는 `channel('ad-batch-${projectId}-${rand}').on('postgres_changes', filter: id=eq.projectId)` 로 폴링 대체. `supabase.removeChannel`로 정리, StrictMode 이중 마운트 방지 위해 채널명 랜덤 suffix. 끊기면 Refresh 버튼으로 수동 갱신 (폴링 fallback 없음).
* **웹훅 관례**: `app/webhook/{provider}/` 위치, 절대 에러 상태로 응답하지 않음(200 유지). Replicate는 terminal 웹훅 실패 시 exponential backoff 재시도(최종 ~1분) + 드물게 순서 뒤바뀜 — 핸들러 멱등 필수. `ratioKey`는 query 1순위·없으면 `input.aspect_ratio` fallback, `attempt`는 재시도 횟수 추적.
* **RPC 3종 원리**: 같은 행 jsonb 배열에 병렬 쓰기 → 앱 코드 read-modify-write 금지, RPC 단일 UPDATE+jsonb_set(행 잠금)만 사용. `jsonb_set` 경로는 `text[]`라 `array[p_creative_index::text, '...']`로 캐스팅 필수 (`int`+`text` 혼합 시 `invalid input syntax for type integer` 발생). RPC#1은 `imagePromptRecord` 단일(B안, 키 `imagePromptRecord`), RPC#2는 `p_file_extension text default null, p_error jsonb default null` 포함 마커(3·4·5개 인자 호환), RPC#3은 `p_image_results` + error도 완료로 카운트. PostgREST 스키마 캐시는 `docker compose restart short-real-server`로 갱신.
* **비율 파생 (확정)**: 기준 1:1 우선(없으면 캐노니컬 첫째 — `selectBaseRatio`) 1장 → 나머지는 기준 이미지 참조 재생성. `n=1` 재시도: 같은 비율 1회 재시도(총 2회) 후 차순위 base로 폴백, ratios도 1회 재시도. base 없으면 원본만 폴백. 원본 업로드 전이면 text-only 폴백.
* **Replicate SDK**: `replicate@^1.4.0` 설치됨. `new Replicate({auth})`, `predictions.create({model: 'owner/name', input, webhook, webhook_events_filter:['completed']})`. output은 string|string[]|FileOutput — `adImageServerAPI.extractFirstOutputUrl`로 정규화. 모델 enum: NANO_BANANA(-PRO/-2/-2_LITE).
* **파일 경로 규칙**: 입력 `{user_id}/{batch_id}/{product|person}_image.{ext}`, 출력 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c+ratio+imageFileExtension으로 signed URL 재구성. 버킷 `ad_image_storage` (imageServerAPI, private). 업로드 엔드포인트 `POST /api/ad/ad-generation-batches/[batchId]/images` (multipart, upsert:true).
* **AdImageResult**: `design: AdDesignLayout, score: number | null, imageFileExtension: string | null, error?: {code,message}|null` — process가 다운로드 시 `inferFileExtension`으로 확정, 실패 시 `error`로 격리.
* **AdCreativeSpec**: `imagePromptRecord: Partial<Record<AdRatioKey,string>>` (B안), `seed: number` — 프롬프트 단계가 채움. `brand_palette`는 배치 생성 시 3-5 hex or null.
* **LLM**: Creative 디렉터 `DEEPSEEK_V_4_FLASH`(텍스트, `imagePromptRecord`+`copy`+`reasoning`, 영어 고정), Vision 분석 `QWEN_3_8_27B`(멀티모달, 정수% 0-100, 3분기 Product/Person/Both, `brand_palette` 조건부, 영어 고정) — `llmServerAPI.ts` `postAdCreativePrompt`/`postAdImageAnalysis` + 원문 4000자 로그(`raw LLM output`/`raw Vision output`), 프롬프트는 `POST_AD_{CREATIVE,IMAGE_ANALYSIS}_PROMPT.ts` 엘리트 250-320줄, `constraint`에 `ALL output text MUST be English only` 명시.
* **용어 계약 (확정)**: creatives × formats = assets, 실행 1회 = batch. 유저 노출은 Project(페이지/URL/텍스트), 서버/DB/내부 코드는 batch.
* **시드 규칙**: creative별 서로 다른 seed / 같은 creative 내 비율 = 같은 seed. 재현은 저장된 specs(DB)가 담당.
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호. Bento 12col (`Subjects 8 | How many+CTA 4 / Where 8 | Brand 4`), `Where` 돌담은 `ResizeObserver`로 `H=(W-32)/4.806` 실측 5개 1행·가로 중앙, 섹션 높이는 내용 높이대로. `optional` 배지로 즉시 인지.
* **ad_variation_study.md**: §1·§2·§6 이미 최신(`imagePromptRecord`, `brand_palette`, HARD_BANNED 8개, fail-soft, n=1 재시도) — 이번 세션 추가 갱신 불필요. UI 텍스트 pill 변경은 변주 설계와 무관.
* **supabase 파일**: `supabase/ad_generation_batches.sql` 삭제 — SQL은 직접 전달. `brand_palette` 컬럼, B안, `p_file_extension`+`p_error`는 사장이 직접 실행 완료. 버킷 `ad_image_storage` 생성 대기, `.next` 캐시로 인한 Vercel TS2306은 빈 `ad-generation-batch` 폴더 삭제로 해소.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
