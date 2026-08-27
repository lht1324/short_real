# 작업 진행 상황 (Last Updated: 2026-08-28 03:00)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: ad 파이프라인 전 구간 배선 완료 + fail-soft/재시도/팔레트/UI 리뉴얼 (2026-08-28)

* **이번 세션 구현 완료 (2026-08-28, tsc 클린, supabase 파일 삭제)**
  * **타입 개명**: `AdGenerationBatch.ts:50` `AdCreativeSpec.imageSpecs` → `imagePromptRecord` (B안, `imagePromptRecord: Partial<Record<AdRatioKey,string>>`), `AdImageResult:76`에 `error?: {code,message}|null` 추가 (비율 1장 단위 fail-soft). `AdPipelineStartRequest:40`/`AdGenerationBatch:100`에 `brandPalette`/`brand_palette: string[]|null` nullable 추가 (3-5 hex, 조건부)
  * **샘플러**: `lib/api/server/ad/creativeCombinationSampler.ts:88` `HARD_BANNED_AXIS_PAIRS` 0→8개 — `night_low×vivid`, `low_key×vivid`, `packshot×golden_hour`, `packshot×blue_hour`, `detail_close×negative_space`, `flat_lay×tight_crop`, `environment_shot×tight_crop`, `tight_crop×minimal_modern`
  * **프롬프트 전면 재작성 (MASTER/IMAGE_GEN 수준)**: `lib/llm-prompts/ad/POST_AD_CREATIVE_PROMPT.ts:1` 46→259줄, `POST_AD_IMAGE_ANALYSIS_PROMPT.ts:1` 46→~320줄. `POST_AD_CREATIVE_PROMPT`는 4 Unit (Axis Decoding, Ratio-Aware Caption, Copy 1.7초 전쟁, Seed/Quality Gate) + `brand_palette` 조건부(입력 null이면 7종 키워드만, 값 있으면 nearest 키워드 매핑 + hex를 재질로 체화, 캡션엔 hex 직접 박지 않음) + `imagePromptRecord` 개명 + headline 항상 생성(렌더 토글) + `->`→`→` + 줄바꿈 정리. `POST_AD_IMAGE_ANALYSIS`는 Qwen 3.8-27B 멀티이미지 전제, 4 Unit (Forensic/Geometry/Scoring/Consistency), **Product-only/Person-only/Both 3분기**, 정수%(`0-100` 정수, Remotion용), `brand_palette` 조건부, `ratio_order` 순서 보장
  * **LLM 서버**: `lib/api/server/ad/llmServerAPI.ts:18,136` `postAdCreativePrompt`에 `brandPalette` 추가, `image_prompt_record` 파싱, `reasoning/ratio_reasonings` 로그; `postAdImageAnalysis`에 `brandPalette` 추가, `imageInputs` 필터링, `reasoning` 로그. `maxCompletionTokens 2048→4096`
  * **RPC/서버**: `lib/api/server/ad/adGenerationBatchServerAPI.ts:79,100,119` `updateCreativePromptOutputs` B안 단일화(폴백 제거), `updateCreativeImageAnalysis` 신규, `updateCreativeImageByRatioGenerationCompleted`에 `imageError`→`p_error` 전달. SQL은 파일 삭제 — 사장이 직접 실행 (`update_creative_prompt_outputs` B안, `update_creative_image_by_ratio_generation_completed` `p_file_extension`+`p_error`, `update_creative_image_analysis` error도 완료로 카운트)
  * **진입**: `app/api/ad/image/route.ts:103` `brandPalette` 3-5 hex 검증 후 `brand_palette` 저장
  * **프롬프트 라우트 배선**: `app/api/ad/creative/[creative-index]/prompt/route.ts:11` `postAdCreativePrompt` 호출 → `updateCreativePromptOutputs` → `aspect_ratios.length===1`이면 `generation/ratios` 직통, 아니면 `generation/base` fire-and-forget. `creativeIndex/conceptCount`는 LLM에 미전달(격리)
  * **분석 라우트 배선**: `app/api/ad/creative/[creative-index]/analysis/route.ts:1` signed URL→base64 수집 (error 비율 스킵, 전부 실패 시 Vision 스킵 후 RPC로 바로 완료), `postAdImageAnalysis` 호출(성공 비율만), `imageFileExtension` 보존 병합 → `updateCreativeImageAnalysis`
  * **생성**: `app/api/ad/image/generation/{base:18,ratios:21}/route.ts` `imagePromptRecord` 개명, `base`에 `baseRatio`·`attempt` 쿼리 추가 (차순위 폴백용), `ratios`에 `retryRatioKey`·`attempt` 단일 재시도 분기 + base 실패 시 원본만 폴백. `lib/ReplicateClient.ts:46` 주석 `imagePromptRecord`로 갱신
  * **Fail-soft + n=1 재시도** (2026-08-28 결정): `app/api/ad/image/process/{base:58,ratios:58}/route.ts` `patchStatus('failed')` 제거. Replicate `failed/canceled` 시 `updateCreativeImageByRatioGenerationCompleted(..., null, {code,message})`로 해당 비율만 error 마킹. `process/base`는 같은 비율 1회 재시도(총 2회) 후 차순위 `selectBaseRatio(남은것)`로 `generation/base?baseRatio=..` 재호출, `process/ratios`는 같은 비율 1회 재시도 후 error 마킹. `generation/ratios`는 `409` 대신 원본 폴백, `analysis`는 error 비율 스킵. 배치 최종 `completed`는 error 포함 카운트 (`supabase` RPC3 `where score or error`)
  * **UI**: `components/page/ad/create/components/CreateForm.tsx:1` Background 섹션 제거 (AI가 creative마다 배경 생성), `Sparkles` 배지 제거, `UploadZone`에 `tall` 적용(`py-2.5`→`py-5` + `sm:items-stretch`로 체감 40% 확대) + 한 화면 0스크롤 유지 위해 팔레트를 한 줄 pill로 압축. `Brand colors optional·3-5` 섹션 신규 — `react-colorful` `HexColorPicker`, swatch, `Add`/`X`, `Done` 팝오버, 기본색 `#111111` (off-black), 대문자 고정(`toUpperCase`), 5개 제한, 3개 미만 경고. `components/page/ad/create/CreatePageClient.tsx:75` Background 3 state 제거, `brandPalette` state 추가, `AdGenerateRequest.brandPalette` 추가, `hasBackground` 제거→`hasSubject`만으로 `canGenerate`, `hintText`/`credited per batch`→`success only`로 변경, `validPalette` 3-5일 때만 Batch에 포함

* **사장 작업 완료**: `update_creative_prompt_outputs` B안, `update_creative_image_by_ratio_generation_completed` `p_file_extension`+`p_error`, `update_creative_image_analysis` error 카운트까지 직접 실행. `supabase/ad_generation_batches.sql` 파일은 삭제 (직접 SQL 전달로 전환). 버킷 `ad_image_storage`는 생성 완료.

* **이전 세션 설계(2026-08-27) — 유효**: Creative 단위 배분/표현 분리, 플로우 뼈대, 병렬 오케스트레이션, RPC 3종 원리, 상태 흐름은 그대로 유지. `imageSpecs`는 `imagePromptRecord`로 전면 개명.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-14. 프롬프트 엘리트화 + 전 구간 배선 + fail-soft/팔레트/UI (2026-08-28)
* 위 "이번 세션 구현 완료" 전체. B안 개명·brand_palette·HARD_BANNED 8개·프롬프트 2개 전면 재작성·prompt/analysis 배선·생성/프로세스 fail-soft n=1 재시도·UI Background 제거/팔레트/높이 조정.

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
* **HARD_BANNED 추가 완료** — 8개로 확장 완료, 더 필요 시 `creativeCombinationSampler.ts:88`에 추가만 하면 됨.
* **Background 제거 완료** — CreateForm/CreatePageClient에서 제거 및 문구 교체 완료.

### 🔴 다음 (UI)
1. **mock 교체** — `CreatePageClient.tsx:43` `mockCreateTask/mockGetTask` → 실 `POST /api/ad/image` + 폴링. `window.__adMockTasks` 제거. 업로드 실 저장(`ad_image_storage`에 `{userId}/{batchId}/product_image.{ext}`) 라우트 필요 — 서버 플로우가 선행이라 다음.
2. **Result 화면 Creative별 진행도 표시** — 완료된 creative부터 순차 노출, 실패 슬롯은 `AdImageResult.error`로 `Regenerate` (해당 creative만 prompt부터 재트리거).
3. **과금 확정** — `success only`로 문구 교체 완료, 실제 Polar 차감은 성공 에셋 수 기준으로 이전 필요 (현재 `totalImages` 선차감).

### 🟡 대기
* Product/Person 업로드 흐름 (Storage `ad_image_storage` 버킷 결정 완료 — 업로드 라우트 필요)
* 어법 필터 목록 추가 확장은 완료, 배치 간 재사용 추적은 v1 미구현
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기
* 요금 표시 방식(달러 vs 잔여 장수) 미결정
* Remotion 폴더 구조 정리 (미완료)
* 랜딩 CTA `/ad/create` 미연결, 액센트 색 불일치(#EF2B70 vs #E25E2C), ESLint 순환참조(tsc 대체 운용), 결과 화면 에디터 진입 버튼

---

## 4. 참고 (Reminders)

* 공용: `getNextBaseResponse()` 사용, UI는 영어, 들여쓰기 4칸, 함수명 약어 금지. ESLint 불가 — `npx tsc --noEmit`으로 검증.
* **요청 경로**: 클라이언트 `postFetch('/api/ad/image')` → baseFetch가 `/api/client-gateway?path=...`로 래핑 → gateway가 세션 인증(C2S)+`userId` 주입 → `${BASE_URL}`(ngrok)으로 `x-internal-secret`과 함께 전달 → 내부 라우트는 S2S 가드. 내부 체이닝은 `internalFireAndForgetFetch(BASE_URL + 경로)` (query로 식별자, body로 페이로드, waitUntil로 실행 보장).
* **웹훅 관례**: `app/webhook/{provider}/` 위치, 절대 에러 상태로 응답하지 않음(200 유지). Replicate는 terminal 웹훅 실패 시 exponential backoff 재시도(최종 ~1분) + 드물게 순서 뒤바뀜 — 핸들러 멱등 필수. `ratioKey`는 query 1순위·없으면 `input.aspect_ratio` fallback, `attempt`는 재시도 횟수 추적.
* **RPC 3종 원리**: 같은 행 jsonb 배열에 병렬 쓰기 → 앱 코드 read-modify-write 금지, RPC 단일 UPDATE+jsonb_set(행 잠금)만 사용. RPC#1은 `imagePromptRecord` 단일(B안), RPC#2는 `p_file_extension`+`p_error` 포함 마커, RPC#3은 error도 완료로 카운트.
* **비율 파생 (확정)**: 기준 1:1 우선(없으면 캐노니컬 첫째 — `selectBaseRatio`) 1장 → 나머지는 기준 이미지 참조 재생성. `n=1` 재시도: 같은 비율 1회 재시도(총 2회) 후 차순위 base로 폴백, ratios도 1회 재시도. base 없으면 원본만 폴백.
* **Replicate SDK**: `replicate@^1.4.0` 설치됨. `new Replicate({auth})`, `predictions.create({model: 'owner/name', input, webhook, webhook_events_filter:['completed']})`. output은 string|string[]|FileOutput — `adImageServerAPI.extractFirstOutputUrl`로 정규화. 모델 enum: NANO_BANANA(-PRO/-2/-2_LITE).
* **파일 경로 규칙**: 입력 `{user_id}/{batch_id}/{product|person}_image.{ext}`, 출력 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c+ratio+imageFileExtension으로 signed URL 재구성. 버킷 `ad_image_storage` (imageServerAPI).
* **AdImageResult**: `design: AdDesignLayout, score: number | null, imageFileExtension: string | null, error?: {code,message}|null` — process가 다운로드 시 `inferFileExtension`으로 확정, 실패 시 `error`로 격리.
* **AdCreativeSpec**: `imagePromptRecord: Partial<Record<AdRatioKey,string>>` (B안), `seed: number` — 프롬프트 단계가 채움. `brand_palette`는 배치 생성 시 3-5 hex or null.
* **LLM**: Creative 디렉터 `DEEPSEEK_V_4_FLASH`(텍스트, `imagePromptRecord`+`copy`+`reasoning`), Vision 분석 `QWEN_3_8_27B`(멀티모달, 정수% 0-100, 3분기 Product/Person/Both, `brand_palette` 조건부) — `lib/api/server/ad/llmServerAPI.ts` `postAdCreativePrompt`/`postAdImageAnalysis`, 프롬프트는 `lib/llm-prompts/ad/POST_AD_{CREATIVE,IMAGE_ANALYSIS}_PROMPT.ts` 엘리트 250-320줄.
* **용어 계약 (확정)**: creatives × formats = assets, 실행 1회 = batch.
* **시드 규칙**: creative별 서로 다른 seed / 같은 creative 내 비율 = 같은 seed. 재현은 저장된 specs(DB)가 담당.
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호. 팔레트는 상시 노출이되 한 줄 pill로 압축해 0스크롤 유지, `optional` 배지로 즉시 인지.
* **ad_variation_study.md**: §1·§2·§6 업데이트 필요 — `imageSpecs`→`imagePromptRecord`, `brand_palette` 조건부, HARD_BANNED 8개, fail-soft per-image + n=1 재시도 반영 예정.
* **supabase 파일**: `supabase/ad_generation_batches.sql` 삭제 — SQL은 직접 전달. `brand_palette` 컬럼, B안, `p_file_extension`+`p_error`는 사장이 직접 실행 완료.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
