# 작업 진행 상황 (Last Updated: 2026-08-21 05:35)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: CreateForm UI/UX 전면 점검 후 개선 (2026-08-21 승격)
* **문제 1 — 패널 내부 스크롤**: 컨트롤 패널(`max-h-[calc(100vh-6.5rem)] overflow-y-auto`)이 세로로 길어지며 **내부 스크롤 발생** — 사장이 강하게 비선호. 5개 카드 세로 합 ≈1150px vs 사용 가능 높이 ≈720px. 원인: 업로드 존 3개(배경/상품/인물)가 공간의 절반 이상 차지.
* **문제 2 — 미리보기가 가로로 너무 김**: 1:1 캔버스 700px, 16:9는 폭이 크게 늘어남. 폼 폭(기존 620px 고정) 대비 프리뷰 칼럼(716px)이 과대.
* **문제 3 — 레이아웃 혼재**: Background|Subjects만 2열, 나머지(Formats/Count/CTA)는 1열 — "행당 하나"로 통일 논의 중(사장 제안: 업로드 카드도 단일 행).
* 후보 해법 (사장 미결정): **A안 업로드 '사진 트레이' 컴팩트화(추천)** / B안 접이식 카드 / C안 페이지 스크롤 전환. step 분리 없이 클릭으로 확인 가능해야 함.
* 레이아웃 실험 진행 중: `620px_1fr` → `minmax(0,1fr)×2`(체감 차이 없음) → **`minmax(0,3fr)_minmax(0,2fr)` 적용(= 폼 801px/프리뷰 535px @1440)** — **사장 화면 확인 대기** (브라우저 캐시 가능성 → 하드 리프레시 확인 필요).
* 사장 취향: 특정 px 하드코딩 회피, 비율(fr) 기반 선호. "필요한 거라면 상관없음".
* 용어 교체(attempt→batch, images→variations)는 **완료** (하단 2-4).

---

## 2. 완수된 작업 (Completed Milestones)

### 2-4. 용어 교체 + CreateForm 레이아웃 조정 (2026-08-21)
* **attempt → batch 전면 교체**: CreateForm 푸터/헤더 "per batch", FAQSection("one batch is one quality-gated set of candidates"), PricingSection, FeaturesSection("Every batch is a set of candidates"), HowItWorksSection("One batch, one credit" / "1 batch = 1 credit").
* **생성 단위 "images" → "variations"**: Count 버튼 라벨, "Each variation is generated in every format you select.", 푸터 "10 variations × 3 formats = 30 images deducted per batch", CreatePageClient formatMeta("10 variations · 3 formats")·running 문구. Generate 버튼("Generate 30 images")은 **총 장수 표기로 유지**.
* **Count/CTA 카드 `md:col-span-2` 확장** — "variations"(10자) 라벨이 4열 절반 폭(버튼 ~53px)에서 넘침 → 전체 폭 카드(버튼 ~127px)로 해결. 라벨에 `whitespace-nowrap` 추가.
* **CreatePageClient 그리드 실험**: `lg:grid-cols-[620px_1fr]` → `[minmax(0,1fr)_minmax(0,1fr)]`(사장 "달라진 게 없어" — 48px 차이 불과) → `[minmax(0,3fr)_minmax(0,2fr)]`로 확대 적용. **확인 대기**.
* `npx tsc --noEmit` 클린 (기존 `.next-docker` stale 라우트 에러 7건은 무관, 사전 존재).

### 2-1. 데스크탑 UI 최적화 (2026-08-20)
* **body 폰트**: `Arial` → Satoshi 적용했으나 **전역 침투 문제로 원복** — ad는 `app/ad/layout.tsx`의 `font-satoshi` 클래스로 한정 적용, 랜딩은 기존 폰트 유지.
* **트랜지션 통일**: 모든 인터랙티브 요소에 `cubic-bezier(0.16,1,0.3,1)` 적용, 버튼 active 피드백(scale 0.97~0.99) 추가.
* **CTA 토글**: `transition-[left]` → `translate-x-[24px]` (GPU-safe), knob에 `shadow-sm` 추가해 트랙과 분리 (여백 착시 해소). 트랙 52px·knob 20px·여백 4px 균등.
* **Background 카드**: `min-h-[7em]` → `min-h-[10em]` — Generate/Upload 탭 전환 시 높이 점프 제거, 텍스트 모드 플레이스홀더 전체 표시.
* **PreviewCanvas**: 폭 640px 고정 → **높이 `h-[min(72vh,700px)]` 고정 + aspect-ratio로 폭 자동** — 비율 변경 시 세로 길이 변화로 인한 스크롤 점프 제거 (1:1≈700×700 / 4:5≈560×700 / 9:16≈394×700).
* **Results**: 카드 그리드 `minmax(220px,1fr)`, DetailPanel 2xl에서 360→400px, h1 `md:text-4xl`, 스티키 `top-24`로 수렴, CandidateCard 호버 tinted shadow.

### 2-2. 생성 구조 전환 — "Concept 우선 + 비율 파생" (2026-08-20)
* **배경**: 사장 직관("1장의 비율 3개, 2장의 비율 3개...")과 실제 파이프라인(I2I 1회)의 불일치 해소. 비율 우선(주제 30개) → 개념 우선(주제 10개 × 3비율)으로 재구성.
* **API 계약**: `AdGenerateRequest.candidateCount` → **`conceptCount`**, `AdCandidate.conceptIndex` 추가, `AD_CANDIDATE_OPTIONS` → `AD_CONCEPT_OPTIONS`.
* **CreateForm**: "Concepts" → **"Count"**, 섹션 순서 Background→Subjects→Count→Formats→CTA, 차감 문구. (내부 변수명 conceptCount/conceptIndex는 유지 — 사용자 노출 용어만 변경.)
* **ResultsPageClient**: 비율별 그룹 → **이미지별 그룹** (그룹 헤더 "Image 01 · best 8.2", 그룹 내 비율 순 카드, 그룹 정렬 = 최고 점수 내림차순), 헤더 메타 "30 images · 3 formats".
* **DetailPanel**: "Image 05 · 1:1" 표기, `candidateIndex` prop 제거 (candidate.conceptIndex 사용).
* **mock (클라이언트 + 서버 adServerAPI + route.ts)**: 개념 우선 생성 — 개념별 같은 이미지+같은 디자인(시드 고정 흉내), 비율만 파생. `pickShuffled` 제거.
* `npx tsc --noEmit` 클린.

### 2-3. 비율 멀티 선택 + 와이드 UI, 생성 위저드/결과 화면 (이전 세션, 상세는 이전 context 참고)
* 비율 멀티 선택, `aspectRatios` 배열 계약, 데스크탑 와이드 레이아웃, mock 전역 객체(`window.__adMockTasks`), 상태 머신 폴링.

---

## 3. 향후 작업 (Next Steps)

### 🔴 CreateForm UI/UX 전면 점검 후 개선 (2026-08-21, 최우선)
1. **일단 3fr:2fr 그리드(폼 801/프리뷰 535) 화면 확인 대기** — 차이 안 보이면 하드 리프레시. 이후 폼/프리뷰 비율 2,000원 조율.
2. **패널 내부 스크롤 해결** — 후보: A안 업로드 '사진 트레이'(추천, 업로드 3존이 공간의 절반 차지) / B안 접이식 카드 / C안 페이지 스크롤 전환. 제약: step(위저드) 분리 없이 **클릭만으로 접근** 가능해야 함.
3. **업로드 카드(Background/Subjects) 단일 행 통일 여부** — 사장 제안. 전 카드 1열로 통일 시 5행, 패널 내부 스크롤 위험 증가 → A안과 함께 평가.
4. 비교 참고: 사장은 특정 px 하드코딩 비선호(비율 기반), 디자인 스킬 지침 "컴팩트 라벨은 한 줄 유지"(폭 확보), UI 스킬 검색 결과 "progressive disclosure" 패턴 권장.

### 🔴 ad 실 서버 API 연동 (mock 교체)
1. mock 교체 지점 **2곳**: CreatePageClient(mockCreateTask/mockGetTask) → `adClientAPI.postGenerateTask/getTask`, ResultsPageClient(mockGetTask) → `adClientAPI.getTask`.
2. 실 백엔드는 별도 서버(ngrok BASE_URL)에 `/api/ad/*` 라우트 구현 — client-gateway가 프록시하므로 프론트 `app/api/ad/*` 라우트는 도달 불가(죽은 코드, 실 서버 이전 대상).
3. **Concept 우선 파이프라인**: conceptCount × aspectRatios 순회. 개념별 서로 다른 seed, 같은 개념 내 비율 = 같은 seed.
4. **모델 선정 조건**: seed 지정 가능 + 비율별 해상도 지원 (1:1=1024², 4:5=832×1216, 9:16=768×1344 등).
5. **검증 항목**: 같은 개념의 비율 3장이 "같은 배경/상품의 다른 비율 버전"으로 보이는가 (seed 동일 여부는 부수 확인). 실패 시 비율 우선으로 재논의.
6. 스키마 이관: 임시 타입(`adClientAPI.ts`) → `lib/api/types/ad/` 분리.
7. 파이프라인: Supabase 태스크 테이블 + I2I 1회(배경+상품/인물 합성) + Gemini 설계(첨언 해석 레이어 포함) + 결정론적 렌더. **Batch(생성 실행 1회)를 다루는 데이터 테이블명은 `ad_generation_batches`로 확정** — 생성 1회(batch)당 conceptCount × aspectRatios 장수, 이후 DB 작업 시 이 이름 사용.

### 🔴 Remotion 폴더 구조 정리 (미완료)
1. `components/remotion/client/` 폴더 신설 — 클라이언트 컴포넌트(`SceneBlock`·`CaptionLayer`·`ShortRealRoot`·`fonts.ts`) 이전.
2. 기존 ffmpeg 로직 삭제 (`app/api/video/merge/...`, `videoServerAPI.postFinalVideo` 등, 웹훅 3개).
3. 배속 씬 올-인-원 전환 (`render-final-video.ts`의 `postProcessedVideo` 분기 제거).

### 🟡 TODO — 사장 확인/피드백 대기
* **결과 페이지 균일 타일 수정 피드백 대기** — CandidateCard aspect-square 균일 프레임 + 내부 contain 수정에 대한 사장 피드백("2번, 이따 하자"로 미룸). 여러 비율 선택 시 들쭉날쭉 문제 해결 여부 확인 필요.
* CreateForm 섹션 재배치(Background→Subjects→Formats→Count|CTA) UI 확인 — CreateForm 전면 점검과 함께 진행.

### 🟡 TODO — 요금 표시 방식 (미결정)
* 생성 배치 차감 문구를 **실제 달러 표시**로 할지, **잔여 생성 가능 장수** 표시로 할지 미결정.
* 기준: Nano Banana 기본 모델 1회 실행 $0.039 (크레딧은 사용하지 않음).
* 반영 후보 위치: CreateForm 푸터("X images deducted per batch"), CreatePageClient 차감 문구, AppHeader 사용량 게이지.

### 🟡 잔여 확인/이슈
* 랜딩 CTA "Start creating"이 `/ad/create` 미연결 (`#pricing` 앵커).
* 액센트 색 불일치: 코드 `#EF2B70`(마젠타) vs 기획서 11-2 `#E25E2C`(burnt orange).
* ESLint 설정 순환참조로 린트 불가 — `tsc --noEmit`으로 대체 확인.
* 대시보드 MVP 1차 범위 — 미결정.
* 결과/확인 화면의 에디터 진입 버튼 (자리만 vs 숨김) — 미결정.
* 결과 화면 그룹 내 카드 순서: 현재 비율 순 고정 (1:1→4:5→9:16). 사장 확인 필요.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어 표기, 들여쓰기 공백 4칸.
* ad 폰트는 `app/ad/layout.tsx`의 `font-satoshi`로 ad 하위 한정. globals.css `body`는 Arial 유지 (랜딩 폰트와 분리).
* mock 구조: `window.__adMockTasks: Record<string, AdTask>` — CreatePageClient가 생성·상태 갱신, ResultsPageClient가 조회·후보 생성(개념 우선 flatMap). 실 구현 시 이 전역 객체와 `declare global` 블록 제거.
* 개념 계약: `conceptCount`(variations) × `aspectRatios`(formats) = 총 장수(images), `AdCandidate.conceptIndex`로 그룹핑. 사용자 노출 용어: **variations**(포맷당 생성 버전 수) / **images**(총 장수) / **batch**(생성 실행 1회) — 3단계 정리 완료.
* 시드 규칙: 개념별 서로 다른 seed / 같은 개념 내 비율 = 같은 seed. I2I 1회 구조. 같은 seed+다른 비율 = 초기 노이즈 shape 상이 (비슷함 미보장, 공통 입력 이미지가 일관성 담당).
* client-gateway는 `BASE_URL`(ngrok 백엔드)로 무조건 프록시 — 프론트 `app/api/*` 라우트는 실서버에 구현해야 함.
* Remotion 4.0.507 습성: `component` prop 타입 추론 불가, `PlayerProps.onEnded` 없음, `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** + `colorSpace: 'bt709'` 필수, 저사양 머신은 `concurrency: 1`.