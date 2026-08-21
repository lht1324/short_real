# Ad Variation Study — "다름" 설계 연구 (2026-08-22, 임시)

## 배경

- CreateForm에서 사용자가 고르는 것: Background(텍스트 또는 업로드 이미지) + Product/Person(이미지, 선택 조합) + aspectRatios(비율 다중) + conceptCount(최대 10) + CTA 토글.
- conceptCount(creatives)를 선택하면 그 수만큼 **전부 서로 달라야** 한다. 비율은 같은 개념의 파생이므로 "다름"은 개념 단위로 정의한다.
- 입력(배경/제품/인물)은 고정된 상태에서 변주를 만들어야 한다.
- **seed만으로는 불가능**: seed는 노이즈 시작점 차이일 뿐, 같은 입력+같은 프롬프트면 결과가 실질적으로 반복된다.
- 변주를 만들어내는 지시문(스펙)이 DB에 저장되어야 재실행 시 같은 결과가 재현된다.

---

## 1. 변주의 축 — 모드별로 다를 수 있는 것

### Generate 모드 (background_prompt != null)

폼의 배경 프롬프트는 "고정 캔버스"가 아니라 **테마의 출발점**이다. 각 개념은 같은 테마에서 시작하되 **장면(scene) 자체를 다르게 재해석**한다.

예) "그리스 산토리니의 하얀 집들이 모인 파란 바닷가":

| c | 장면 지시 |
|---|---|
| 1 | 황금빛 노을, 지붕 위에서 바다와 마을 전경, 따뜻한 오렌지 톤 |
| 2 | 블루아워(blue hour), 흰 벽 클로즈업, 상단에 깔끔한 네거티브 스페이스 |
| 3 | 좁은 골목길, 위에서 내려다보는 앵글, 푸른 돔과 흰 벽 |
| 4 | 저녁 창가 조명, 카페 테라스, 부드러운 옐로우 톤 |
| 5 | 정박한 배들과 부두, 태양이 내리쬐는 정오 |
| ... | ... |

장면 자체가 변주가 되므로 10장이 구조적으로 겹치지 않는다. 제품/인물은 참조 이미지로 위에 합성된다(동일성 유지).

### Upload 모드 (background_image != null)

배경이 실사진(가게/공간)이라 **장면 변경이 애초에 목적이 아니다** (공간 보존). 남는 변주 축:

- **구성/배치**: 제품 위치(중앙/좌측/우측), 크기(스케일), 각도, 클로즈업 여부
- **조명/색 그레이딩**: 같은 사진의 온도·밝기·팔레트 변주
- **디자인 레이어**: 헤드라인 카피, CTA 텍스트/위치, 레이아웃

⚠️ **업로드 모드의 변주 폭은 Generate보다 좁다.** 제품 결정 필요:
- (a) UI에 "변주는 구성·조명·메시지만 바뀝니다" 명시
- (b) 업로드 모드에선 conceptCount 상한 축소 (예: 10 → 4)

---

## 2. "다름" 보장 장치 — 이산(discrete) 변주 스펙 벡터

자유 프롬프트 재작성만으로는 LLM이 "구도만 살짝 다른 비슷한 것"을 반복할 위험이 크다. 그래서 변주를 무한 자유도로 두지 않고, **이산 옵션 풀에서 겹치지 않게 배분**한다.

개념 스펙 벡터 (예):

```
concept = {
  scene: string,            // 장면 지시 (Generate 모드)
  composition: Composition, // wide | mid | close
  productScale: number,     // 작음~큼
  lighting: string,         // e.g. golden_hour | blue_hour | studio | candle_warm
  palette: string,          // e.g. warm_orange | cool_blue | neutral
  headline: string,         // 헤드라인 카피
  cta: string,              // CTA 카피
}
```

- 이산 축 몇 개의 조합(컴포지션 3 × 조명 3 × 팔레트 3 = 27)으로 10개를 겹침 없이 배분할 수 있다.
- 파이프라인 맨 앞의 "크리에이티브 디렉터"(Gemini)가 이 벡터들을 한 번에(또는 개념별로) 생성한다.
- 벡터는 `concepts` 컬럼에 저장 → 재실행/동일 batch 재생성 시 같은 스펙 재사용. seed는 부수 요소일 뿐.

---

## 3. 생성·분석 병렬 처리 구조 (웹훅 기반)

### 문제

- 이미지 N장이 **전부 완성될 때까지** 기다렸다가 설계/분석하면 너무 느리다.
- 목표: **이미지 단위로 (생성 → 분석 → 기록)을 병렬 실행**.

```
이미지 1장 = fal 생성(수십 초) → Gemini 분석(design/score, 수 초) → DB 업데이트
```

각 이미지 체인을 서로 독립적으로 돌리고, 한 batch의 이미지 수만큼 동시에 진행한다.

### 구조 후보

- **Option A — fal 웹훅**: `fal.queue.submit` + webhook 콜백. 이미지 완성 시마다 백엔드가 콜백을 받아 그 이미지에 대한 분석+DB 업데이트를 실행.
- **Option B — 자체 큐/워커**: 백엔드가 이미지 단위 태스크를 관리하며 각자 완료를 감지(폴링)하고 처리.
- HTTP 장기 실행 제한 때문에 "요청 하나에 모든 생성 완료를 기다리는" 설계는 피한다. 웹훅이 자연스럽다.

### DB 업데이트 동시성 문제 (핵심)

이미지 단위 완료 갱신이 **동시에 여러 개** 들어온다. batch의 `results`를 jsonb 배열로 두고 **통째로 replace**하면 race(마지막 쓰기가 앞선 결과를 덮음)가 발생한다.

해결 후보:

1. **RPC (Postgres function) + jsonb 부분 갱신**: `update_batch_result(batch_id, concept_index, aspect_ratio, design, score)` 같은 함수로 원자적 부분 갱신. 테이블 1개 유지 가능.
2. **결과 테이블 부활**: `ad_generation_candidates` — batch_id + concept_index + ratio 행 단위 upsert. 병렬 쓰기에 가장 안전하지만 사장이 제거 선호했음.

미결: RPC vs 후보 테이블. (웹훅 → 분석 → 기록이 이미지 단위로 흩어지면, 부분 갱신이 필수가 되므로 1 또는 2를 골라야 한다.)

---

## 4. 임시 스키마 (미완)

```
ad_generation_batches
├─ id, user_id, status                    (queued|generating|designing|rendering|completed|failed)
├─ background_prompt | background_image   (서로 배타 — null 여부로 모드 판별)
├─ product_image, person_image            ({path, width, height, note} | null)
├─ aspect_ratios[], concept_count, cta_enabled
├─ concepts[]                             ★ 변주 스펙 벡터 (지시문) — 형식 미정
├─ results[]                              (design/score) — 저장 방식 미정 (RPC+jsonb vs 후보 테이블)
└─ created_at, updated_at
```

파일 경로 규칙: `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c 인덱스와 비율만 알면 서명 URL로 재구성 가능. → 이미지 파일 목록을 DB에 저장할 필요 없음.

---

## 5. 남은 결정 사항

- [ ] 업로드 모드 변주 폭: (a) UI 명시 vs (b) conceptCount 상한 축소
- [ ] results 저장: RPC + jsonb 부분 갱신 vs 후보 테이블 부활
- [ ] 크리에이티브 디렉터: 스펙 벡터를 "한 번에 전체" 생성 vs "개념별" 생성
- [ ] 웹훅 인프라: fal 공식 웹훅 vs 자체 큐/워커
- [ ] 업로드 이미지 서버 반입 경로: 클라이언트 direct 업로드(signed upload) 후 path 전달 vs 서버 multipart 수신