# 작업 진행 상황 (Last Updated: 2026-08-19 03:27)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: shortreal.ai/ad 앱 UI — 생성 위저드(2스텝) + 결과/확인 화면 (mock 기반)
* **비율 멀티 선택 + 데스크탑 와이드 UI 반영 완료** (2026-08-19). 생성/결과 전체 플로우 UI 구축 완료. mock은 **tsx 컴포넌트 내부에 직접 구현** (baseFetch/client-gateway 프록시 사용 안 함).
* **사이즈 매트릭스(결정론적 크롭/리프레임) 폐기 확정** — "비율별 개별 생성"으로 전환: format × candidate = 총 장수, 시도당 차감과 동일.
* 다음: 실 서버 API 연동 시 mock 함수 → `adClientAPI` 호출로 교체 (교체 지점 **2곳**, 하단 참고).

---

## 2. 완수된 작업 (Completed Milestones)

### 2-1. 비율 멀티 선택 + 데스크탑 와이드 UI (2026-08-19)
* **비율 전략 전환 (사장 확정)**: 프롬프트 클린 존 + 결정론적 크롭/리프레임(사이즈 매트릭스)은 모델 능력에 기대는 문제로 판단 → 폐기. 필요한 비율(1:1/4:5/9:16)은 **처음부터 각각 개별 생성**.
* **StepGenerate**: Format **멀티 선택** (체크 배지, 최소 1개 강제), 차감 문구 실시간 계산 "2 formats × 4 candidates = 8 images deducted per attempt".
* **CreatePageClient**: `aspectRatios: AdAspectRatio[]` 상태, 미리보기 비율 칩 전환(첫 선택 비율 자동 동기화), 와이드 레이아웃 `max-w-[1440px]`, 캔버스 640px 확대.
* **ResultsPageClient**: **비율별 그룹 섹션** (그룹 내 점수 내림차순, "1:1 · 4 candidates" 헤더), `max-w-[1600px]`, 그리드 `minmax(200px, 1fr)` — 데스크탑 4~6열.
* **DetailPanel**: 사이즈 프리셋 4종/파생 미리보기 **제거** → 점수 + 후보 미리보기 + 원본 다운로드 + 에디터 버튼만.
* **API 계약 변경**: `AdGenerateRequest.aspectRatio` → `aspectRatios: AdAspectRatio[]`, `AdCandidate.ratio` 추가. `AdSizePreset/AdDerivedImage/AD_SIZE_PRESETS/postDerivedSize` **제거**, `app/api/ad/tasks/[taskId]/derived/route.ts` 삭제. 실 서버 이전 시 이 계약 사용.
* **pickShuffled 중복 허용 수정**: 후보 10장 선택 시 이미지 풀 9장 한계 해결 (풀 초과 시 순환 채움, 클라이언트+서버 mock 동일 적용).
* `npx tsc --noEmit` 클린.

### 2-2. ad 앱 UI — 생성 위저드 + 결과/확인 (2026-08-18, mock 기반)
* **화면 구조**: `/ad/create` (위저드 2스텝 + 생성 진행 3번째 뷰), `/ad/create/results?taskId=` (비율별 그룹 + 상세 패널). 랜딩과 분리된 앱 구조 (`components/page/ad/app-header/` 별도 헤더 + ThemeToggle 포함).
* **생성 플로우**: StepCompose(배경 Generate/Upload 탭 + 상품/인물 업로드) → StepGenerate(후보 수/비율 멀티/CTA 토글) → PreviewCanvas(결정론적 미리보기, 스켈레톤+진행바, 스피너 금지) → 700ms 폴링 → 결과 이동.
* **mock 재설계 (사장 지시)**: localStorage 폐기 → `window.__adMockTasks` 전역 객체 + 각 컴포넌트 setState. CreatePageClient: mockCreateTask + 경과시간 기반 상태 머신(queued 1.2s → generating 3.2s → designing 4.6s → rendering 5.8s → completed). ResultsPageClient: 완료 시점 시드 기반 가라 후보 생성 — 점수 6.2~9.1, 8종 헤드라인, CTA/로고/스크림.
* **버그 수정**: mockGetTask completed 상태 미저장 분기 → rendering 단계 20초+ 무한 대기. 상태가 바뀌면 무조건 갱신하도록 수정.

### 2-3. 생성 UI 상세 결정/반영 (2026-08-18)
* **배경 업로드 용도 확정**: "브랜드의 실제 장소 재현". 업로드 존에 용도 안내 문구 표시.
* **이미지 첨언(note) 필드**: 파일 첨부 후 1줄 입력 (옵션). **원칙: 프롬프트 직접 주입 금지 — 설계 생성 단계(해석 레이어)에서 결합 후 구조적 지시문으로 변환**.
* **배경 업로드 비율 정책 확정**: I2I는 `aspect_ratio` 생략 = 원본 비율 보존. 업로드 파일 naturalWidth/Height 측정 → "Locked to upload · W×H", 비율 프리셋 숨김.
* **후보 수 프리셋**: 1/2/4/10 (Pro 배지 10). 100/500/1,000 공약수 체계.
* **사장님 시각 피드백 반영**: 프롬프트 줄바꿈/좌측 정렬, 썸네일 128px + 호버 1.2배, 토글 트랙 28×52px + 4px 패딩.

### 2-4. ad 랜딩 포트폴리오 섹션 / 랜딩 전체 / Remotion 마이그레이션 (이전 세션)
* 포트폴리오: 디자이너 수작업 고정 좌표 하드코딩, 비율 믹스, 패럴랙스.
* 랜딩: HeroSection~FAQSection + AdHeader/AdFooter/ThemeToggle, 다크 + 마젠타.
* Remotion: 클라이언트 Player + 서버 renderMedia 전환 완료.

---

## 3. 향후 작업 (Next Steps)

### 🔴 ad 실 서버 API 연동 (mock 교체)
1. mock 교체 지점 **2곳**: CreatePageClient(mockCreateTask/mockGetTask) → `adClientAPI.postGenerateTask/getTask`, ResultsPageClient(mockGetTask) → `adClientAPI.getTask`. (DetailPanel의 derived 교체 지점은 사이즈 변환 폐기로 소멸)
2. 실 백엔드는 별도 서버(ngrok BASE_URL)에 `/api/ad/*` 라우트 구현 필요 — client-gateway가 프록시하므로 프론트 `app/api/ad/*` 라우트는 도달 불가(죽은 코드, 실 서버 이전 대상).
3. **비율별 생성 반영**: request.aspectRatios 배열을 파이프라인에서 비율별로 순회 생성 (format × candidate).
4. 스키마 이관: 임시 타입(`adClientAPI.ts`) → `lib/api/types/ad/` 분리 (UI 완결 후).
5. 파이프라인: Supabase 태스크 테이블 + 배경 T2I + 상품/인물 i2i + Gemini 설계(첨언 해석 레이어 포함) + 결정론적 렌더.

### 🔴 Remotion 폴더 구조 정리 (이전 세션에서 남은 미완료 작업)
1. `components/remotion/client/` 폴더 신설 — 클라이언트 컴포넌트(`SceneBlock`·`CaptionLayer`·`ShortRealRoot`·`fonts.ts`) 이전.
2. 기존 ffmpeg 로직 삭제 (`app/api/video/merge/...`, `videoServerAPI.postFinalVideo` 등, 웹훅 3개).
3. 배속 씬 올-인-원 전환 (`render-final-video.ts`의 `postProcessedVideo` 분기 제거).

### 🟡 잔여 확인/이슈
* 랜딩 CTA "Start creating"이 `/ad/create` 미연결 (`#pricing` 앵커).
* 액센트 색 불일치: 코드 `#EF2B70`(마젠타) vs 기획서 11-2 `#E25E2C`(burnt orange).
* ESLint 설정 순환참조로 린트 불가 — `tsc --noEmit`으로 대체 확인.
* 대시보드 MVP 1차 범위 (생성물 목록+사용량 vs 생성 플로우만) — 미결정.
* 결과/확인 화면의 에디터 진입 버튼 (자리만 vs 숨김) — 미결정.
* 프리셋 밖 비율 (배너 1.91:1 등) — 에디터(2차) 시점에 변환/크롭 제공 여부 재검토.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어 표기, 들여쓰기 공백 4칸.
* mock 구조: `window.__adMockTasks: Record<string, AdTask>` — CreatePageClient가 생성·상태 갱신, ResultsPageClient가 조회·후보 생성(비율별 flatMap). 실 구현 시 이 전역 객체와 `declare global` 블록 제거.
* 비율 계약: `aspectRatios: AdAspectRatio[]` (멀티), 총 장수 = length × candidateCount, `AdCandidate.ratio`로 그룹핑.
* client-gateway는 `BASE_URL`(ngrok 백엔드)로 무조건 프록시 — 프론트 `app/api/*` 라우트는 실서버에 구현해야 함.
* Remotion 4.0.507 습성: `component` prop 타입 추론 불가, `PlayerProps.onEnded` 없음, `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** + `colorSpace: 'bt709'` 필수, 저사양 머신은 `concurrency: 1`.