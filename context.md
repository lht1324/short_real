# 작업 진행 상황 (Last Updated: 2026-08-20 05:31)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: ad 앱 UI — 데스크탑 최적화 + 생성 구조 "Concept 우선" 전환 완료 (mock 기반)
* **개념 우선 구조 확정** (2026-08-20): 생성 단위를 "비율 우선"에서 **"Concept(주제 변형) 우선 + 비율 파생"**으로 전환. 총 장수 = conceptCount × aspectRatios.length (동일).
* **시드 고정 전제**: 같은 개념의 비율 버전들은 같은 시드 공유 (mock은 같은 이미지+같은 디자인으로 흉내). 단, 같은 seed+다른 비율은 초기 노이즈 shape이 달라 "비슷함" 보장 안 됨 — **실질 일관성은 공통 입력 이미지(I2I)가 보장**. 실서버에서 검증 필요 (실패 시 비율 우선으로 되돌리는 비용 작음).
* **파이프라인 전제**: 이미지 생성 = **I2I 1회** (배경 프롬프트/업로드 + 상품·인물 업로드 → 합성). 배경 T2I→합성 2단계 아님.
* 다음: 실 서버 API 연동 시 mock → `adClientAPI` 호출 교체 (교체 지점 2곳, 하단 참고).

---

## 2. 완수된 작업 (Completed Milestones)

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
* **CreateForm**: "Concepts" → **"Count"** (단위 "images", 설명 "Each image is generated in every format you select."), 섹션 순서 Background→Subjects→**Count**→Formats→CTA, 차감 문구 "10 images × 3 formats = 30 images deducted per attempt". (내부 변수명 conceptCount/conceptIndex는 유지 — 사용자 노출 용어만 images로.)
* **ResultsPageClient**: 비율별 그룹 → **이미지별 그룹** (그룹 헤더 "Image 01 · best 8.2", 그룹 내 비율 순 카드, 그룹 정렬 = 최고 점수 내림차순), 헤더 메타 "30 images · 3 formats".
* **DetailPanel**: "Image 05 · 1:1" 표기, `candidateIndex` prop 제거 (candidate.conceptIndex 사용).
* **mock (클라이언트 + 서버 adServerAPI + route.ts)**: 개념 우선 생성 — 개념별 같은 이미지+같은 디자인(시드 고정 흉내), 비율만 파생. `pickShuffled` 제거.
* `npx tsc --noEmit` 클린.

### 2-3. 비율 멀티 선택 + 와이드 UI, 생성 위저드/결과 화면 (이전 세션, 상세는 이전 context 참고)
* 비율 멀티 선택, `aspectRatios` 배열 계약, 데스크탑 와이드 레이아웃, mock 전역 객체(`window.__adMockTasks`), 상태 머신 폴링.

---

## 3. 향후 작업 (Next Steps)

### 🔴 ad 실 서버 API 연동 (mock 교체)
1. mock 교체 지점 **2곳**: CreatePageClient(mockCreateTask/mockGetTask) → `adClientAPI.postGenerateTask/getTask`, ResultsPageClient(mockGetTask) → `adClientAPI.getTask`.
2. 실 백엔드는 별도 서버(ngrok BASE_URL)에 `/api/ad/*` 라우트 구현 — client-gateway가 프록시하므로 프론트 `app/api/ad/*` 라우트는 도달 불가(죽은 코드, 실 서버 이전 대상).
3. **Concept 우선 파이프라인**: conceptCount × aspectRatios 순회. 개념별 서로 다른 seed, 같은 개념 내 비율 = 같은 seed.
4. **모델 선정 조건**: seed 지정 가능 + 비율별 해상도 지원 (1:1=1024², 4:5=832×1216, 9:16=768×1344 등).
5. **검증 항목**: 같은 개념의 비율 3장이 "같은 배경/상품의 다른 비율 버전"으로 보이는가 (seed 동일 여부는 부수 확인). 실패 시 비율 우선으로 재논의.
6. 스키마 이관: 임시 타입(`adClientAPI.ts`) → `lib/api/types/ad/` 분리.
7. 파이프라인: Supabase 태스크 테이블 + I2I 1회(배경+상품/인물 합성) + Gemini 설계(첨언 해석 레이어 포함) + 결정론적 렌더.

### 🔴 Remotion 폴더 구조 정리 (미완료)
1. `components/remotion/client/` 폴더 신설 — 클라이언트 컴포넌트(`SceneBlock`·`CaptionLayer`·`ShortRealRoot`·`fonts.ts`) 이전.
2. 기존 ffmpeg 로직 삭제 (`app/api/video/merge/...`, `videoServerAPI.postFinalVideo` 등, 웹훅 3개).
3. 배속 씬 올-인-원 전환 (`render-final-video.ts`의 `postProcessedVideo` 분기 제거).

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
* 개념 계약: `conceptCount`(장 수) × `aspectRatios`(비율 수) = 총 장수, `AdCandidate.conceptIndex`로 그룹핑. 사용자 노출 용어는 "images" (섹션 "Count").
* 시드 규칙: 개념별 서로 다른 seed / 같은 개념 내 비율 = 같은 seed. I2I 1회 구조. 같은 seed+다른 비율 = 초기 노이즈 shape 상이 (비슷함 미보장, 공통 입력 이미지가 일관성 담당).
* client-gateway는 `BASE_URL`(ngrok 백엔드)로 무조건 프록시 — 프론트 `app/api/*` 라우트는 실서버에 구현해야 함.
* Remotion 4.0.507 습성: `component` prop 타입 추론 불가, `PlayerProps.onEnded` 없음, `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** + `colorSpace: 'bt709'` 필수, 저사양 머신은 `concurrency: 1`.