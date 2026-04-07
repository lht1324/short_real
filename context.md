2026-04-07 17:00

# 프로젝트 컨텍스트: 오토파일럿 업로드 연동 및 타입 안정성 확보

## 1. 개요
오토파일럿의 비디오 생성부터 플랫폼별 자동 업로드까지의 백엔드 파이프라인을 구축했습니다. 특히 타입 안정성을 위해 Enum을 도입하고, 시리즈 활성화 상태에 따른 제어 로직을 완성했습니다.

## 2. 주요 결정 사항 및 구현 완료 사항
- **업로드 오케스트레이터 고도화 (완료)**:
    - `autopilot-upload-orchestrator.ts`: `ExportPrivacySetting` Enum을 도입하여 유튜브 업로드 시 공개 범위 설정 로직 반영. (사장님 직접 수정 완료)
    - `internalFireAndForgetFetch`를 통한 플랫폼별(YouTube, TikTok) 병렬 업로드 트리거 로직 안착.
- **생성 오케스트레이터 제어 (완료)**:
    - `autopilot-generation-orchestrator.ts`: `is_active` 필드 체크 로직 추가. 비활성화된 시리즈는 생성 단계를 시작하지 않음.
- **타입 정의 업데이트 (완료)**:
    - `AutopilotData.ts`: `youtube_privacy` 필드 추가 및 `ExportPrivacySetting` 연동.

## 3. 현재 상태 (Status)
- **백엔드 로직 완성**: 생성 -> 업로드로 이어지는 모든 트리거 로직이 코드로 구현됨.
- **타입 에러 해결**: 오케스트레이터 내부의 `privacySetting` 관련 타입 불일치 문제 해결됨.
- **태스크 ID 초기화 대기**: 업로드 완료 후 `current_generating_task_id`를 `null`로 비워주는 시점은 추후 결정 예정.

## 4. 향후 작업 및 기술적 메모 (Next Steps)
1.  **UI 스마트화 (다음 핵심 과제)**: 
    - `AutopilotControlPanel.tsx`: 유저의 토큰 유무를 체크하여 [연동 버튼] 또는 [체크박스]를 분기 처리.
    - 유튜브 업로드 활성화 시 `Privacy Setting`을 선택할 수 있는 드롭다운 UI 추가.
2.  **연동 전용 OAuth 흐름**: 
    - 특정 비디오 태스크 없이도 오토파일럿 설정 창에서 즉시 계정 연동만 수행할 수 있는 경로 확보.
3.  **토큰 확인 API**: 
    - 클라이언트에서 유저의 플랫폼별 연동 여부(refresh_token 존재 여부)를 가볍게 확인할 수 있는 엔드포인트 구현.
