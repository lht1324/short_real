2026-04-10 01:00

# 프로젝트 컨텍스트: 오토파일럿 업로드 연동 및 UI 스마트화

## 1. 개요
오토파일럿의 백엔드 파이프라인 구축 완료 후, 사용자의 플랫폼 연동 여부에 따라 동적으로 UI를 전환(연동 버튼 ↔ 활성화 체크박스)하는 작업을 진행 중입니다.

## 2. 주요 결정 사항 및 구현 완료 사항
- **틱톡 브랜딩 버튼 구현 (완료)**:
    - `TikTokSignInButton.tsx`: 틱톡 가이드라인(흰색 배경, 둥근 모서리)을 준수하여 구현.
    - 로고는 사장님 결정에 따라 컬러 버전(`/public/icons/tiktok-logo-black.svg`)을 그대로 사용하기로 함 (추후 문제 시 CSS 필터로 검은색 단색 전환 가능하도록 설계).
- **데이터 페칭 경로 확보 (완료)**:
    - `autopilotDataClientAPI.getAutopilotDataPlatformConnection`을 통해 유저의 플랫폼별 연동 여부(토큰 유무) 확인 가능함을 검토 완료.

## 3. 현재 상태 (Status)
- **컴포넌트 준비 완료**: Google 및 TikTok 연동용 전용 버튼 컴포넌트가 준비됨.
- **연동 로직 설계 완료**: 상위 클라이언트 컴포넌트(`WorkspaceAutopilotPageClient`)에서 연동 상태를 가져와 사이드바 패널로 주입하는 구조 확정.
- **OAuth 연동 이슈 파악**: 틱톡 연동 시 `taskId`가 필수 파라미터로 되어 있어, 오토파일럿 설정 창 전용(태스크 무관) 연동을 위한 대응 필요.

## 4. 향후 작업 및 기술적 메모 (Next Steps)
1.  **UI 스마트화 적용 (핵심)**:
    - `WorkspaceAutopilotPageClient.tsx`: `platformConnections` 데이터 페칭 로직 추가 및 패널에 Props 전달.
    - `AutopilotControlPanel.tsx`: 연동 여부에 따라 [Google/TikTok 버튼] 또는 [체크박스] 조건부 렌더링.
2.  **연동 흐름 개선**:
    - 틱톡 OAuth 진입 시 `taskId`가 없는 경우에 대한 처리 (예: `taskId=autopilot` 고정값 사용 등)를 통해 설정 창 즉시 연동 경로 확보.
3.  **유튜브 업로드 상세 설정**:
    - 활성화 시 `Privacy Setting` 드롭다운 UI 추가 작업 병행.
