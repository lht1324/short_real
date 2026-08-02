# 작업 진행 상황 (Last Updated: 2026-08-03 00:14)

## 1. 현재 상황 (Current Status)
* **Hellyeah X-Ray 마케팅 분석 트래커 구축 완료**:
    * 브라우저 방문 추적용 `<HellyeahAnalytics>` 프로바이더 (`app/layout.tsx`) 탑재.
    * Polar 결제/구독 성공 웹훅 (`app/webhook/polar/checkouts/success/route.ts`) 내 `cv.subscribe` 실시간 이행 이벤트 전송 구현.
    * Hellyeah CLI `tracker verify` 자동 검증 통과 및 전용 Tracker ID (`019fc303-a119-7000-a2bc-009a1e2abf4b`) 발급 완료.

---

## 2. 세션 진행 작업 (Work Accomplished in Current Session)

### [마케팅/분석] Hellyeah X-Ray 트래커 연동 및 검증
1. **Hellyeah SDK 및 싱글톤 인스턴스 구축**:
    * `@hellyeah/x-ray` 패키지 추가.
2. **브라우저 방문 추적 프로바이더 배치 (`app/layout.tsx`)**:
    * Vercel Analytics와의 명칭 충돌 방지를 위해 `Analytics as HellyeahAnalytics` 별칭(Alias)을 사용하여 레이아웃에 탑재.
3. **구독 결제 전환 이벤트 탑재 (`app/webhook/polar/checkouts/success/route.ts`)**:
    * Polar 웹훅 성공 시 `distinctId`, `revenue`, `currency`, `planId`, `customer_email` 정보를 실시간 전송하는 `cv.subscribe` 이벤트 연동.
4. **X-Ray CLI 검증 및 환경변수 발급 (`.env.local`)**:
    * `hellyeah tracker verify`를 실행하여 4개 검증 오류 해결 후 최종 검증 통과 (`success: true`).
    * 전용 Tracker ID (`019fc303-a119-7000-a2bc-009a1e2abf4b`) 발급 및 `.env.local` 세팅 완료.

---

## 3. 향후 작업 (Next Steps)

### Task 4: [백엔드/파이프라인] 정규 생성 실패 건 선택적 재생성 (Selective Retry) 및 상태 동기화 체계 구축
1. **배경 및 필요성**:
    * 외부 AI API(Fal AI 등)의 일시적 서버 오류, 네트워크 타임아웃 등으로 인해 전체 10개 씬 중 특정 1~2개 씬만 생성 실패(`status: FAILED`)하는 경우 발생.
    * 전체 재요청 없이 실패한 씬만 선택적으로 재요청(Selective Retry)하는 파이프라인 필터링 및 대시보드 연동 필요.
2. **구체적 구현 내용**:
    * **[에디터 UI]**: `status === FAILED`인 씬 카드에 **[Retry Scene / 씬 재시도]** 전용 버튼 및 실패 원인 툴팁 표시. 차감 예상 금액 툴팁에 실패한 N개 씬 재시도 금액만 동적으로 계산하여 표시.
    * **[백엔드 파이프라인]**: 실패한 씬 번호 목록(예: `failedSceneNumbers: [3, 5]`)만 전달받아 해당 씬들만 핀포인트로 백그라운드 재요청을 수행하고 성공한 기존 씬은 유지하며 DB `scene_breakdown_list`에 병합 패치.
    * **[Realtime 반응]**: 재시도가 완료되면 기존과 동일하게 Realtime 채널을 통해 화면 스피너가 꺼지고 새 이미지가 장착되도록 상태 동기화.