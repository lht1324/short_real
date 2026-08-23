# Ad Variation Study — "다름" 설계 연구 (2026-08-22, 임시)

## 배경

- CreateForm에서 사용자가 고르는 것: Background(텍스트 또는 업로드 이미지) + Product/Person(이미지, 선택 조합) + aspectRatios(비율 다중) + conceptCount(최대 10) + CTA 토글.
- conceptCount(creatives)를 선택하면 그 수만큼 **전부 서로 달라야** 한다. 비율은 같은 creative의 파생이므로 "다름"은 creative 단위로 정의한다.
- 입력(배경/제품/인물)은 고정된 상태에서 변주를 만들어야 한다.
- **seed만으로는 불가능**: seed는 노이즈 시작점 차이일 뿐, 같은 입력+같은 프롬프트면 결과가 실질적으로 반복된다.
- 변주를 만들어내는 지시문(스펙)이 DB에 저장되어야 재실행 시 같은 결과가 재현된다.

---

## 0. 전체 흐름

```
[사용자 입력] 배경(텍스트/이미지) · 제품 · 인물 · aspectRatios · conceptCount · CTA
        ↓
[코드] 이산 축 조합 배정 (결정적) — 중복 금지·최소 사용률 보장
        ↓
[DeepSeek V4 Flash — 크리에이티브 디렉터 (텍스트 전용)]
    코드가 준 조합 1개 + 유저 입력 해석
    → 비율별 캡션 묶음(imageSpecs) + copy 텍스트(headline/CTA) 생성 (결정적 1안 · 1회)
        ↓
[저장] ad_creative_specs[](축·캡션·seed) + results[i].copy(텍스트)  — 같은 CD 호출의 산출물
        ↓
[nano-banana /edit]  참조(제품·인물·배경) + 캡션 → 광고 이미지
        ↓
[Vision 모델 (Gemini)]  생성 이미지 보고 오버레이 지오메트리(design) 배치 + score 평가
    → results[i].imageResults[ratio].design / .score
```

- **"다름" = 코드가 배정한 이산 축 조합 + 캡션** (LLM 난수 아님).
- **DeepSeek = 텍스트 전용**: 비율별 캡션 작성 담당. 이미지 이해·분석 불가 → 평가 단계는 Vision 모델로 한정.
- **텍스트와 지오메트리는 생성자·시점이 다르다**: copy(문구, 이미지 무관) → CD가 Specs 단계에. design·score(이미지를 봐야 확정) → 이미지 생성 후 Gemini Vision.
- **copy 저장 위치 = results** (specs 아님): specs는 이미지 생성 지시문으로 한정 유지, 수정 화면/재현의 단일 소스는 results(§6).

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
- **어법 필터 반영 시 실질 유효 조합 ≈ 2,000~3,000** (추정 — 실 프로토타입에서 측정 필요)

---

## 2. "다름" 보장 장치 — 이산(discrete) 변주 스펙 벡터

- 변주를 **유한한 옵션 풀(위 목록)** 에서 **겹치지 않게 배분**한다. (자유 프롬프트 재작성은 LLM이 비슷한 것 반복 위험 → 금지)
- **다름의 단위 = Creative (배치 > Creative > 이미지)**. 사는 건 "creative n개"이며, 비율 여러 개는 같은 creative의 매체 파생이므로 **이미지 단위로 달라지면 안 된다**. 가드레일(중복 금지·최소 사용률·재사용 이력)도 전부 **Creative 단위**로만 동작.
- **조합 배분 = 코드가 결정적으로 / 표현 = LLM** : LLM은 코드가 확정한 조합 1개만 받아서 각 비율의 캡션 1문장씩 쓴다. 캡션에 키워드 나열 X, 광고 이미지로 그리는 문장.

### 크리에이티브 스펙 벡터 (합의 완료)

```json
ad_creative_spec = {
  "creativeIndex": 0,
  "camera": "hero_shot",
  "lighting": "golden_hour",
  "palette": "warm",
  "framing": "centered",
  "layout_tone": "classic_product",
  "imageSpecs": {
    "9_16": "vertical scene, product upper third, clean margin lower third",
    "1_1":  "centered product with margin on all sides",
    "16_9": "product at right, generous negative space left"
  },
  "seed": 123456789
}
```

- 카메라·조명·팔레트·프레이밍·레이아웃 5축 = 크리에이티브 특성. 코드가 풀에서 결정적으로 할당하며, 축별 정보가 있어야 "서로 얼마나 다른지"(중복·빈도·재사용)를 판정할 수 있다.
- `imageSpecs` = 이미지(비율) 단위별 최종 I2I 캡션. 같은 creative의 파생이어도 비율마다 다른 캡션을 보관 — 비율마다 컴포지션(여백/상품 배치)이 달라지므로 단일 캡션 재사용은 불충분.
  - 단, **"비율마다 카피를 다르게 쓰는지"는 실측 후** 결정 (v1: 같은 카피 + 비율/구도 파라미터만 다르게).
- **헤드라인·CTA는 imageSpecs(스펙)에 저장하지 않는다** — 이미지 프롬프트에 글자 그리기를 요구하지 않는다(AI 글자 왜곡, A/B 카피 교체, Meta 텍스트 정책). 대신 **같은 CD 호출에서 copy 텍스트를 생성해 results에 저장** (스펙이 아닌 results 구조 — §6).
- `seed`는 부수 신호 — 같은 creative의 비율들이 같은 seed를 공유한다.
- `ad_creative_specs[]` 자체가 캐시 — 완성 후 재현 시 LLM 재호출 없이 저장된 캡션을 그대로 씀.

## 3. LLM 호출 단위 — Creative마다 1회 (비용·일관성)

- 호출 단위 = **Creative마다 1회** (최대 10회), 그 안에서 선택한 비율 전부의 캡션 묶음 반환.
- 이미지마다 1회 호출(최대 50회)은 금지:
  1. 비용·지연이 5배로 늘어남.
  2. 같은 creative의 비율 캡션이 서로 다른 취향이 되면 "한 소재의 매체 변형"이 아니라 "다른 광고"가 됨 — 캠페인 정체성 유실.
  3. 매 요청마다 새로 생성되므로 결정적 1안·캐시가 불가능.
- 결정성: 후보 여러 개 안 뽑고 **1회 생성·저장**.
- 같은 응답에 **copy 텍스트(헤드라인·CTA 문구)** 도 포함된다 — 캡션과 같은 Creative 단위 1회로 생성되어 `results[i].copy`에 저장(§6).

> (미결정) 캡션 1안 vs 후보 3안: 현재는 결정성 우선이라 1안.

---

## 4. 다양성 가드레일 — 3중 (코드 소유)

1. **배치 내 중복 금지** — 코드가 조합을 중복 없이 배분 (결정적)
2. **배치 간 재사용 추적** — "이 유저는 이미 이 조합 사용" 히스토리를 DeepSeek 컨텍스트로 주입 → 다음 배치에서 겹치는 것 회피
3. **최소 사용률 강제** — 배치 내에서 축 키워드 편향 방지 (예: 카메라 8개 모두 hero_shot 금지)

- 장기 사용자: 조합 소진 시 리셋 정책 필요 (추후 결정).

---

## 5. 생성·평가 병렬 구조 (웹훅 기반) + DB race

### 병렬

- 목표: **이미지 1장 단위로 fal 생성 → Vision 평가 → DB 기록** 을 병렬 처리.
- 구조 후보:
   1. fal 웹훅 (`fal.queue.submit` + webhook) — 이미지 완성 때마다 콜백 수신 후 평가·기록
   2. 자체 queue/워커 — 백엔드가 이미지 단위 task 감시
- HTTP 장기 실행 한도 때문에 "요청 1개로 전부 완료" 대기를 피한다.

### DB 동시성 (핵심)

- 이미지 단위 완료 갱신이 동시에 여럿 도착한다. `results` jsonb 배열을 통째로 replace하면 race.
- 선택지:
   1. **RPC(jsonb 부분 갱신)**: 테이블 1개 원자적 부분 갱신. 구조(§6) 확정 기준 RPC 2종:
      - `update_batch_copy(batch_id, creative_index, copy)` — copy(텍스트)는 creative 단위 1회 기록 (파이프라인 초반, CD 산출물)
      - `update_batch_result(batch_id, creative_index, aspect_ratio, design, score)` — design·score는 이미지 단위로 병렬 완료마다 갱신
   2. **결과 테이블 부활** (`ad_generation_candidates`): batch×creative×ratio 행 단위 upsert — 병렬 안전하나 사장이 제거 선호.
- 미결: RPC vs 후보 테이블.

---

## 6. 임시 스키마 (적용 완료 — results 구조 확정, 저장 방식만 미정)

```
ad_generation_batches
├─ id, user_id, status                     (queued|generating|designing|rendering|completed|failed)
├─ background_prompt | background_image  (서로 배타 — null 여부로 구분)
├─ product_image, person_image           ({path, width, height, note} | null)
├─ aspect_ratios[], concept_count, cta_enabled
├─ ad_creative_specs[]                    ★ 확정: AdCreativeSpec (5축 + imageSpecs + seed)
├─ results[]                              ★ 확정: AdCreativeResult[] (copy + ratio별 design/score) — 저장 방식만 미정
└─ created_at, updated_at
```

```ts
// lib/api/types/supabase/ad/AdGenerationBatch.ts (적용됨)
type AdRatioKey = '1_1' | '4_5' | '9_16' | '16_9' | '2_3';

interface AdCreativeSpec {
    creativeIndex: number;
    camera: string; lighting: string; palette: string; framing: string;
    layout_tone: string;
    imageSpecs: Record<AdRatioKey, string>;
    seed: number;
}

// ★ 2026-08-24 확정 — results 산출물 구조 (specs 미러: 배열의 i = 같은 creative, 비율은 Record)
interface AdCopySpec {
    headline: string | null;
    cta: string | null;                 // cta_enabled=false면 null
}

interface AdImageResult {
    design: AdDesignLayout;             // 오버레이 지오메트리(위치·크기·scrim) — 이미지 생성 후 Gemini가 확정
    score: number | null;               // 0.0~10.0 실수, 평가 전 null
}

interface AdCreativeResult {
    creativeIndex: number;              // ad_creative_specs[i]와 1:1 대응
    copy: AdCopySpec;                   // CD가 Specs 단계에 생성 — 텍스트는 이미지 무관, creative당 1회
    imageResults: Partial<Record<AdRatioKey, AdImageResult>>;   // 선택 비율만 — 이미지 생성 후 채워짐
}

interface AdGenerationBatch {
    ...
    ad_creative_specs: AdCreativeSpec[];
    results: AdCreativeResult[];
    ...
}
```

- 스펙(imageSpecs)에 헤드라인/CTA 없음 — **copy(텍스트)는 CD가 생성해 results에**, **지오메트리(design)는 Gemini가 이미지 생성 후 결정**. 둘 다 오버레이 레이어(AdDesignLayout)로 최종 렌더된다.
- 파일 경로 규칙: `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — creative index·ratio만 알면 서명 URL을 다시 만들어 이미지 목록 DB 저장이 불필요.

---

## 7. 남은 결정 사항

- [x] ~~LLM 호출 단위~~ → **Creative마다 1회**, 비율 캡션 묶음(`imageSpecs`) + copy 텍스트 반환 (합의 완료)
- [x] ~~imageSpecs 저장 여부~~ → **ad_creative_specs[] = AdCreativeSpec** (5축 + imageSpecs + seed) — 비율별 캡션 저장 (합의 완료)
- [x] ~~판매 카피를 이미지에 넣는지~~ → **오버레이 레이어로 분산** (AI 글자 왜곡·A/B 카피 교체·Meta 텍스트 정책, 합의 완료)
- [x] ~~results 항목 구조~~ → **AdCreativeResult[]** — copy는 creative당 1회(CD, 텍스트), design·score는 이미지 생성 후 Vision이 비율당 확정 (2026-08-24, §6)
- [ ] 업로드 모드 변주 폭: (a) UI 명시 vs (b) conceptCount 상한 축소
- [ ] **results 저장 방식**: RPC(jsonb 부분 갱신 — copy creative 단위 1회 + ratio 단위 `update_batch_result`) vs 후보 테이블 — 미결 (구조 자체는 §6 확정)
- [ ] 웹훅: fal 공식 웹훅 vs 자체 큐/워커
- [ ] 업로드 이미지 서버 반입 경로: 클라이언트 직접 signed upload 후 path 전달 vs 서버 multipart 수신
- [ ] 캡션 품질 향상 (브랜드 보이스/샘플 학습) — v2 이후