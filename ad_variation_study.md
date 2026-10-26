# Ad Variation Study — "다름" 설계 연구 (2026-08-22, 임시)

## 배경

- CreateForm에서 사용자가 고르는 것: Background(텍스트 또는 업로드 이미지) + Product/Person(이미지, 선택 조합) + aspectRatios(비율 다중) + conceptCount(최대 10) + CTA 토글.
- ⚠️ **2026-08-24 이후: Background(텍스트/업로드) 제거**. 사용자는 Product/Person만 업로드하고, **배경은 Creative마다 AI가 생성** (AdCreative 패턴 — "상품 사진 + 다양한 배경을 AI가 입힘"). Creative 하나하나는 서로 다른 배경을 가짐.
- conceptCount(creatives)를 선택하면 그 수만큼 **전부 서로 달라야** 한다. 비율은 같은 creative의 파생이므로 "다름"은 creative 단위로 정의한다.
- 입력(제품/인물)은 고정된 상태에서 변주를 만들어야 한다. (변주 = 축 조합·캡션·AI 생성 배경)
- **seed만으로는 불가능**: seed는 노이즈 시작점 차이일 뿐, 같은 입력+같은 프롬프트면 결과가 실질적으로 반복된다.
- 변주를 만들어내는 지시문(스펙)이 DB에 저장되어야 재실행 시 같은 결과가 재현된다.

---

## 0. 전체 흐름

```
[사용자 입력] 제품 · 인물 · aspectRatios · conceptCount · CTA · brand_palette(3-5 hex, optional)  (배경 입력 없음 — Creative마다 AI가 배경 생성)
        ↓
[코드] 이산 축 조합 배정 (결정적) — 중복 금지·최소 사용률·HARD_BANNED 8개 보장
        ↓
[DeepSeek V4 Flash — 크리에이티브 디렉터 (텍스트 전용)]
    코드가 준 조합 1개 + 유저 입력 해석 (brand_palette 있으면 nearest 키워드 매핑 + hex를 재질로 체화)
    → 비율별 캡션 레코드(imagePromptRecord, B안) + copy 텍스트(headline/CTA, headline은 항상 생성·렌더 토글) 생성 (결정적 1안 · 1회, n=1 재시도 없음)
        ↓
[저장] ad_creative_specs[](축·imagePromptRecord·seed) + results[i].copy(텍스트)  — 같은 CD 호출의 산출물 (RPC ①)
        ↓
[RATIO 기준 선택 — 1:1 우선, 없으면 캐노니컬 첫째]
    ① 기준 비율(선택 중 1:1 있으면 1:1)로 1장 생성 (참조: 제품·인물 + 캡션)
       - 실패 시 같은 비율 1회 재시도(총 2회), 그래도 실패 시 차순위 base로 폴백 (n=1, 2026-08-28)
    ② 다른 비율들 = "기준 이미지를 참조(reference)로 넣어 그 비율로 재생성"
       (★ "늘리기(outpainting)" 아님 — Nano Banana 비율 확장 제한 확인; 기준 자산(상품/분위기) 유지하며
         각 비율 캔버스에 새로 그림. 배경도 이때 AI가 creative별 배경 생성)
       - base 없거나 error면 원본만으로 폴백 (fail-soft)
       - ratios도 비율별 1회 재시도(총 2회) 후 error 마킹
        ↓
[Replicate prediction + webhook]  (플랫폼 확정 — fal에서 전환, 계정 캡 없음·모델 오토스케일)
        ↓
[RPC ②] update_creative_image_by_ratio_generation_completed
    (완료 마커 `design:null, score:null, imageFileExtension, error` 기록(멱등) + `{isLastCreative, batchCompleted}` 반환. 2026-08-28: `p_error` 추가, 비율 1장 단위 fail-soft)
    전부 생성(성공+실패 합산) 시 status 'generating' → 'designing' 전이
        ↓
[Vision 모델 (Qwen 3.8-27B — 2026-08-27 선정: GLM-5.3-Flash/DeepSeek-Vision-Exp/Muse Spark/Gemini 3.7 비교 후, design 좌표 작업에 Vision2Web·ERQA·BabyVision w/CI 최강)] creative 묶 단위로 성공한 이미지들만 보고 오버레이 지오메트리(design) 배치 + score 평가 (Product-only/Person-only/Both 3분기, 정수% 0-100, brand_palette 있으면 hex adherence 체크, 실패 비율은 스킵)
    → [RPC ③] update_creative_image_analysis로 results[i].imageResults[ratio].design / .score 저장 (실패도 완료로 카운트, 2026-08-28)
      (전부 분석(성공+실패) 시 status 'completed' 전이)
```

- **"다름" = 코드가 배정한 이산 축 조합 + 캡션 + AI 생성 배경(creative별 상이) + brand_palette 있을 때 그 hex의 재질 체화** (LLM 난수 아님).
- **DeepSeek = 텍스트 전용**: 비율별 캡션 작성 담당. 이미지 이해·분석 불가 → 평가 단계는 Vision 모델로 한정.
- **텍스트와 지오메트리는 생성자·시점이 다르다**: copy(문구, 이미지 무관) → CD가 Specs 단계에. design·score(이미지를 봐야 확정) → 이미지 생성 후 Qwen Vision.
- **copy 저장 위치 = results** (specs 아님): specs는 이미지 생성 지시문으로 한정 유지, 수정 화면/재현의 단일 소스는 results(§6).
- **fail-soft**: 비율 1장 실패 → 그 장만 `AdImageResult.error`로 격리, creative·배치는 계속 진행. base 실패는 같은 비율 1회 재시도 후 차순위 base로 폴백, ratios 실패도 1회 재시도.

---

## 1. 변주의 축 — 풀 목록 (확정)

Style 축 제거 (캡션에서 피사체·조합에 맞게 표현). **단일 조명 유지** (복합광[mixed_light] 제외).

### 카메라/구성 (8)
```
hero_shot / packshot / lifestyle_shot / detail_close
flat_lay / overhead_angle / product_in_hand / environment_shot
```

### 조명/시간 (8) — 단일 조명
```
golden_hour / blue_hour / studio_soft / studio_hard
high_key / low_key / overcast / night_low
```

### 팔레트 (7)
```
neutral / warm / cool / vivid / muted / mono / earth_tones
```
*brand_palette 3-5 hex가 있으면 7종 중 nearest 키워드로 매핑 + hex를 재질로 체화 (예: #E25E2C → terracotta plaster). 입력엔 hex 명시, 캡션엔 자연어 번역.*

### 프레이밍 (5)
```
centered / left_of_frame / right_of_frame / negative_space / tight_crop
```

### 레이아웃 톤 (5) — 광고 카피레이아웃의 기본 결정
```
classic_product / lifestyle_narrative / editorial_statement
minimal_modern / bold_impact
```

- **합계: 33개 키워드 / 조합 공간 8×8×7×5×5 = 11,200**
- **어법 필터(하드 밴)**: 금지 축쌍을 데이터 상수(`HARD_BANNED_AXIS_PAIRS`)로 관리하고, 걸린 조합은 폐기 후 재추출(rejection)하는 방식 — if/switch 조건문 흩뿌리지 않음.
  **2026-08-28 확정 8개**: `night_low×vivid`, `low_key×vivid`, `packshot×golden_hour`, `packshot×blue_hour`, `detail_close×negative_space`, `flat_lay×tight_crop`, `environment_shot×tight_crop`, `tight_crop×minimal_modern`.

---

## 2. "다름" 보장 장치 — 이산(discrete) 변주 스펙 벡터

- 변주를 **유한한 옵션 풀(위 목록)** 에서 **겹치지 않게 배분**한다. (자유 프롬프트 재작성은 LLM이 비슷한 것 반복 위험 → 금지)
- **다름의 단위 = Creative (배치 > Creative > 이미지)**. 사는 건 "creative n개"이며, 비율 여러 개는 같은 creative의 매체 파생이므로 **이미지 단위로 달라지면 안 된다**. 가드레일(중복 금지·최소 사용률·재사용 이력)도 전부 **Creative 단위**로만 동작.
- **조합 배분 = 코드가 결정적으로 / 표현 = LLM** : LLM은 코드가 확정한 조합 1개만 받아서 각 비율의 캡션 1문장씩 쓴다. 캡션에 키워드 나열 X, 광고 이미지로 그리는 문장.

### 크리에이티브 스펙 벡터 (합의 완료, 2026-08-28 B안 개명)

```json
ad_creative_spec = {
  "creativeIndex": 0,
  "camera": "hero_shot",
  "lighting": "golden_hour",
  "palette": "warm",
  "framing": "centered",
  "layout_tone": "classic_product",
  "imagePromptRecord": {
    "9_16": "vertical scene, product upper third, clean margin lower third",
    "1_1":  "centered product with margin on all sides",
    "16_9": "product at right, generous negative space left"
  },
  "seed": 123456789
}
```

- 카메라·조명·팔레트·프레이밍·레이아웃 5축 = 크리에이티브 특성. 코드가 풀에서 결정적으로 할당하며, 축별 정보가 있어야 "서로 얼마나 다른지"(중복·빈도·재사용)를 판정할 수 있다.
- `imagePromptRecord` = 이미지(비율) 단위별 최종 I2I 캡션 (B안, 구 `imageSpecs`). 같은 creative의 파생이어도 비율마다 다른 캡션을 보관 — 비율마다 컴포지션(여백/상품 배치)이 달라지므로 단일 캡션 재사용은 불충분.
  - 단, **"비율마다 카피를 다르게 쓰는지"는 실측 후** 결정 (v1: 같은 카피 + 비율/구도 파라미터만 다르게).
- **헤드라인·CTA는 imagePromptRecord(스펙)에 저장하지 않는다** — 이미지 프롬프트에 글자 그리기를 요구하지 않는다(AI 글자 왜곡, A/B 카피 교체, Meta 텍스트 정책). 대신 **같은 CD 호출에서 copy 텍스트를 생성해 results에 저장** (스펙이 아닌 results 구조 — §6). headline은 항상 생성(렌더 토글), CTA는 `cta_enabled`일 때만.
- `seed`는 부수 신호 — 같은 creative의 비율들이 같은 seed를 공유한다.
- `ad_creative_specs[]` 자체가 캐시 — 완성 후 재현 시 LLM 재호출 없이 저장된 캡션을 그대로 씀.
- `brand_palette`는 배치 생성 시 `brand_palette: string[]|null`로 저장, 프롬프트에서 조건부로 반영 (null이면 7종 랜덤, 값 있으면 hex 체화).

## 3. LLM 호출 단위 — Creative마다 1회 (비용·일관성)

- 호출 단위 = **Creative마다 1회** (최대 10회), 그 안에서 선택한 비율 전부의 캡션 묶음 반환.
- 이미지마다 1회 호출(최대 50회)은 금지:
  1. 비용·지연이 5배로 늘어남.
  2. 같은 creative의 비율 캡션이 서로 다른 취향이 되면 "한 소재의 매체 변형"이 아니라 "다른 광고"가 됨 — 캠페인 정체성 유실.
  3. 매 요청마다 새로 생성되므로 결정적 1안·캐시가 불가능.
- 결정성: 후보 여러 개 안 뽑고 **1회 생성·저장**.
- 같은 응답에 **copy 텍스트(헤드라인·CTA 문구)** 도 포함된다 — 캡션과 같은 Creative 단위 1회로 생성되어 `results[i].copy`에 저장(§6). headline은 항상 생성(원본 렌더는 토글), CTA는 조건부.

> (미결정) 캡션 1안 vs 후보 3안: 현재는 결정성 우선이라 1안.

---

## 4. 다양성 가드레일 — 코드 소유

1. **배치 내 중복 금지** — 샘플러가 조합을 중복 없이 배분 (rejection + usedComboKeys)
2. **최소 사용률 강제** — 축별 값 예산(cap = ceil(conceptCount / 풀 크기))으로 편향 방지 (예: 카메라 8종인데 10개 중 한 값 3회 금지)
3. **어법 필터(하드 밴)** — `HARD_BANNED_AXIS_PAIRS` 8개 상수 + rejection (§1). 병목 시 완화 단계를 둬 배분 실패로 배치가 죽지 않게 함.

- **배치 간 재사용 추적**: "이 유저가 이미 쓴 조합"도 **코드가 후보군에서 제외**하는 방식으로 한다.
  (구안의 "DeepSeek 컨텍스트에 히스토리 주입"은 배분이 코드 소유가 된 시점에서 무의미 — 잔재 정리, 2026-08-26.)
  ★ v1 미구현 — 장기 사용자 소진·리셋 정책과 함께 추후.

---

## 5. 생성·평가 병렬 구조 (웹훅 기반) + DB race

### 병렬

- 목표: **이미지 1장 단위로 Replicate 생성 → 저장 → RPC 기록 → (creative 묶) Vision 평가** 를 병렬 처리.
- **플랫폼 확정: Replicate** (`prediction` 생성 + webhook 완료 콜백). fal 대비 — 계정 concurrency 캡(2~40)이 없어 **모델 단위 오토스케일(복제본)**로 수요 폭주 시 병렬이 플랫폼이 스스로 확대됨.
  - (조사 결과 2026-08-24) fal은 `fal.queue.submit`이 429 자동 재시도·큐 무한 수용·drop 없음. Replicate는 600 req/min + prediction 모델 오토스케일. 둘 다 "마지막 유저가 앞선 450건 뒤로 밀리는" 문제를 자체적으로 해소하지 않고, 자체 큐는 병렬 폭을 못 늘림 → 별도 큐 미도입.
- 구조:
   1. **Replicate prediction 생성 + webhook_url 지정** — 이미지 완성 때마다 콜백 수신 (webhook에 `ratioKey`·`attempt` 포함, n=1 재시도)
   2. **웹훅 수신 핸들러: 200 즉시 응답** + 비동기(이미지 저장 → RPC → Vision)
- HTTP 장기 실행 한도 때문에 "요청 1개로 전부 완료" 대기를 피한다.
- 웹훅은 "알림 창구" — 서명 검증/재전송은 1차 보류 (idempotent `request_id/id`로 중복 방어).

### DB 동시성 (핵심) — RPC 3종 확정 (2026-08-28 갱신)

- **병렬 오케스트레이션 확정**: 프롬프트 단계부터 creative별 독립 주행 — 각 creative는
  캡션 → 베이스 → 파생(또는 1장) → 분석까지 자동으로 진행되고, UI는 완료된 creative부터 순차 노출.
  이때 같은 행의 jsonb 배열(`ad_creative_specs`·`ad_creative_results`)을 쓰는 주체가 3종이라
  앱 코드의 read-modify-write는 race를 만든다.
- **원리**: RPC로 단일 UPDATE 문 안에서 `jsonb_set`으로 자기 조각만 수술 — 행 잠금이 직렬화하므로
  동시 호출이 몰려도 서로 덮어쓰지 않는다. (SQL은 직접 전달, 파일 삭제)
  1. `update_creative_prompt_outputs(batch_id, creative_index, image_prompt_record, copy)`
     — 프롬프트 산출물: specs[i].imagePromptRecord + results[i].copy 저장 (B안)
   2. `update_creative_image_by_ratio_generation_completed(batch_id, creative_index, ratio_key, file_extension, p_error)` — (2026-08-28: `p_error` 추가, 비율 1장 단위 fail-soft, `n=1` 재시도: 같은 비율 1회 재시도 후 차순위 base로 폴백)
      — 이미지 웹훅마다 **완료 마커(`design:null, score:null, imageFileExtension, error`) 기록(멱등)** + `{isLastCreative, batchCompleted}` 반환. 성공+실패 합산으로 `generating`→`designing` 전이.
   3. `update_creative_image_analysis(batch_id, creative_index, image_results)`
      — Vision 결과(design/score) 슬라이스 교체. 성공+실패 합산으로 `designing`→`completed` 전이. 실패 비율은 Vision 스킵.

### 상태 흐름 (2026-08-28 확정, fail-soft)

```
queued ──specs 배분──→ generating ──전부 생성(성공+실패)──→ designing ──전부 분석(성공+실패)──→ completed
                                     (specs만 failed 가능, 그 이후는 creative/비율 격리)
```

### Vision 호출 단위 — creative 묶 확정

- 개별 이미지(50회)가 아닌, **creative의 선택 비율 전부 완료된 뒤 1회 묶음** 판단 → 호출 10회로 절감 + 같은 creative 결과의 design 일관성. 성공한 비율만 Vision에 보내고 실패는 스킵. RPC 반환 `isLastCreative`가 트리거.

---

## 6. 임시 스키마 (적용 완료 — results 구조·저장 방식 확정, 2026-08-28 갱신)

```
ad_generation_batches
├─ id, user_id, status                     (queued|generating|designing|rendering|completed|failed)
├─ product_image, person_image           ({imageFileExtension, note?} | null) — path/width/height 제거
│                                          ★ background_prompt/background_image 제거 (2026-08-24: 배경은 AI가 creative별 생성)
├─ aspect_ratios[], concept_count, cta_enabled, brand_palette string[]|null (2026-08-28: 3-5 hex, optional)
├─ ad_creative_specs[]                    ★ 확정: AdCreativeSpec (5축 + imagePromptRecord + seed) (2026-08-28 B안)
├─ ad_creative_results[]                  ★ 확정: AdCreativeResult[] (copy + ratio별 design/score/error) — RPC 3종으로 저장 (§5)
└─ created_at, updated_at
```

```ts
// lib/api/types/supabase/ad/AdGenerationBatch.ts (적용됨)
type AdRatioKey = '1_1' | '4_5' | '9_16' | '16_9' | '2_3';

interface AdUploadedComponentRecord {
    imageFileExtension: string;   // "jpeg" | "png" | "webp" — 규칙 경로의 .ext (카멜, jsonb 키)
    note?: string;
}
// 경로 규칙: {user_id}/{batch_id}/{product|person}_image.{imageFileExtension}
// (path 저장 불필요 — 규칙으로 signed URL 재조립 / background는 컬럼 자체 제거)

interface AdCreativeSpec {
    creativeIndex: number;
    camera: string; lighting: string; palette: string; framing: string;
    layout_tone: string;
    imagePromptRecord: Record<AdRatioKey, string>; // B안, 구 imageSpecs
    seed: number;
}

// ★ 2026-08-28 확정 — results 산출물 구조 (error per-image, brand_palette)
interface AdCopySpec {
    headline: string | null; // 항상 생성, 렌더 토글
    cta: string | null;                 // cta_enabled=false면 null
}

interface AdImageResult {
    design: AdDesignLayout;             // 오버레이 지오메트리(위치·크기·scrim) — 이미지 생성 후 Qwen이 확정 (2026-08-27 Gemini→Qwen)
    score: number | null;               // 0.0~10.0 실수, 평가 전 null
    imageFileExtension: string | null;   // Storage 확장자 — process가 다운로드 시 확정해 RPC 마커로 기록 (2026-08-27 추가)
    error?: { code: string; message: string } | null; // 2026-08-28 fail-soft: 비율 1장 단위 격리
}

interface AdCreativeResult {
    creativeIndex: number;              // ad_creative_specs[i]와 1:1 대응
    copy: AdCopySpec;                   // CD가 Specs 단계에 생성 — 텍스트는 이미지 무관, creative당 1회
    imageResults: Partial<Record<AdRatioKey, AdImageResult>>;   // 선택 비율만 — 이미지 생성 후 채워짐
}

interface AdGenerationBatch {
    ...
    brand_palette: string[] | null; // 2026-08-28
    ad_creative_specs: AdCreativeSpec[];
    ad_creative_results: AdCreativeResult[];
    ...
}
```

- 스펙(imagePromptRecord)에 헤드라인/CTA 없음 — **copy(텍스트)는 CD가 생성해 results에**, **지오메트리(design)는 Qwen이 이미지 생성 후 결정**. 둘 다 오버레이 레이어(AdDesignLayout)로 최종 렌더된다.
- 저장 (RPC 3종, §5): 프롬프트 산출물 → `update_creative_prompt_outputs`, 이미지 웹훅 마커 → `update_creative_image_by_ratio_generation_completed` (비율 단위 error 포함, n=1 재시도), 분석(design/score) → `update_creative_image_analysis` (실패도 완료 카운트).
- 파일 경로 규칙: `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` (버킷 `ad_image_storage`, 2026-08-27 결정) — creative index·ratio+imageFileExtension으로 signed URL 재구성, 목록 DB 저장 불필요.
- UI: `CreateForm` Background 제거, 업로드 `tall` + 한 줄 pill `Brand colors optional·3-5` (react-colorful, #111111 기본, 대문자, 3-5 검증, 3개 미만이면 Batch에 미포함).

---

## 7. 남은 결정 사항

- [x] **LLM 호출 단위** → Creative마다 1회, 비율 캡션 묶음(`imagePromptRecord`) + copy 텍스트 반환
- [x] **imagePromptRecord 저장 여부** → ad_creative_specs[] = AdCreativeSpec (5축 + imagePromptRecord + seed) (B안)
- [x] **판매 카피를 이미지에 넣는지** → 오버레이 레이어로 분산 (AI 글자 왜곡·A/B 교체·Meta 텍스트 정책)
- [x] **results 항목 구조** → AdCreativeResult[] — copy는 creative당 1회(CD, 텍스트), design·score·error는 이미지 생성 후 Vision이 비율당 확정 (§6)
- [x] **전송: fal → Replicate** — prediction+webhook. 계정 concurrency 캡 없음, 모델 단위 오토스케일 (2026-08-24 확정)
- [x] **후보 테이블** — 기각 (jsonb 배열 유지)
- [x] **Background(업로드/텍스트) 제거** (2026-08-24) — Product/Person만 입력, 배경은 AI가 creative별로 생성 (UI 반영 2026-08-28)
- [x] **비율 파생 방식**: 기준 비율 1:1 우선 1장 생성 → 나머지는 기준 이미지 참조 재생성 (outpainting 아님). base 1회 재시도 후 차순위 폴백, base 없으면 원본만 폴백, ratios도 1회 재시도 (2026-08-28)
  ※ Replicate의 nano-banana 계열은 aspect_ratio 입력을 공식 지원 (사장 페이지 직접 확인: 2026-08-27 NANO_BANANA도 지원으로 정정) — 모델 상향 시 "참조+비율 파라미터" 병행 가능
- [x] **조합 배분 주체 = 코드 샘플러** (2026-08-26) — LLM 빈도 편향으로 무중복 보장 불가 + 검증 코드가 어차피 필요.
  어법 필터 = `HARD_BANNED_AXIS_PAIRS` 8개 상수 + rejection (2026-08-28)
- [x] **RPC 3종 갱신** (2026-08-28) — prompt_outputs B안 / by_ratio_generation_completed `p_file_extension`+`p_error` + fail-soft per-image / analysis error 카운트 (§5)
- [x] **병렬 오케스트레이션** (2026-08-26) — 프롬프트부터 creative별 독립 주행, UI는 완료된 creative부터 순차 노출 (§5)
- [x] **하드 밴 목록 확장** — 8개로 확장 완료 (2026-08-28)
- [x] **브랜드 팔레트** — `brand_palette` 3-5 hex optional, 입력 null이면 7종 랜덤, 값 있으면 nearest 키워드 매핑 + hex 체화, 캡션엔 자연어 번역 (2026-08-28)
- [ ] **배치 간 재사용 추적** — v1 미구현 (코드가 후보군에서 제외하는 방식, 장기 사용자 리셋 정책과 함께)
- [ ] (보류) 캡션 품질 향상 (브랜드 보이스/샘플 학습) — v2 이후
