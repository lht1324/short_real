# 작업 진행 상황 (Last Updated: 2026-08-18 03:30)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: shortreal.ai/ad 앱 UI — 생성 위저드(2스텝) + 결과/확인 화면 (mock 기반)
* 생성/결과 전체 플로우 UI 구축 완료. mock은 **tsx 컴포넌트 내부에 직접 구현** (baseFetch/client-gateway 프록시 사용 안 함 — client-gateway가 ngrok 백엔드로 프록시해 로컬 mock 라우트가 도달 불가능한 것이 확인됨).
* 사장님 피드백 반영 완료: 프롬프트 줄바꿈/좌측 정렬, 썸네일 크기+호버 확대, 후보 수 프리셋 **1/2/4/10**, 배경 업로드 비율 Lock, CTA 토글 패딩, 이미지 첨언(note) 필드, 배경 업로드 설명 문구.
* 다음: 실 서버 API 연동 시 mock 함수 → `adClientAPI` 호출로 교체 (교체 지점 3곳, 하단 참고).

---

## 2. 완수된 작업 (Completed Milestones)

### 2-1. ad 앱 UI — 생성 위저드 + 결과/확인 (2026-08-18, mock 기반)
* **화면 구조**: `/ad/create` (위저드 2스텝 + 생성 진행 3번째 뷰), `/ad/create/results?taskId=` (후보 그리드 + 상세 패널). 랜딩과 분리된 앱 구조 (`components/page/ad/app-header/` 별도 헤더 + ThemeToggle 포함).
* **생성 플로우**: StepCompose(배경 Generate/Upload 탭 + 상품/인물 업로드) → StepGenerate(후보 수/비율/CTA 토글) → PreviewCanvas(결정론적 미리보기, 스켈레톤+진행바, 스피너 금지) → 700ms 폴링 → 결과 이동.
* **결과 화면**: 후보 전부 노출(점수 배지, 1장이면 score skipped) + AdOverlay(ResizeObserver 폭 측정, %좌표 결정론적 오버레이) + DetailPanel(사이즈 프리셋 4종, 다운로드, 에디터 alert). 그리드 `minmax(280px, 1fr)` — 10장 후보 대응.
* **mock 재설계 (사장 지시)**: 
    * localStorage 폐기 → **`window.__adMockTasks` 전역 객체** (페이지 간 태스크 공유용 하나만) + 나머지는 **각 컴포넌트 setState**로 처리.
    * CreatePageClient: mockCreateTask + 경과시간 기반 상태 머신(queued 1.2s → generating 3.2s → designing 4.6s → rendering 5.8s → completed).
    * ResultsPageClient: 완료 시점 시드 기반(mulberry32) 가라 후보 생성 — 점수 6.2~9.1, 9장 이미지 풀, 8종 헤드라인, CTA/로고/스크림 레이아웃.
    * DetailPanel: 사이즈 파생 800ms 딜레이 mock.
    * **버그 수정**: mockGetTask가 completed 상태를 저장하지 않는 분기 → rendering 단계에서 20초+ 무한 대기 발생. 상태가 바뀌면 무조건 갱신하도록 수정.
* **API 계약 파일은 유지** (건드리지 않음): `lib/api/client/ad/adClientAPI.ts` (임시 타입+클라이언트 API), `lib/api/server/ad/adServerAPI.ts`, `app/api/ad/tasks/*` 라우트 3개. 실 서버 구현 시 이들을 사용.
* `npx tsc --noEmit` 클린.

### 2-2. 생성 UI 상세 결정/반영 (2026-08-18)
* **배경 업로드 용도 확정**: "브랜드의 실제 장소 재현" (매장/카페/워크스페이스 — T2I로 재현 불가능한 영역). 각 잡은 스튜디오 사진을 넣는 사용자는 타깃 밖(그런 자산이 있는 팀은 이미 크리에이티브 조직)이라는 판단. 업로드 존에 용도 안내 문구 표시.
* **이미지 첨언(note) 필드**: 파일 첨부 후 나타나는 1줄 입력 (옵션). placeholder는 실용 지시 유도("e.g. Use only the product — ignore the background" — 시적 표현 유도 방지). **원칙: 프롬프트에 직접 주입 금지 — 설계 생성 단계(해석 레이어)에서 이미지+첨언+템플릿 결합 후 구조적 지시문으로 변환** (타입 주석으로 고정).
* **배경 업로드 비율 정책 확정** (업계 조사 후): I2I는 `aspect_ratio` **생략 = 원본 비율 보존** (Nano Banana 공식 문서: "defaults to matching the output image size to that of your input image"). 프롬프트 배경만 1:1/4:5/9:16 프리셋 지정. UI는 업로드 파일 naturalWidth/Height 측정 → "Locked to upload · W×H" 표시, 비율 프리셋 숨김. 업계 4패턴: ①파라미터 생략=원본 유지(Nano Banana) ②지정 비율 강제+자동 리프레임(GPT Image 등) ③전처리 캔버스 통일 ④후처리 결정론적 크롭 복원 — 우리는 ①+④ 조합.
* **후보 수 프리셋 수정**: 1/2/4/8 → **1/2/4/10** (8은 100/500/1,000 공약수 아님 — 100÷8=12.5, 기획서 6-6 수학 오류. 5는 홀수라 결과 그리드 행 비대칭 → 제거. 1은 단독 카드라 유지). Pro 배지 8→10.
* **사장님 시각 피드백 반영**: 프롬프트 줄바꿈(line-clamp + whitespace-pre-line 조합이 -webkit-box에서 래핑 깨뜨림 → line-clamp 제거, break-words + min-w-0, 텍스트만 좌측 정렬), 썸네일 128px + 호버 1.2배(origin-top-left, 터치/호버 차이는 모바일 분리 예정이라 무관), 토글 트랙 28×52px + 4px 패딩(left 명시 방식).

### 2-3. ad 랜딩 포트폴리오 섹션 (이전 세션)
* 배치 철학: 디자이너 수작업 고정 좌표 하드코딩. 종횡비 9:16·1:1·16:9·4:3·3:4·4:5, 회전 0도, 은은한 패럴랙스, 16:9 앵커. 사장님 직접 미세 조정 후 확정.

### 2-4. ad 랜딩 페이지 전체 구성 (이전 세션)
* 섹션: HeroSection, HowItWorksSection, FeaturesSection, PricingSection, FAQSection, AdHeader, AdFooter, ThemeToggle. 다크 테마 + 마젠타 포인트, `.theme-light` 토글.

### 2-5. Remotion 기반 마이그레이션 (이전 세션, 완료)
* 클라이언트 에디터(Player) + 서버 최종 렌더(renderMedia) 모두 Remotion 전환 완료.

---

## 3. 향후 작업 (Next Steps)

### 🔴 ad 실 서버 API 연동 (mock 교체)
1. mock 교체 지점 3곳: CreatePageClient(mockCreateTask/mockGetTask) → `adClientAPI.postGenerateTask/getTask`, ResultsPageClient(mockGetTask) → `adClientAPI.getTask`, DetailPanel(mockDeriveSize) → `adClientAPI.postDerivedSize`.
2. 실 백엔드는 별도 서버(ngrok BASE_URL)에 `/api/ad/*` 라우트 구현 필요 — client-gateway가 그쪽으로 프록시하므로 프론트 `app/api/ad/*` 라우트는 도달 불가(죽은 코드, 실 서버 이전 대상).
3. 스키마 이관: 임시 타입(`adClientAPI.ts`) → `lib/api/types/ad/` 분리 (UI 완결 후).
4. 파이프라인: Supabase 태스크 테이블 + 배경 T2I + 상품/인물 i2i + Gemini 설계(첨언 해석 레이어 포함) + 결정론적 렌더.

### 🔴 Remotion 폴더 구조 정리 (이전 세션에서 남은 미완료 작업)
1. `components/remotion/client/` 폴더 신설 — 클라이언트 컴포넌트(`SceneBlock`·`CaptionLayer`·`ShortRealRoot`·`fonts.ts`) 이전.
2. 기존 ffmpeg 로직 삭제 (`app/api/video/merge/...`, `videoServerAPI.postFinalVideo` 등, 웹훅 3개).
3. 배속 씬 올-인-원 전환 (`render-final-video.ts`의 `postProcessedVideo` 분기 제거).

### 🟡 잔여 확인/이슈
* 후보 10장 선택 시 이미지 풀 9장 한계 — pickShuffled이 9장만 반환 (풀 확장 또는 중복 허용 검토).
* 랜딩 CTA "Start creating"이 `/ad/create` 미연결 (`#pricing` 앵커).
* 액센트 색 불일치: 코드 `#EF2B70`(마젠타) vs 기획서 11-2 `#E25E2C`(burnt orange).
* ESLint 설정 순환참조로 린트 불가 — `tsc --noEmit`으로 대체 확인.
* 대시보드 MVP 1차 범위 (생성물 목록+사용량 vs 생성 플로우만) — 미결정.
* 결과/확인 화면의 에디터 진입 버튼 (자리만 vs 숨김) — 미결정.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어 표기, 들여쓰기 공백 4칸.
* mock 구조: `window.__adMockTasks: Record<string, AdTask>` — CreatePageClient가 생성·상태 갱신, ResultsPageClient가 조회·후보 생성. 실 구현 시 이 전역 객체와 `declare global` 블록 제거.
* client-gateway는 `BASE_URL`(ngrok 백엔드)로 무조건 프록시 — 프론트 `app/api/*` 라우트는 실서버에 구현해야 함.
* Remotion 4.0.507 습성: `component` prop 타입 추론 불가, `PlayerProps.onEnded` 없음, `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** + `colorSpace: 'bt709'` 필수, 저사양 머신은 `concurrency: 1`.