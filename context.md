# 작업 진행 상황 (Last Updated: 2026-08-29 17:00)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: Projects(UX) + ad-generation-batches(서버 정석) + 업로드 + 텍스트 pill 한 화면 (2026-08-29)

* **이번 세션 구현 완료 (2026-08-29, tsc 클린)**
  * **용어·경로 정석 분리**: DB `ad_generation_batches` / 타입 `AdGenerationBatch.ts:97` ↔ 서버 `app/api/ad/ad-generation-batches/route.ts:1` + `app/api/ad/ad-generation-batches/[batchId]/route.ts:1` (GET ByUserId, `S2S + userId` 검증, `batches/batch` 응답). 프론트 페이지는 `app/ad/projects/page.tsx` + `app/ad/projects/[projectId]/page.tsx` 로 UX 별칭 `Projects` 유지. 클라 `lib/api/client/ad/adProjectClientAPI.ts:1`는 `adGenerationBatchClientAPI`가 정석 경로 `fetch('/api/ad/ad-generation-batches')`로 호출하고 `adProjectClientAPI`가 `projects/project` 별칭으로 래핑. 내부 유틸 `getBatchProgress` 원본, `getProjectProgress` 별칭.
  * **Gateway FormData 확장**: `lib/api/client/baseFetch.ts:43` `postFormFetch(route, FormData)` 추가 (Content-Type 미설정, boundary 자동). `app/api/client-gateway/route.ts:60` multipart 감지 → `request.formData()` → 내부 `fetch`에 그대로 전달. JSON 경로는 기존 유지.
  * **원본 업로드 엔드포인트**: `app/api/ad/ad-generation-batches/[batchId]/images/route.ts:1` `POST` (S2S) — `formData.get('product'|'person')` 검증(JPG/PNG/WebP, 10MB) → `AD_IMAGE_STORAGE_BUCKET`에 `${userId}/${batchId}/${key}_image.${ext}`로 `upsert:true` 업로드. `lib/api/client/ad/adClientAPI.ts:33` `AdUploadedComponent.file?: File` 추가, `components/page/ad/create/components/UploadZone.tsx:45`에서 `file` 함께 보관.
  * **생성 연동**: `components/page/ad/create/CreatePageClient.tsx:47` mock 제거 → `adProjectClientAPI.createProject` → `batchId` → `postFormFetch('/api/ad/ad-generation-batches/${batchId}/images', fd)` (실패해도 text-only 폴백) → `router.push('/ad/projects/${batchId}')`. `pt-32→pt-24`, `px-8→px-6 sm:px-8`, `mt-6→mt-4`, 도크 `py-4→py-3`으로 한 화면 여백 조정. `app/api/ad/image/generation/{base:91,ratios:113}/route.ts`는 원본 signed URL 실패 시 `[]` 폴백 추가.
  * **Projects 리스트/상세 (상황실)**: `components/page/ad/projects/~ProjectsPageClient.tsx:1` (20개 페이지네이션, All/Running/Completed 필터, 4초 폴링) + `ProjectCard.tsx:1` (상태 시각화 + 진행 바) + `components/page/ad/projects/[projectId]/~ProjectDetailClient.tsx:1` (3초 폴링, live ↔ completed 동일 URL 자동 전환) + `CreativeRow.tsx:1` + `FormatTile.tsx:1` (실비율 타일, fail-soft 4분기). `components/page/ad/app-header/AppHeader.tsx:21` Projects 네비 추가. 구 `app/ad/create/results`는 비교용으로 유지.
  * **Create 텍스트 pill 리뉴얼**: `components/page/ad/create/components/CreateForm.tsx:1` 돌담 `STONE_COLUMNS/RATIO_ASPECT` 삭제 → `Where will it run?`을 5개 텍스트 pill 한 줄(`1:1/Square`, `4:5/Portrait` 등, `AD_ASPECT_RATIO_INFO` 재사용, 선택 시 `Check` 배지 + `border-accent bg-accent/10`)로 압축. `Subjects p-5→p-4`, `gap-4→3`, `space-y-5→4`, How many/CTA도 `p-5→p-4`로 컴팩트화하되, 현재는 세로로 빡빡하다는 피드백으로 `p-4→p-5` 등 60px 복구 여지 남음. 현재는 한 화면 0스크롤 달성했으나 숨 틔우기 조정 대기.
  * **빌드 정리**: 빈 `app/api/ad/ad-generation-batch/route.ts` 삭제, 구 `app/api/ad/projects` API 폴더 삭제(페이지 `app/ad/projects`는 유지). `npx tsc --noEmit` 클린 확인, `.next` 캐시 충돌 해소.

* **사장 작업 전**: (없음 — 이번 세션 서버 3종 SQL은 이전에 완료)

* **이전 세션 설계(2026-08-28) — 유효**: Creative 단위 배분/표현 분리, 플로우 뼈대, 병렬 오케스트레이션, RPC 3종 원리, fail-soft n=1 재시도, brand_palette, HARD_BANNED 8개 등은 그대로 유지.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-15. Projects 정석 분리 + 업로드 + 텍스트 pill 한 화면 (2026-08-29)
* 위 "이번 세션 구현 완료" 전체. 서버 `ad-generation-batches` 정석 경로 + ByUserId 리스트/상세 + gateway FormData + 업로드 엔드포인트 + Projects 리스트/상세 상황실 + Create mock 제거 및 업로드 연동 + 텍스트 pill 압축 + 한 화면 조정.

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
* **Create 한 화면 숨 틔우기** — 현재 `p-4/py-2.5`로 과하게 조여 빡빡하다는 피드백. `pt-24→pt-28`, `space-y-4→5`, `p-4→p-5`, `UploadZone py-2.5→py-4`, pill `px-3.5 py-2→px-4 py-2.5`로 60px 복구 제안. 사장 확인 후 30초 수정.
* **원본 업로드 end-to-end 테스트** — `product/person` 실제 파일 → `ad-generation-batches/[batchId]/images` → `ad_image_storage` 저장 → `generation/base`에서 signed URL 참조 생성되는지 브라우저에서 직접 생성 테스트 필요.
* **구 결과 페이지 정리** — `app/ad/create/results`는 비교용으로 유지 중, 신 `app/ad/projects/[projectId]`와 비교 완료 후 리다이렉트 처리.

### 🔴 다음 (UI)
1. **Result 화면 Creative별 진행도 표시** — 위 Projects 상세로 대체 완료. 실패 슬롯 `AdImageResult.error` + `Retry` placeholder는 구현, 실제 재트리거는 다음 단계에서 프롬프트부터 재호출로 연결 필요.
2. **과금 확정** — `success only` 문구 교체 완료, 실제 Polar 차감은 성공 에셋 수 기준으로 이전 필요 (현재 `totalImages` 선차감).
3. **Projects 리스트 썸네일 고도화** — 현재 카드가 상태 시각화만, 실제 결과 1장 썸네일은 상세에서만 보임. 리스트 API에 썸네일 1장 signed URL을 포함하는 최적화는 v2.

### 🟡 대기
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기 (이번 세션 텍스트 pill 후 재확인 필요)
* 요금 표시 방식(달러 vs 잔여 장수) 미결정
* Remotion 폴더 구조 정리 (미완료)
* 랜딩 CTA `/ad/create` 미연결, 액센트 색 불일치(#EF2B70 vs #E25E2C), ESLint 순환참조(tsc 대체 운용), 결과 화면 에디터 진입 버튼
* 배치 간 재사용 추적 v1 미구현

---

## 4. 참고 (Reminders)

* 공용: `getNextBaseResponse()` 사용, UI는 영어, 들여쓰기 4칸, 함수명 약어 금지. ESLint 불가 — `npx tsc --noEmit`으로 검증.
* **요청 경로**: 클라이언트 `postFetch('/api/ad/image')` / `postFormFetch('/api/ad/ad-generation-batches/${batchId}/images', fd)` → baseFetch가 `/api/client-gateway?path=...`로 래핑 → gateway가 세션 인증(C2S)+`userId` 주입(멀티파트면 `formData`, 아니면 `json`) → `${BASE_URL}`(ngrok)으로 `x-internal-secret`과 함께 전달 → 내부 라우트는 S2S 가드. 내부 체이닝은 `internalFireAndForgetFetch(BASE_URL + 경로)` (query로 식별자, body로 페이로드, waitUntil로 실행 보장).
* **API 경로 정석**: DB `ad_generation_batches` ↔ 서버 `app/api/ad/ad-generation-batches` + `[batchId]` (kebab-case 복수, ByUserId). 페이지는 UX 별칭 `app/ad/projects` + `[projectId]` 유지. 클라는 `adGenerationBatchClientAPI`가 정석 경로로 호출하고 `adProjectClientAPI`가 `projects/project` 별칭으로 래핑. 내부 타입/변수는 `batch`, 화면 텍스트/URL만 `Project`.
* **웹훅 관례**: `app/webhook/{provider}/` 위치, 절대 에러 상태로 응답하지 않음(200 유지). Replicate는 terminal 웹훅 실패 시 exponential backoff 재시도(최종 ~1분) + 드물게 순서 뒤바뀜 — 핸들러 멱등 필수. `ratioKey`는 query 1순위·없으면 `input.aspect_ratio` fallback, `attempt`는 재시도 횟수 추적.
* **RPC 3종 원리**: 같은 행 jsonb 배열에 병렬 쓰기 → 앱 코드 read-modify-write 금지, RPC 단일 UPDATE+jsonb_set(행 잠금)만 사용. RPC#1은 `imagePromptRecord` 단일(B안), RPC#2는 `p_file_extension`+`p_error` 포함 마커, RPC#3은 error도 완료로 카운트.
* **비율 파생 (확정)**: 기준 1:1 우선(없으면 캐노니컬 첫째 — `selectBaseRatio`) 1장 → 나머지는 기준 이미지 참조 재생성. `n=1` 재시도: 같은 비율 1회 재시도(총 2회) 후 차순위 base로 폴백, ratios도 1회 재시도. base 없으면 원본만 폴백. 원본 업로드 전이면 text-only 폴백.
* **Replicate SDK**: `replicate@^1.4.0` 설치됨. `new Replicate({auth})`, `predictions.create({model: 'owner/name', input, webhook, webhook_events_filter:['completed']})`. output은 string|string[]|FileOutput — `adImageServerAPI.extractFirstOutputUrl`로 정규화. 모델 enum: NANO_BANANA(-PRO/-2/-2_LITE).
* **파일 경로 규칙**: 입력 `{user_id}/{batch_id}/{product|person}_image.{ext}`, 출력 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c+ratio+imageFileExtension으로 signed URL 재구성. 버킷 `ad_image_storage` (imageServerAPI). 업로드 엔드포인트 `POST /api/ad/ad-generation-batches/[batchId]/images` (multipart, upsert:true).
* **AdImageResult**: `design: AdDesignLayout, score: number | null, imageFileExtension: string | null, error?: {code,message}|null` — process가 다운로드 시 `inferFileExtension`으로 확정, 실패 시 `error`로 격리.
* **AdCreativeSpec**: `imagePromptRecord: Partial<Record<AdRatioKey,string>>` (B안), `seed: number` — 프롬프트 단계가 채움. `brand_palette`는 배치 생성 시 3-5 hex or null.
* **LLM**: Creative 디렉터 `DEEPSEEK_V_4_FLASH`(텍스트, `imagePromptRecord`+`copy`+`reasoning`), Vision 분석 `QWEN_3_8_27B`(멀티모달, 정수% 0-100, 3분기 Product/Person/Both, `brand_palette` 조건부) — `lib/api/server/ad/llmServerAPI.ts` `postAdCreativePrompt`/`postAdImageAnalysis`, 프롬프트는 `lib/llm-prompts/ad/POST_AD_{CREATIVE,IMAGE_ANALYSIS}_PROMPT.ts` 엘리트 250-320줄.
* **용어 계약 (확정)**: creatives × formats = assets, 실행 1회 = batch. 유저 노출은 Project(페이지/URL/텍스트), 서버/DB/내부 코드는 batch.
* **시드 규칙**: creative별 서로 다른 seed / 같은 creative 내 비율 = 같은 seed. 재현은 저장된 specs(DB)가 담당.
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호. 현재 텍스트 pill 1줄 구조로 한 화면 달성했으나 세로로 빡빡하다는 피드백 — 60px 여유 복구 제안 상태. 팔레트는 상시 노출이되 한 줄 pill로 압축해 0스크롤 유지, `optional` 배지로 즉시 인지.
* **ad_variation_study.md**: §1·§2·§6 이미 최신(`imagePromptRecord`, `brand_palette`, HARD_BANNED 8개, fail-soft, n=1 재시도) — 이번 세션 추가 갱신 불필요. UI 텍스트 pill 변경은 변주 설계와 무관.
* **supabase 파일**: `supabase/ad_generation_batches.sql` 삭제 — SQL은 직접 전달. `brand_palette` 컬럼, B안, `p_file_extension`+`p_error`는 사장이 직접 실행 완료. 버킷 `ad_image_storage` 생성 완료, `.next` 캐시로 인한 Vercel TS2306은 빈 `ad-generation-batch` 폴더 삭제로 해소.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
