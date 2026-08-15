# 작업 진행 상황 (Last Updated: 2026-08-16 03:32)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: shortreal.ai/ad 랜딩 — 포트폴리오 섹션 완성 + 전체 점검
* ad 랜딩 페이지 전 섹션 구현 완료. 포트폴리오 섹션은 AdCreative.ai 스타일 "플로팅 쇼케이스"로 재구성해 사장님 수작업 좌표로 **최종 확정**.
* 파일/폴더명 변경 완료: `GallerySection.tsx` → **`PortfolioSection.tsx`**, `gallery-section/` → **`portfolio-section/`** (AdPageClient.tsx import 반영, `tsc --noEmit` 클린).

---

## 2. 완수된 작업 (Completed Milestones)

### 2-1. ad 랜딩 포트폴리오 섹션: AdCreative 스타일 플로팅 쇼케이스 재구성 (2026-08-16)
* **배치 철학 확정**: 디자이너가 수작업으로 찍은 **고정 좌표 하드코딩** 채택. 자동 배치 알고리즘(콜라주/시드 생성) 전면 폐기 — 개발자는 좌표를 상수 배열에 박을 뿐 레이아웃에 관여하지 않음.
* **종횡비 규격**(사장 확정): AI 생성 후 그대로 쓰거나 가볍게 크롭으로 커버 가능한 비율만 — 규격형 9:16·1:1·16:9·4:3·3:4 + 포스터 크롭형 4:5. 최종 점유율: 1:1(4장) / 9:16(3장) / 4:5(3장) / 16:9(앵커 1장).
* **최종 UI** (`components/page/ad/portfolio-section/PortfolioSection.tsx`):
    * 캔버스 `aspect-[3/4] w-full md:aspect-[4/5]`, overflow-hidden 없음, 래퍼 `pb-24 md:pb-32` 하단 완충, 캡션은 래퍼 밖 `mt-8 text-right`.
    * `PLACED_IMAGES` 상수 배열 12장: 상단 3장 / 중단 3장(tilt, 전부 `mobileHidden`) / 하단 4장 / **16:9 앵커**(demo-main-center, left 26·top 85·width 48, parallax [0,0]).
    * 회전 **0도** 확정. 폴라로이드 와꾸: `bg-white p-2` + 그림자 `0_20px_40px_-15px_rgba(0,0,0,0.35)` + 내부 `rounded-xl` 클리핑.
    * 패럴랙스: 은은한 ±(10~40)px, 카드마다 +/− 방향 혼합, `will-change: transform`. `prefersReducedMotion`이면 `yStatic`([0,0]).
    * 중앙 CTA 버튼 미채택 (가라 버튼 — 기본 UI에 없음).
* **배치 진화 과정**: 4열 스태거드(폴라로이드±1.5° 회전) → 제미나이 피드백(여백/0도/패럴랙스) → serpentine 2행+앵커 → 제미나이 원본 HTML 분석(절대좌표 translate3d + will-change 패럴랙스) → 사장님 하드코딩 지시 → 시드 2024 불규칙 좌표 생성(겹침 0) → **사장님이 직접 미세 조정 후 확정** ("현재 상태가 내가 원하는 거야").
* `npx tsc --noEmit` 클린.

### 2-2. ad 랜딩 페이지 전체 구성 (이전 세션)
* 섹션 컴포넌트: HeroSection, HowItWorksSection, FeaturesSection, PricingSection, FAQSection, AdHeader, AdFooter, ThemeToggle.
* 다크 테마(#0A0A0B) + 마젠타(#EF2B70) 포인트, `.theme-light` 클래스 토글(`lib/theme.ts`).

### 2-3. Remotion 기반 마이그레이션 (이전 세션, 완료)
* 클라이언트 에디터(Player) + 서버 최종 렌더(renderMedia) 모두 Remotion 전환 완료. 자막 청크 카라오케, px@1080 단위, 서명 URL 50분 재발급, OffthreadVideo/bt709 렌더 품질 수정까지 해결.

---

## 3. 향후 작업 (Next Steps)

### 🔴 Remotion 폴더 구조 정리 (이전 세션에서 남은 미완료 작업)
1. `components/remotion/client/` 폴더 신설 — 클라이언트 컴포넌트(`SceneBlock`·`CaptionLayer`·`ShortRealRoot`·`fonts.ts`) 이전, import 경로 전파 주의.
2. 기존 ffmpeg 로직 삭제: `app/api/video/merge/final/process/route.ts`, `videoServerAPI.postFinalVideo`/`postVideoMergeCaption`/`postVideoMergeMusic`, `musicServerAPI.postMusicModifying`, `captionUtils.generateASSContent`, 웹훅 3개(merge/caption·merge/music·music/modifying), `app/api/video/merge/route.ts`(:53이 postFinalVideo 직접 호출 — 호출부 확인 후).
3. 배속 씬 올-인-원 전환: `render-final-video.ts`의 `postProcessedVideo` 분기 제거 → 전 씬 raw를 `playbackRate` 처리 (video_processed_N 경로 정리 포함).

### 🟡 잔여 확인/이슈
* 포트폴리오 섹션: `npm run dev`로 최종 시각 확인 (사장님 담당). 이후 제품 데모 이미지 교체 예정.
* OffthreadVideo 안정성 확인 후 `concurrency: 2` 복귀 테스트.
* 씬 경계 검은 프레임 2개(162, 294) — 낮은 우선순위.
* ESLint 설정 순환참조로 린트 불가 — `tsc --noEmit`으로 대체 확인.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어 표기, 들여쓰기 공백 4칸.
* Remotion 4.0.507 습성: `component` prop 타입 추론 불가(Record 수용형 패턴), `PlayerProps.onEnded` 없음(`ended` 이벤트), `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** + `colorSpace: 'bt709'` 필수, 저사양 머신은 `concurrency: 1`.
* Replicate 샌드박스: `lht1324/ffmpeg-sandbox-2` — ffmpeg 로직 삭제 시 함께 제거 대상.
