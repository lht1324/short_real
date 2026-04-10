2026-04-11 06:15

# 프로젝트 컨텍스트: 오토파일럿 전용 OAuth 및 UI 정렬 최적화

## 1. 개요
오토파일럿 설정 창에서 비디오 태스크와 무관하게 플랫폼 계정을 연동할 수 있도록 OAuth 진입점을 분리하고, 사이드바 UI 디자인에 맞춰 연동 버튼의 시각적 정렬을 고도화하는 작업을 진행 중입니다.

## 2. 주요 결정 사항 및 구현 완료 사항
- **오토파일럿 전용 OAuth 엔드포인트 구축 (완료)**:
    - `youtube/autopilot/oauth` 및 `tiktok/autopilot/oauth`: `seriesId`를 파라미터로 수용하고, `mode: 'autopilot'` 상태를 보존하여 콜백에 전달하도록 구현.
    - 특히 유튜브는 이미 연동된 경우 `current_generating_task_id`를 체크해 즉시 업로드를 트리거하는 지능형 로직 포함.
- **브랜딩 버튼 컴포넌트 확장 (완료)**:
    - `GoogleSignInButton.tsx`, `TikTokSignInButton.tsx`: 기존 디자인을 유지하면서 외부에서 `className`, `textClassName`, `iconClassName`을 통해 정밀하게 스타일을 제어할 수 있도록 속성 추가.
- **UI 레이아웃 1차 정렬 (진행 중)**:
    - `AutopilotControlPanel.tsx`: `justify-start`와 고정 마진(`!mr-8`)을 사용해 유튜브와 틱톡 버튼의 "Connect" 텍스트 시작점(X축)을 수직으로 일치시킴.
    - 서비스 표준 폰트 및 두께(`font-bold`, `text-sm`)를 버튼 내부에 강제 적용하여 통일감 확보.

## 3. 현재 상태 (Status)
- **OAuth 진입로 확보**: 설정 창에서 버튼 클릭 시 인증 페이지로 넘어가는 백엔드 준비 완료.
- **UI 시각적 불균형 개선 중**: "Connect" 단어의 시작점은 맞췄으나, 전체적인 좌우 밸런스 및 '붕 뜨는 느낌'을 완전히 해결하기 위한 미세 조정 필요.
- **조건부 렌더링 대기**: 현재는 테스트를 위해 연동 버튼이 항상 보이도록(`true`) 설정되어 있음.

## 4. 향후 작업 및 기술적 메모 (Next Steps)
1.  **UI 밸런스 최종 완성**:
    - "Connect [Platform]" 전체 뭉치가 시각적으로 중앙에 위치하면서도 수직 정렬이 유지되는 최적의 마진/패딩 값 도출.
2.  **콜백(Callback) 로직 보완**:
    - `callback/youtube` 및 `callback/tiktok`: `mode === 'autopilot'` 감지 시 `/workspace/autopilot?seriesId=...`로 리다이렉트하는 로직 추가.
3.  **실제 데이터 연동**:
    - `platformConnections` 상태를 실제 API 결과값으로 대체하여 연동 여부에 따른 동적 UI 전환 완성.
4.  **유튜브 공개 범위 UI**:
    - 유튜브 연동 성공 시 나타나는 체크박스 하단에 `Privacy Setting` 드롭다운 추가.
