# 작업 진행 상황 (Last Updated: 2026-08-27 03:24)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: ad 서버 파이프라인 구현 진행 중 — generation/webhook/process 완료, LLM 스켈레톤 완료, prompt/analysis 연결 대기 (2026-08-27)

* **이번 세션 구현 완료 (2026-08-27, tsc 클린)**
  * **타입**: `AdGenerationBatch.ts:79` — `AdImageResult`에 `imageFileExtension: string | null` 추가 (process가 다운로드 시 확정해 RPC 마커로 기록, ratios/Result 화면 경로 재조립에 사용)
  * **헬퍼**: `lib/api/server/ad/imageServerAPI.ts` 신규 — `AD_IMAGE_STORAGE_BUCKET="ad_image_storage"` + `getAdOriginalImageSignedUrls`/`getAdResultImageSignedUrl` + `extractFirstOutputUrl`/`inferFileExtension` + 경로 규칙 헬퍼 (`getAdInputImagePath`/`getAdResultImagePath`). process/Result 공용
  * **RPC 래퍼**: `adGenerationBatchServerAPI.ts:80` — `updateCreativeImageByRatioGenerationCompleted(batchId, creativeIndex, ratioKey, fileExtension)` 추가. SQL은 사장이 직접 실행한 `update_creative_image_by_ratio_generation_completed(p_batch_id uuid, p_creative_index int, p_ratio_key text, p_file_extension text)` 새 시그니처(`jsonb_build_object`에 `imageFileExtension` 포함)에 대응 — `supabase/ad_generation_batches.sql` 파일은 미수정(사장 복붙 실행)
  * **generation/base** (`app/api/ad/image/generation/base/route.ts:36`) — 배치 조회·`selectBaseRatio` 기준 비율·`imageSpecs[baseRatio]` 캡션 검증·원본 signed URL·`replicateClient.postAdImageEditPrediction` (model `NANO_BANANA`, webhookUrl `&ratioKey=` 포함, `aspectRatio` 전달)
  * **generation/ratios** (`app/api/ad/image/generation/ratios/route.ts:48`) — 중립 실행자. `length===1` 직통(원본만 1장) / `length>=2` 뒤따름(`imageResults[baseRatio].imageFileExtension`으로 기준 signed URL 재조립 후 `base+원본` 참조, 남은 비율 반복 제출) + 불변성 가드(409)
  * **webhook** (`app/webhook/ad/replicate/image/{base,ratios}/route.ts:29`) — `payload.id/status` 최소 검증(없으면 200 종료), `ratioKey`는 query 1순위·없으면 `payload.input.aspect_ratio` fallback, 멱등은 `process` RPC `coalesce`로 커버. `ratios`의 TODO(미정) 코멘트 정리 + `base`에 `ratioKey` 전달 추가
  * **process/base·ratios** (`app/api/ad/image/process/{base,ratios}/route.ts:36`) — `replicatePayload.status !== 'succeeded'`면 `failed` 전이, `ratioKey` 확정→`output` 추출→다운로드→`Content-Type`/URL 기반 확장자 판별→`ad_image_storage`에 `ad_generation_result_{c}_{ratio}.{ext}` 업로드(upsert)→RPC#2. `base`는 항상 `generation/ratios` fire-and-forget, `ratios`는 `isLastCreative=true`면 `analysis` 호출
  * **ReplicateClient** (`lib/ReplicateClient.ts:18,50,104`) — `NANO_BANANA` `aspect_ratio` 지원으로 코멘트 수정(사장 페이지 직접 확인 2026-08-27), `image_input` 빈 배열 시 생략
  * **LLM 스켈레톤**: `lib/OpenRouterClient.ts:12` `QWEN_3_8_27B` 추가, `lib/api/server/ad/llmServerAPI.ts` 신규 `llmServerAPI.postAdCreativePrompt`(DeepSeek V4 Flash)/`postAdImageAnalysis`(QWEN_3_8_27B, `imageBase64List` 전달) — `llmServerAPI` 이름으로 export, `cleanAndParseJSON` 파싱 스켈레톤, output_schema는 TODO. `lib/llm-prompts/ad/POST_AD_CREATIVE_PROMPT.ts`/`POST_AD_IMAGE_ANALYSIS_PROMPT.ts` 백틱 프롬프트 스켈레톤 신규, 빈 파일 `POST_CREATIVE_IMAGE_BY_RATIO_PROMPT.ts` 삭제
  * **Vision 분석 모델 후보 비교(사장 요청)**: GLM-5.3-Flash / DeepSeek V4-Flash-Vision-Exp / Muse Spark 1.2 (+ Qwen3.8-27B / Gemini 3.7 Flash 추가 조사) — 문서/차트는 Qwen·GLM 강세, 세밀 공간은 Qwen w/CI·Muse Spark 강세, DeepSeek는 800px 제한·experimental로 제외. ad `design` 좌표 작업에는 Qwen3.8-27B w/CI가 가장 적합으로 판단, `llmServerAPI.ts`에 반영

* **사장 작업 완료**: Supabase에 `update_creative_image_by_ratio_generation_completed` 새 시그니처(`p_file_extension` 포함) 복붙 실행 완료. 버킷 `ad_image_storage` 생성은 잔여.

* **이전 세션 설계(2026-08-26) — 유효**
  * 용어 Creative 유지, 조합 배분=코드 샘플러 / 표현=LLM, 플로우 뼈대(generation/webhook/process 분리, webhook_url 라우팅 위임, ratios 중립 실행자), process 연쇄, 병렬 오케스트레이션, RPC 3종 원리, 상태 흐름 `queued→generating→designing→completed(어느 단계든 failed)`, Replicate google 4종 라인업 확인은 그대로 유지 — 단 `NANO_BANANA`는 aspect_ratio 지원으로 정정.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-13. generation/webhook/process + LLM 스켈레톤 구현 (2026-08-27)
* 위 "이번 세션 구현 완료" 전체. AdImageResult 확장자·RPC 새 시그니처·imageServerAPI 버킷 헬퍼·generation 2종·webhook 검증·process 2종·ReplicateClient 정리·QWEN 모델 조사 및 llmServerAPI/프롬프트 스켈레톤.

### 2-12. 서버 파이프라인 설계 확정 + LLM 경계까지 구현 (2026-08-26)
* 용어 논쟁(Edition/Concept) 종결, 배분 주체=코드 확정, 플로우 뼈대 확정, RPC 3종 갱신, ReplicateClient 작성, `adGenerationBatchServerAPI`·`creativeCombinationSampler`·`image/route.ts`·`creative/specs/route.ts`·`prompt` 스캐폴드.

### 이전 마일스톤 요약 (상세는 git 히스토리 참조)
* **2-11 (08-24)**: results 구조 확정 — `AdCreativeResult[]`(copy+imageResults 미러)
* **2-10 (08-24)**: 변주 설계 합의 — 다름의 단위=Creative, LLM=creative당 1회, 헤드라인/CTA 오버레이 분리
* **2-9 (08-22)**: 결과 화면 — 실비율 카드, Creative 용어, 균등 높이 행, 캐노니컬 정렬
* **2-5~2-8 (08-22)**: CreateForm 0스크롤 리디자인, px→rem 일괄 교체, UploadZone 개선, fal I2I 스키마 조사
* **2-1~2-4 (08-20~21)**: 데스크탑 최적화, concept 우선 구조, batch 용어 교체

---

## 3. 향후 작업 (Next Steps)

### 🔴 ad 파이프라인 잔여 구현 (순서대로)
1. **prompt LLM 연결** (`app/api/ad/creative/[creative-index]/prompt/route.ts:82`) — `llmServerAPI.postAdCreativePrompt` 호출 → RPC `update_creative_prompt_outputs`로 `ad_creative_specs[creativeIndex].imageSpecs` + `ad_creative_results[creativeIndex].copy` 저장 → 비율 갯수 판정 → `generation/base` 또는 `generation/ratios` 호출. 출력 스키마는 프롬프트 파일 TODO.
2. **analysis 연결** (`app/api/ad/creative/[creative-index]/analysis/route.ts`) — 스캐폴드 상태. `imageServerAPI`로 creative 묶음 이미지 base64 수집 → `llmServerAPI.postAdImageAnalysis`(QWEN_3_8_27B) → `imageFileExtension` 보존해 RPC `update_creative_image_analysis`로 `imageResults` 교체 → `completed` 전이.

### 🔴 사장: Supabase 버킷 생성
* `ad_image_storage` 버킷 생성 (imageServerAPI가 사용). `supabase/ad_generation_batches.sql` 파일은 이번 세션에서 수정 안 함(사장 직접 실행으로 대체).

### 🔴 Result 화면 Creative별 진행도 표시 (사장 요청)
* 전부 완료를 기다리지 않고 **완료된 creative부터 순차 노출**. 데이터 구조가 이미 지원(results 부분 채움) — 폴링 중인 getTask 응답에서 채워진 조각만 골라 렌더. 생성 중/완료 상태를 creative 단위로 표시.

### 🟡 Product/Person 업로드 흐름 (의도적으로 미룸)
* UploadZone은 현재 로컬 파일만 들고 있음. Storage `ad_image_storage` 버킷 결정 완료(이번 세션) — 업로드 라우트(music/upload 패턴 검토) 필요. 서버 플로우가 선행이라 나중에.

### 🟡 mock 교체 (2곳)
* CreatePageClient(mockCreateTask/mockGetTask) → 실 API, ResultsPageClient(mockGetTask) → 실 API. `window.__adMockTasks`와 `declare global` 제거. adServerAPI(ad/mock)·`app/api/ad/tasks/*` 정리 포함.

### 🟡 CreateForm Background 제거 반영 (계속 대기)
* 0스크롤 레이아웃에서 Background 섹션 제거 + "각 creative가 서로 다른 배경" 안내 문구.

### 🟡 어법 필터(hard ban) 목록 확장
* `HARD_BANNED_AXIS_PAIRS` 현재 빈 목록. 명백한 모순쌍(night_low×vivid, packshot×golden_hour 등)부터 도메인 판단으로 추가. 추가만 하면 rejection이 자동 처리.

### 🟡 기존 TODO 유지
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기
* 요금 표시 방식(달러 vs 잔여 장수) 미결정
* Remotion 폴더 구조 정리 (미완료)
* 랜딩 CTA `/ad/create` 미연결, 액센트 색 불일치(#EF2B70 vs #E25E2C), ESLint 순환참조(tsc 대체 운용), 결과 화면 에디터 진입 버튼

---

## 4. 참고 (Reminders)

* 공용: `getNextBaseResponse()` 사용, UI는 영어, 들여쓰기 4칸, 함수명 약어 금지. ESLint 불가 — `npx tsc --noEmit`으로 검증.
* **요청 경로**: 클라이언트 `postFetch('/api/ad/image')` → baseFetch가 `/api/client-gateway?path=...`로 래핑 → gateway가 세션 인증(C2S)+`userId` 주입 → `${BASE_URL}`(ngrok)으로 `x-internal-secret`과 함께 전달 → 내부 라우트는 S2S 가드. 내부 체이닝은 `internalFireAndForgetFetch(BASE_URL + 경로)` (query로 식별자, body로 페이로드, waitUntil로 실행 보장).
* **웹훅 관례**: `app/webhook/{provider}/` 위치, 절대 에러 상태로 응답하지 않음(200 유지). suno/fal 선례와 동일. Replicate는 terminal 웹훅 실패 시 exponential backoff 재시도(최종 ~1분) + 드물게 순서 뒤바뀜 — 핸들러 멱등 필수. 이번 세션 webhook 2곳은 `payload.id/status` 최소 검증 + `ratioKey` query/`input.aspect_ratio` fallback 추가, 멱등은 process RPC `coalesce`로 커버.
* **RPC 3종 원리**: 같은 행 jsonb 배열에 병렬 쓰기 → 앱 코드 read-modify-write 금지, RPC 단일 UPDATE+jsonb_set(행 잠금)만 사용. RPC#2는 `p_file_extension` 추가(2026-08-27) — design/score 인자 없음(마커 방식), 마커에 `imageFileExtension` 포함. RPC#3이 analysis 값 채움(확장자 보존).
* **비율 파생 (확정)**: 기준 1:1 우선(없으면 캐노니컬 첫째 — `selectBaseRatio`) 1장 → 나머지는 기준 이미지 참조 재생성(outpainting 아님). ratios 라우트는 중립 실행자 — aspect_ratios length가 모드 판별.
* **Replicate SDK**: `replicate@^1.4.0` 설치됨. `new Replicate({auth})`, `predictions.create({model: 'owner/name', input, webhook, webhook_events_filter:['completed']})`. output은 string|string[]|FileOutput — `adImageServerAPI.extractFirstOutputUrl`로 정규화. 모델 enum: NANO_BANANA(-PRO/-2/-2_LITE). **NANO_BANANA도 aspect_ratio 공식 지원(사장 페이지 직접 확인 2026-08-27)** — 이전 "미지원" 정정.
* **파일 경로 규칙**: 입력 `{user_id}/{batch_id}/{product|person}_image.{ext}`, 출력 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c+ratio+imageFileExtension으로 signed URL 재구성, 목록 DB 저장 불필요. 버킷 `ad_image_storage` (imageServerAPI).
* **AdImageResult**: `design: AdDesignLayout, score: number | null, imageFileExtension: string | null` (2026-08-27 추가) — process가 다운로드 시 `inferFileExtension(Content-Type|URL)`로 확정.
* **LLM**: Creative 디렉터 `DEEPSEEK_V_4_FLASH`(텍스트), Vision 분석 `QWEN_3_8_27B`(멀티모달, 262K→1M, Apache 2.0) — GLM-5.3-Flash/DeepSeek-V4-Vision-Exp/Muse Spark 1.2/Gemini 3.7 Flash 비교 후 분석에 Qwen 선정(2026-08-27). `lib/api/server/ad/llmServerAPI.ts` `llmServerAPI.postAdCreativePrompt`/`postAdImageAnalysis`, 프롬프트는 `lib/llm-prompts/ad/POST_AD_{CREATIVE,IMAGE_ANALYSIS}_PROMPT.ts` 백틱(TODO output_schema).
* **용어 계약 (확정)**: creatives × formats = assets, 실행 1회 = batch. Concept은 전략 계층이라 현재 미사용 — 나중에 훅/스크립트 변주 생기면 그 상위 계층명으로 재등장 가능.
* **시드 규칙**: creative별 서로 다른 seed / 같은 creative 내 비율 = 같은 seed. 재현은 저장된 specs(DB)가 담당 — 샘플러 시드는 매번 새로 뽑아도 됨.
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호.
* **ad_variation_study.md**: §0·§4·§5·§7까지 2026-08-26 결정 반영 완료. 향후 설계 변경 시 이 문서 갱신할 것. (이번 세션: AdImageResult 확장자·RPC#2 시그니처·NANO_BANANA aspect_ratio 지원·Qwen Vision 선정 반영 예정)
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
