# 작업 진행 상황 (Last Updated: 2026-08-26 03:36)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: ad 서버 파이프라인 구현 진행 중 — LLM 경계까지 완료, Replicate 제출부 대기 (2026-08-26 ~)

* **이번 세션 설계 확정 (2026-08-26)**
  * **용어: Creative 유지** — Edition(복제·판을 암시, 업계 어휘 아님)과 Concept(전략 계층 — "concept는 머리에서, creative는 파일로 나온다") 모두 검토 후 기각. 2026 DTC 어휘 조사 근거.
  * **조합 배분 = 코드 샘플러 / 표현 = LLM 확정** — LLM은 빈도 편향 때문에 무중복 보장 불가 + 검증 코드가 어차피 필요. 어법 필터(하드 밴)는 **데이터 상수(`HARD_BANNED_AXIS_PAIRS`)+rejection 방식**, if문 흩뿌리지 않음. v1 밴 목록은 빈 배열로 시작(사장 위임).
  * **플로우 뼈대 확정**: 진입은 `image/route.ts` 1곳(insert까지, 별도 task 생성 라우트 없음 — 나중에 필요해지면 분리). 프롬프트 단계에서 갈래 판정(**비율 1개 → ratios 직통 / 2개 이상 → base**). `generation/base|ratios` · `webhook/.../image/base|ratios` · `process/base|ratios` 전부 분리 — **webhook_url을 prediction마다 다르게 지정**해서 판별을 라우팅에 위임. `ratios` 라우트는 **중립 실행자**(aspect_ratios length로 직통/뒤따름 모드 판별, param 불필요 — 어차피 DB 조회 필수).
  * **process 연쇄**: process/base → 저장+RPC → ratios 재호출 / process/ratios → 저장+RPC → `isLastCreative=true`면 analysis 호출.
  * **병렬 오케스트레이션 확정 (사장)**: 프롬프트 단계부터 creative별 독립 주행 — 각자 캡션→베이스→파생(또는 1장)→분석까지 자동. UI도 전부 완료를 기다리지 않고 **완료된 creative부터 progressive 표시**하는 게 방향. 사장 지시: "DB 업데이트 타이밍 때문에 깨지지 않게만 신경 써라".
  * **RPC 1종 → 3종으로 갱신** (위 병렬 결정의 귀결): 쓰는 주체가 3종이라 각자 전용 RPC. 원리 = 앱 코드 read-modify-write 금지, **단일 UPDATE 문 안에서 jsonb_set 수술(행 잠금 직렬화)**:
    1. `update_creative_prompt_outputs(batch_id, creative_index, image_specs, copy)` — 프롬프트 산출물
    2. `update_creative_image_by_ratio_generation_completed(batch_id, creative_index, ratio_key)` — 웹훅마다 완료 마커(멱등) + `{isLastCreative, batchCompleted}` 반환. ★기존 시그니처의 design/score 인자 폐기 — 웹훅 시점엔 Vision 전이라 값이 없음. 마커 존재 자체가 완료 신호. 전부 생성 시 status → `designing`
    3. `update_creative_image_analysis(batch_id, creative_index, image_results)` — design/score 슬라이스 교체, score 전부 채워지면 → `completed`
  * **상태 흐름 확정**: `queued ─specs→ generating ─전부 생성→ designing ─전부 분석→ completed`, 어느 단계든 실패 시 `failed`.
  * **모델 라인업 확인**: Replicate google 계열 4종 = nano-banana(Gemini 2.5 Flash Image, aspect_ratio 미지원) / -pro(Gemini 3 Pro, 최대 4K) / -2(Gemini 3.1 Flash, 현재 주력급) / -2-lite(최저가·1K 한정). "lite 원본 세대", "2-pro"는 존재 안 함.
* **구현 완료 (tsc 클린)**
  * `lib/api/types/supabase/ad/AdGenerationBatch.ts`: background 필드 제거, `imageSpecs` → `Partial<Record>` (배분 시점엔 캡션 없음), `AdPipelineStartRequest`(진입 body 계약, camelCase) 추가
  * `lib/api/server/ad/adGenerationBatchServerAPI.ts`: insert/get/patch/status 래퍼 신규
  * `lib/api/server/ad/creativeCombinationSampler.ts`: 5축 풀 33키워드 + `HARD_BANNED_AXIS_PAIRS`(빈 상수) + `selectBaseRatio`(1:1 우선, 없으면 캐노니컬 첫째) + `assignCreativeCombinations`(무중복·축별 예산 ceil(n/pool)·rejection·단계적 완화로 배치 사망 방지)
  * `app/api/ad/image/route.ts`: S2S→검증→비율 정규화('1:1'→'1_1')→insert→specs 체이닝. 스켈레톤 주석 유지
  * `app/api/ad/creative/specs/route.ts`: 배분→results 골격 초기화→status generating→creative 수만큼 prompt fan-out (queued 가드로 이중 발화 방어)
  * `app/api/ad/creative/[creative-index]/prompt/route.ts`: 스캐폴드 — CD 입력 재료 조립까지만 하고 `501` 반환. TODO 블록에 LLM 후 처리 순서 주석(RPC#1 저장 → 갈래 판정 → generation 호출)
  * `lib/ReplicateClient.ts`: `postAdImageEditPrediction({model?, prompt, imageUrls, aspectRatio?, webhookUrl})` 비동기 제출(completed 필터 — 실패·취소 포함), `getAdImageEditPrediction` 폴링용, `ReplicateImageModelId` enum 4종. replicate@1.4.0 실제 타입 기준(auth 생성자·`webhook_events_filter` 스네이크)
  * 빈 라우트 파일 생성됨(사장): generation/base·ratios, webhook/ad/replicate/image/base·ratios, process/base·ratios, analysis
* **사장 작업 대기**: Supabase 대시보드에서 `supabase/ad_generation_batches.sql` 실행 — 테이블 + RPC 3종. ⚠️ `user_id text`로 작성됨, users.id가 uuid면 변경 필요.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-12. 서버 파이프라인 설계 확정 + LLM 경계까지 구현 (2026-08-26)
* 위 "현재 상황" 전체가 이번 세션 산출물. 용어 논쟁(Edition/Concept) 종결, 배분 주체=코드 확정, 플로우 뼈대 확정, RPC 3종 갱신, ReplicateClient 작성.

### 이전 마일스톤 요약 (상세는 git 히스토리 참조)
* **2-11 (08-24)**: results 구조 확정 — `AdCreativeResult[]`(copy+imageResults 미러)
* **2-10 (08-24)**: 변주 설계 합의 — 다름의 단위=Creative, LLM=creative당 1회, 헤드라인/CTA 오버레이 분리
* **2-9 (08-22)**: 결과 화면 — 실비율 카드, Creative 용어, 균등 높이 행, 캐노니컬 정렬
* **2-5~2-8 (08-22)**: CreateForm 0스크롤 리디자인, px→rem 일괄 교체, UploadZone 개선, fal I2I 스키마 조사
* **2-1~2-4 (08-20~21)**: 데스크탑 최적화, concept 우선 구조, batch 용어 교체

---

## 3. 향후 작업 (Next Steps)

### 🔴 ad 파이프라인 잔여 구현 (순서대로)
1. **generation/base·ratios**: ReplicateClient로 prediction 제출. 웹훅 URL = `${BASE_URL}/webhook/ad/replicate/image/{base|ratios}?batch_id=&creative_index=` (ratio_key 식별은 query에 넣을지 웹훅 payload input에서 읽을지 미확정 — 구현 때 결정). ratios는 중립 실행자(length 판별+selectBaseRatio로 남은 비율 도출, 기준 이미지는 규칙 경로 signed URL 재조립).
2. **webhook/base·ratios**: fal 웹훅 패턴 그대로 — 파싱·최소 검증 → internalFireAndForgetFetch로 process 전달 → **항상 200** (재시도 폭풍 방지). payload의 `request_id/id` 멱등 방어.
3. **process/base·ratios**: 이미지 다운로드→Storage 저장(경로 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}`)→RPC#2. 실패 prediction 처리(failed 전이). base 성공 시 ratios 재호출.
4. **analysis**: Gemini Vision이 creative 묶 평가(design/score) → RPC#3. 트리거는 RPC#2의 isLastCreative.
5. **prompt LLM 연결**: OpenRouter DeepSeek V4 Flash 호출 → RPC#1로 specs[i].imageSpecs+results[i].copy 저장 → 비율 갯수 판정 → base 또는 ratios 호출.

### 🔴 사장: Supabase SQL 실행 (`supabase/ad_generation_batches.sql`)
* user_id 타입(uuid 여부) 확인 후 실행. RPC 3종 포함됨.

### 🔴 Result 화면 Creative별 진행도 표시 (사장 요청)
* 전부 완료를 기다리지 않고 **완료된 creative부터 순차 노출**. 데이터 구조가 이미 지원(results 부분 채움) — 폴링 중인 getTask 응답에서 채워진 조각만 골라 렌더. 생성 중/완료 상태를 creative 단위로 표시.

### 🟡 Product/Person 업로드 흐름 (의도적으로 미룸)
* UploadZone은 현재 로컬 파일만 들고 있음. Storage 버킷명 결정 + 업로드 라우트(music/upload 패턴 검토) 필요. 서버 플로우가 선행이라 나중에.

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
* **웹훅 관례**: `app/webhook/{provider}/` 위치, 절대 에러 상태로 응답하지 않음(200 유지). suno/fal 선례와 동일. Replicate는 terminal 웹훅 실패 시 exponential backoff 재시도(최종 ~1분) + 드물게 순서 뒤바뀜 — 핸들러 멱등 필수.
* **RPC 3종 원리**: 같은 행 jsonb 배열에 병렬 쓰기 → 앱 코드 read-modify-write 금지, RPC 단일 UPDATE+jsonb_set(행 잠금)만 사용. RPC#2는 design/score 인자 없음(마커 방식), RPC#3이 analysis 값 채움.
* **비율 파생 (확정)**: 기준 1:1 우선(없으면 캐노니컬 첫째 — `selectBaseRatio`) 1장 → 나머지는 기준 이미지 참조 재생성(outpainting 아님). ratios 라우트는 중립 실행자 — aspect_ratios length가 모드 판별.
* **Replicate SDK**: `replicate@^1.4.0` 설치됨. `new Replicate({auth})`, `predictions.create({model: 'owner/name', input, webhook, webhook_events_filter:['completed']})`. output은 string|string[]|FileOutput — `collectOutputUrls`로 정규화. 모델 enum: NANO_BANANA(-PRO/-2/-2_LITE). pro·2는 aspect_ratio 입력 공식 지원(원본은 미지원 — 참조 재생성 방식 유지 근거).
* **파일 경로 규칙**: 입력 `{user_id}/{batch_id}/{product|person}_image.{ext}`, 출력 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c+ratio만으로 signed URL 재구성, 목록 DB 저장 불필요.
* **용어 계약 (확정)**: creatives × formats = assets, 실행 1회 = batch. Concept은 전략 계층이라 현재 미사용 — 나중에 훅/스크립트 변주 생기면 그 상위 계층명으로 재등장 가능.
* **시드 규칙**: creative별 서로 다른 seed / 같은 creative 내 비율 = 같은 seed. 재현은 저장된 specs(DB)가 담당 — 샘플러 시드는 매번 새로 뽑아도 됨.
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호.
* **ad_variation_study.md**: §0·§4·§5·§7까지 2026-08-26 결정 반영 완료. 향후 설계 변경 시 이 문서 갱신할 것.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
