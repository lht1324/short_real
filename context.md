2026-04-07 15:30

# 프로젝트 컨텍스트: 오토파일럿 업로드 엔진 연동 및 활성화 로직 적용

## 1. 개요
오토파일럿의 비디오 생성 이후, 실제 플랫폼(YouTube, TikTok)으로의 자동 업로드를 위해 기존에 구축된 '수동 업로드 엔진'을 오케스트레이터와 연동했습니다. 또한, 시리즈의 활성화 상태(`is_active`)에 따른 실행 제어 로직을 추가했습니다.

## 2. 주요 결정 사항 및 구현 완료 사항
- **업로드 엔진 연동 (완료)**:
    - `autopilot-upload-orchestrator.ts`: `internalFireAndForgetFetch`를 사용하여 유튜브 및 틱톡 업로드 API를 병렬로 호출하도록 수정.
    - 플랫폼별 설정(`youtube`, `tiktok`) 및 공개 범위(`youtube_privacy`)에 따라 동적으로 엔진 가동.
- **시리즈 활성화 체크 (완료)**:
    - `autopilot-generation-orchestrator.ts`: 실행 초기에 `is_active` 필드를 검사하여 `false`인 경우 생성을 스킵하도록 로직 추가.
- **DB 스키마 (완료)**:
    - `autopilot_data` 테이블에 `last_run_at`, `current_generating_task_id` 컬럼 생성 확인 (사장님 직접 수행).

## 3. 현재 상태 (Status)
- **백엔드 파이프라인 완성**: [생성 오케스트레이터] -> [비디오 생성] -> [업로드 오케스트레이터] -> [플랫폼별 업로드 엔진]으로 이어지는 흐름 구축 완료.
- **태스크 ID 초기화 보류**: 업로드 엔진 호출 후 `current_generating_task_id`를 어느 시점에 비울지(오케스트레이터 종료 시 vs 업로드 성공 콜백 시) 결정이 필요하여 일단 미뤄둠.

## 4. 향후 작업 및 기술적 메모 (Next Steps)
1.  **UI 스마트화 (핵심)**: 
    - `AutopilotControlPanel.tsx` 및 `AutopilotConfigPanel.tsx` 수정.
    - 유저의 유튜브/틱톡 토큰 존재 여부를 확인하는 API 필요.
    - 토큰이 없으면 [플랫폼 연동하기] 버튼 노출, 토큰이 있으면 [자동 업로드 활성화] 체크박스 노출.
2.  **OAuth 연동 보완**: 
    - 오토파일럿 설정 단계(태스크가 없는 상태)에서도 계정 연동만 가능하도록 기존 OAuth 엔드포인트 수정 또는 전용 엔드포인트 검토.
3.  **태스크 초기화 로직 확정**: 업로드 오케스트레이터 종료 시점에 `current_generating_task_id`를 `null`로 바꿀지 최종 결정 및 구현.


## 직접 확인 후 추가
1. `trigger/autopilot-upload-orchestrator.ts` 내부 privacySetting 사용 부분에 빨간 줄이 뜨는데 그 부분 확인해 봐야 함 