# 작업 진행 상황 (Last Updated: 2026-08-31 03:30)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: Create 한 화면 Bento + Projects Realtime + Brand Color 미해결 (2026-08-31)
* **이번 세션 추가 구현 (2026-08-30~31, tsc 클린)**
  * **Create 한 화면 Bento + 고정 바**: `CreatePageClient.tsx:109` `pt-28 pb-28` + `flex-1` bento, 헤더 `fixed top-4` ↔ 바 `fixed bottom-4` 대칭. `CreateForm.tsx:95` `Subjects|How many / Where|Brand+CTA` 2×2 bento (`grid-cols-[1.7fr_1fr] grid-rows-[1.15fr_1fr]`), `Where`는 `whereRef+ResizeObserver`로 `H=(W-32)/4.806` 한 줄 5개 돌담, `Subjects` 드롭존 `min-h-[10rem] flex-1`, `How many` 2×2 그리드로 세로 빈 공간 해소. `UploadZone.tsx:75` `Add note` 팝오버(1줄 버튼 + `textarea` 2줄 + 칩) + 업로드 파일 표시 `p-3.5 h-14→h-16` 확대 후 `flex-1 min-h-[10rem]`으로 드랍존과 동일 높이로 꽉 차게 수정. 영문화 `leave empty to skip` 포함.
  * **Brand Color 팔레트 그리드 시도 (미해결)**: `Brand`를 가로 pill → `grid-cols-5` 팔레트 그리드로 교체, `flex-1 min-h-[7rem]`로 세로 확보, `HexColorPicker` + `HEX/RGB` 동시 입력(`hexToRgb`/`rgbToHex` 양방향) + `z-[60] w-[19rem] width:100%` 팝오버로 바 가림 해소 시도. 그러나 3가지 미해결:
    1. 팔레트 아이템 아래 RGB 텍스트 잘림 → 삭제 버튼을 아이템 우상단 오버레이로 빼는 방안 필요
    2. 피커 길이가 팝오버에 꽉 안 참 → `HexColorPicker` `width:100%` 미적용, `#RRGGBB`와 `R/G/B`를 한 줄 4칸 대신 두 줄(HEX 1줄, RGB 3칸)로 분리 필요
    3. `색 선택 → Add` 2단계 어색함 → 빈 슬롯 클릭 시 바로 피커 열고 `Done`이 즉시 `Add`가 되는 1단계 흐름으로 변경 필요
    * 높이 덜컥임(`Add 3 to 5` vs `Leave empty` 16px 점프)은 `min-h-[16px]` 래퍼로 임시 고정했으나, 상기 3가지와 함께 재작업 필요. 현재 `Where` 높이를 `7rem`으로 올려 `Brand+CTA`와 맞추는 시도는 했으나 가로 넘침 방지를 위해 `whereH` 동적 계산으로 되돌림.
  * **Realtime 유지**: 이전 세션 `ProjectsPageClient`/`ProjectDetailClient` Realtime 채널 + RLS + RPC `::text` 캐스팅 + 프롬프트 영어 고정 + raw 로그는 그대로 유지.
  * **빌드 안정화**: `rm -rf .next`로 인한 `dev` 캐시 깨짐(`build-manifest.json` ENOENT) 발생 → `npx tsc --noEmit`만으로 검증, dev 재시작으로 복구. `ad-generation-batch` 빈 폴더 삭제 상태 유지, `ad-generation-batches` 정석 경로 유지.

* **사장 작업 완료 (이번 세션)**: 없음 — Brand Color 재작업 대기.

* **이전 세션 (2026-08-29 17:00) — 유효**: Projects 정석 분리(`ad-generation-batches` + `adProjectClientAPI` 래핑), gateway `postFormFetch`, `.../[batchId]/images` 업로드, `Projects` 리스트/상세 상황실, Create 텍스트 pill 한 줄 압축은 그대로 유지.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-17. Create Bento 한 화면 + 업로드 팝오버 + Brand 그리드 시도 (2026-08-31, 일부 미해결)
* 한 화면 Bento 구조 확정, 드롭존/업로드 표시 동일 높이, Where 한 줄 돌담 동적 높이, How many 2×2, Brand를 pill→팔레트 그리드로 교체 시도. 단 Brand 3가지(잘림/피커 길이/Add 2단계/높이 덜컥임)는 미해결로 남음.

### 2-16. Realtime 채널 전환 + RPC 캐스팅 수정 + 프롬프트 영어 고정 + 로그 (2026-08-29)
* 폴링 제거→Realtime, StrictMode 채널 충돌 수정, RLS publication/정책, RPC `::text` 캐스팅, 버킷 진단, 영어 고정, raw 로그.

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

### 🔴 Brand Color 미해결 (우선)
1. 팔레트 아이템 X를 우상단 오버레이로 이동해 아래 RGB/hex 잘림 해소
2. `HexColorPicker`가 팝오버 전체 너비를 채우도록 `width:100%` 고정 및 HEX 1줄 + RGB 3칸을 두 줄로 분리
3. 빈 슬롯 `Add` 2단계 제거 — 빈 스와치 클릭 시 바로 피커 열고 `Done`이 즉시 `Add` 되도록 1단계 흐름으로 변경
4. `Add 3 to 5`/`Leave empty` 높이 점프 제거는 `min-h-[16px]`로 임시 고정했으나, 상기와 함께 최종 확정 필요

### 🔴 ad 파이프라인 잔여 (UI 전)
* **버킷 생성 확인** — `ad_image_storage` (private) 대시보드 또는 `insert into storage.buckets` 로 생성 후 `docker compose restart short-real-server` 로 PostgREST 리프레시. 이후 `product/person` 업로드 `Bucket not found` 해소 후 `prompt → generation → analysis` 종단 테스트 재시도.
* **구 결과 페이지 정리** — `app/ad/create/results`는 비교용으로 유지 중, 신 `app/ad/projects/[projectId]`와 비교 완료 후 리다이렉트 처리.

### 🔴 다음 (UI)
1. **Create 한 화면 숨 틔우기** — `Where` 높이 동적(`H=(W-32)/4.806`) + `How many` 2×2 + 드롭존 동일 높이로 한 화면 달성. Brand 높이 조정은 상기 미해결과 함께 마무리.
2. **과금 확정** — `success only` 문구 교체 완료, 실제 Polar 차감은 성공 에셋 수 기준으로 이전 필요 (현재 `totalImages` 선차감).
3. **Projects 리스트 썸네일 고도화** — 현재 카드가 상태 시각화만, 실제 결과 1장 썸네일은 상세에서만 보임. 리스트 API에 썸네일 1장 signed URL을 포함하는 최적화는 v2.

### 🟡 대기
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기 (Brand 팔레트 재작업 후 재확인 필요)
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
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호. Bento 12col (`Subjects 8 | How many+CTA 4 / Where 8 | Brand 4`), `Where` 돌담은 `ResizeObserver`로 `H=(W-32)/4.806` 실측 5개 1행·가로 중앙, 섹션 높이는 내용 높이대로. `optional` 배지로 즉시 인지. 현재 Brand는 가로 pill → 5칸 팔레트 그리드로 교체 시도 중이나, 잘림/피커 길이/Add 2단계/높이 점프 3가지 미해결.
* **ad_variation_study.md**: §1·§2·§6 이미 최신(`imagePromptRecord`, `brand_palette`, HARD_BANNED 8개, fail-soft, n=1 재시도) — 이번 세션 추가 갱신 불필요.
* **supabase 파일**: `supabase/ad_generation_batches.sql` 삭제 — SQL은 직접 전달. `brand_palette` 컬럼, B안, `p_file_extension`+`p_error`는 사장이 직접 실행 완료. 버킷 `ad_image_storage` 생성 대기, `.next` 캐시로 인한 Vercel TS2306은 빈 `ad-generation-batch` 폴더 삭제로 해소.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
