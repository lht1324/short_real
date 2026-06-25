# 작업 진행 상황 (Last Updated: 2026-06-26 03:22)

## 1. 최근 세션 작업 내용 (Current Session Changes)
### 1.1 Autopilot 캡션 프리뷰 및 와이드 에디터 렌더링 리팩토링 - [완료]
* **자막 프리뷰 패널 클린업 (`AutopilotCaptionPreview.tsx`)**:
    - `isLargeOpen` 상태 및 `Max Zoom` 모달 overlay 관련 미정의 참조로 인한 컴파일 에러 유발 코드를 완전히 제거했습니다 (YAGNI 원칙 적용).
    - 프리뷰 내부 Floating 버튼을 `[ Wide Edit ]` (와이드 모드 시 `[ Close Wide ]`) 단일 토글 버튼으로 깔끔하게 통합하여 뷰를 최소화했습니다.
    - 가로형(`16:9`)일 때는 가로 너비 기준, 세로형(`9:16`)일 때는 세로 높이 기준(최대 480px~600px 제한)의 물리 1:1 종횡비 스케일링 계산을 반영하여 찌그러짐을 방지했습니다.
* **깜빡임 없는 슬라이딩 트랜지션 연동 (`WorkspaceAutopilotPageClient.tsx`)**:
    - `previewMode`에 따라 5열(`AutopilotControlPanel`)의 가로폭과 불투명도를 제어하는 CSS 트랜지션을 구축하여, 돔 마운트/언마운트에 의한 렌더링 깜빡임 현상을 원천 차단하고 부드러운 슬라이딩 전이를 구현했습니다.
    - 종횡비가 가로형(`16:9`)으로 바뀔 때 기존 자막 위치가 `Top`이나 `Middle`에 정렬되어 있으면 `Bottom`(80)으로 실시간 롤백하여 DB와 최종 동기화하는 보정 효과를 구현했습니다.
* **자막 위치 제어기 이관 (`CaptionConfigPanel.tsx`)**:
    - 자막 위치 설정 탭(Top/Middle/Bottom)을 4열 프리뷰 영역에서 제거하고 3열 설정 패널의 자막 설정 아코디언 내부로 완벽히 이식했습니다.
    - 16:9 모드일 때는 자막 위치 변경을 비활성화하고 "Fixed to Bottom for Landscape (16:9) video." 가이드를 영어로 제공합니다.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[진행 예정] BYOK 전환 완료를 위한 Credit 시스템 전면 제거 및 안내/에러 핸들링 강화**:
    - `WorkspaceCreatePageClient.tsx` 및 `WorkspaceAutopilotPageClient.tsx` 등에서 `userCreditCount`, `expectedCreditUsage`, `isCreditInsufficient` 계산식과 헤더의 `Credits` 스탯 영역을 완전히 제거.
    - `Insufficient Credit Modal` 및 크레딧 부족 시 생성을 차단하는 클라이언트 사이드 validation 로직 걷어내기.
    - 사전 경고 가이드 UI 배치 및 사후 에러 핸들링 고도화.
2. **[진행 예정] 실제 비디오 생성 로직에 유저 API Key 탑재**:
    - 현재 시스템 환경변수에서 가져오는 API Key를, 생성 요청을 보낸 유저의 DB 프로필에서 꺼내 쓰도록 백엔드 생성 엔진 로직 수정 필요.
3. **[진행 예정] Editor 페이지 디자인 리팩토링**
4. **[검토 필요] Replicate 모델 실연동**
5. **[버그 수정] HeroSection 뮤트 버튼 작동 불량**
6. **랜딩 페이지 하단 섹션 (HowItWorks, Pricing, FAQ) 디자인 개편**
