# Ad Variation Study — "다름" 설계 연구 (2026-08-22, 임시)

## 배경

- CreateForm에서 사용자가 고르는 것: Background(텍스트 또는 업로드 이미지) + Product/Person(이미지, 선택 조합) + aspectRatios(비율 다중) + conceptCount(최대 10) + CTA 토글.
- conceptCount(creatives)를 선택하면 그 수만큼 **전부 서로 달라야** 한다. 비율은 같은 개념의 파생이므로 "다름"은 개념 단위로 정의한다.
- 입력(배경/제품/인물)은 고정된 상태에서 변주를 만들어야 한다.
- **seed만으로는 불가능**: seed는 노이즈 시작점 차이일 뿐, 같은 입력+같은 프롬프트면 결과가 실질적으로 반복된다.
- 변주를 만들어내는 지시문(스펙)이 DB에 저장되어야 재실행 시 같은 결과가 재현된다.

---

## 0. 전체 흐름 (확정 구조)

```
[사용자 입력] 배경(텍스트/이미지) · 제품 · 인물 · aspectRatios · conceptCount · CTA
        ↓
[DeepSeek V4 Flash 0731 — 크리에이티브 디렉터 (텍스트만)]
    유저 입력 해석 + 카테고리/어법 판단
    + 이미 사용된 조합 히스토리 확인
    → 이산 축 조합 배정 (결정적 1안, 한 번만)
    → 조합 → 한 문장 광고 캡션 (I2I 프롬프트)
        ↓
[캐시] (유저 입력 + 조합 → 캡션 매핑, 재현성)
        ↓
[nano-banana /edit]  참조(제품·인물·배경) + 캡션 → 광고 이미지
        ↓
[Vision 모델 (Gemini)]  생성 이미지 보고 design/score 평가 → DB
```

- **"다름" = 이산 조합 + 유저 입력에 대한 해석** (LLM 난수 아님).
- **DeepSeek = 텍스트 전용**: I2I 프롬프트 작성 담당. 이미지 이해/분석 불가 → 이후 단계 전부 Vision 모델로 한정.

---

## 1. 변주의 축 — 풀 목록 (확정)

Style 축 제거 (캡션에서 피사체·조합에 맞게 표현). **단일 라이트 유지** (복합광[mixed_light] 제외).

### 카메라/구성 (8)
```
hero_shot / packshot / lifestyle_shot / detail_close
flat_lay / overhead_angle / product_in_hand / environment_shot
```

### 조명/시간 (8) — 단일 라이트만
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
- **어법 필터 반영 시 실질 유효 조합 ≈ 2,000~3,000** (추정 — 실프로토 타입에서 측정 필요)

---

## 2. "다름" 보장 장치 — 이산(discrete) 변주 스펙 벡터

- 변주를 **유한한 옵션 풀(위 목록)** 에서 **겹치지 않게 배분**한다. (자유 프롬프트 재작성은 LLM이 비슷한 것 반복 위험 → 금지)
- 개념 스펙 벡터:

```json
concept = {
  "camera": "hero_shot",
  "lighting": "golden_hour",
  "palette": "warm",
  "framing": "centered",
  "layout_tone": "classic_product",
  "headline": "Meet your new favorite.",
  "cta": "Shop now"
}
```

- `concepts[]` 컬럼에 저장 → 재실행 재현. seed는 부수 요소.

---

## 3. 크리에이티브 디렉터 = DeepSeek V4 Flash 0731

- **역할**: 유저 입력(배경 프롬프트, 상품 이미지 경로, 인물) → 어법 판단 + 조합 배정 + **I2I 프롬프트(캡션) 1문장** 생성.
- **결정성**: 후보 여러 개 안 뽑고 **한 번에 1안** 반환 → 캐시로 재현.
- **카테고리** (향수/스킨케어/패션/식품…)는 코드로 다루지 않는다 — 세계지식으로 LLM이 판단 (세상 모든 물건을 코드 테이블로 불가능하기 때문).
- **"이 조합이 광고로 성립하는가"(어법)도 LLM이 판단** — 코드가 블랙리스트(하드 제약)를 두지 않음.

### 활용 시 주의
- DeepSeek는 이미지를 볼 수 없음 → **유저 상품 이미지는 직접 판단 안 함** (경로/설명만). 이미지 퀄리티·어울림 판단이 필요한 지점이 있으면 **VLM(이미지 설명) → DeepSeek** 2단 구조.
- **캡션 퀄리티 한계**: 뛰어난 캡션 대박은 아니고 "성립하는 캡션"을 목표. 뛰어난 캡션은 v2 (브랜드 보이스 학습 등).

---

## 4. 다양성 가드레일 (코드) — 반복 지연장치 3중

1. **배치 내 중복 금지** — 코드가 조합을 중복 없이 배정 (결정적)
2. **배치 간 재사용 추적** — "이 유저는 이미 이 조합 씀" 히스토리를 DeepSeek 컨텍스트로 주입 → 다음 배치에서 겹치는 것 회피
3. **최소 사용률 강제** — 배치 내 각 축 키워드 편향 방지 (예: 카메라 8개 모두 hero_shot 금지 등)

- 장기 사용자까지 고려: 유저가 조합을 계속 소진하면 재생성(리셋) 정책 필요 (추후 결정).

---

## 5. 생성·분석 병렬 처리 구조 (웹훅 기반)

### 문제

- 이미지 N장이 전부 완성될 때까지 기다렸다가 설계/분석하면 느림.
- 목표: **이미지 단위로 (생성 → 분석 → 기록) 병렬 실행**.

```
이미지 1장 = fal 생성(수십 초) → Vision 분석(design/score, 수 초) → DB 업데이트
```

### 구조 후보

- **Option A — fal 웹훅**: `fal.queue.submit` + webhook 콜백. 이미지 완성 시마다 백엔드가 콜백 받아 그 이미지에 대한 분석+DB 실행.
- **Option B — 자체 큐/워커**: 백엔드가 이미지 단위 태스크 관리하며 각자 완료 감지.
- HTTP 장기 실행 제한 때문에 "요청 하나에 전부 완료 대기" 피한다. 웹훅이 자연스럽다.

### DB 업데이트 동시성 문제 (핵심)

이미지 단위 완료 갱신이 동시에 여러 개 들어온다. `results`를 jsonb 배열로 두고 통째로 replace하면 race 발생.

해결 후보:

1. **RPC (postgres plpgsql) + jsonb 부분 갱신**: `update_batch_result(batch_id, concept_index, aspect_ratio, design, score)` — 원자적 부분 갱신. 테이블 1개 유지.
2. **결과 테이블 부활**: `ad_generation_candidates` — batch_id + concept_index + ratio 행 단위 upsert. 병렬 쓰기에 안정하지만 사장이 제거 선호.

미결: RPC vs 후보 테이블.

---

## 6. 임시 스키마 (미완)

```
ad_generation_batches
├─ id, user_id, status                     (queued|generating|designing|rendering|completed|failed)
├─ background_prompt | background_image  (서로 배타 — null 여부로 모드 판별)
├─ product_image, person_image           ({path, width, height, note} | null)
├─ aspect_ratios[], concept_count, cta_enabled
├─ concepts[]                             ★ 변주 스펙 벡터 (5축+카피) — 형식 확정
├─ results[]                              (design/score) — 저장 방식 미정 (RPC vs 후보 테이블)
└─ created_at, updated_at
```

파일 경로 규칙: `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c 인덱스와 비율만 알면 서명 URL로 재구성 가능 → 이미지 파일 목록 DB 저장 불필요.

---

## 7. 남은 결정 사항

- [ ] 업로드 모드 변주 폭: (a) UI 명시 vs (b) conceptCount 상한 축소
- [ ] results 저장: RPC + jsonb 부분 갱신 vs 후보 테이블 부활
- [ ] 크리에이티브 디렉터: 캡션 1회 vs 후보 3개 (현재: 1회 — 결정성)
- [ ] 웹훅 인프라: fal 공식 웹훅 vs 자체 큐/워커
- [ ] 업로드 이미지 서버 반입 경로: 클라이언트 직접 uupload(signed upload) 후 path 전달 vs 서버 multipart 수신
- [ ] 캡션 품질 개선 (브랜드 보이스/샘플 학습) — v2 이후