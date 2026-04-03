2026-04-03 04:15

# 프로젝트 컨텍스트: 오토파일럿 스케줄링 및 타임존 개선

## 1. 개요
비디오 생성(AI 생성 및 렌더링) 소요 시간을 고려하여, 실제 업로드 시간보다 **2시간 먼저** 생성 프로세스를 시작하도록 시스템을 개선합니다. 또한, 전 세계 사용자의 로컬 시간을 정확히 대응하기 위해 IANA 타임존 기반의 예약 시스템을 구축하고, 사용자가 예약 시간을 놓쳤을 경우를 위한 '즉시 시작' 옵션을 제공합니다.

## 2. 주요 결정 사항 및 구현 완료 사항
- **생성 버퍼 시간 (`n`)**: 2시간으로 설정. (외부 API 지연 및 재시도 가능성 고려)
- **타임존 관리 (완료)**: 
    - `Intl.supportedValuesOf('timeZone')`를 활용하여 전 세계 IANA 타임존 선택 지원.
    - 브라우저 타임존 자동 감지 및 `user_timezone` 필드 연동.
- **스케줄 및 태스크 분리 (완료)**:
    - **생성용 스케줄 (`-generation`)**: 업로드 2시간 전 실행. `subtractHoursFromCron`을 통한 크론 보정 적용.
    - **업로드용 스케줄 (`-upload`)**: 사용자 설정 정시 실행.
    - **즉시 실행 (`runImmediately`)**: 2시간 윈도우가 지났을 경우, `tasks.trigger`를 통해 즉각적인 생성 파이프라인 가동.
- **UI 개선 (완료)**:
    - 타임존 선택 드롭다운 및 실행 예측(Next Run) 정보 제공.
    - 2시간 윈도우 마감 시 "오늘 즉시 시작" 체크박스 및 안내 문구 노출.

## 3. 현재 상태 (Status)
- **Cron 유틸리티**: `lib/utils/cronUtils.ts` 구현 완료. (요일 보정 로직 포함)
- **API**: `app/api/autopilot-data/series/[seriesId]/route.ts`의 PATCH/DELETE 로직에서 Trigger.dev 스케줄 동기화 및 즉시 트리거 로직 구현 완료.
- **Client API**: `autopilotDataClientAPI.ts`에서 `runImmediately` 파라미터 전달 기능 추가 완료.
- **UI**: `AutopilotControlPanel.tsx` 및 `WorkspaceAutopilotPageClient.tsx` 연동 완료.

## 4. 향후 작업 및 기술적 메모 (Next Steps)
1.  **철저한 테스트 및 검증 (최우선)**:
    - `subtractHoursFromCron`의 엣지 케이스(자정 전후, 요일 변경 등) 검증.
    - Trigger.dev 대시보드에서 각 타임존별 스케줄링이 의도한 시각(2시간 전/정각)에 정확히 생성되는지 확인.
    - `runImmediately` 플래그 전달 시 실제 즉시 실행 여부 확인.
2.  **즉시 업로드 연동 (중요)**:
    - `runImmediately` 옵션으로 생성이 시작된 경우, 비디오 렌더링이 완료되는 지점([완료 파트 경로])에서 `autopilot-upload-orchestrator` 태스크를 즉시 트리거해야 합니다. (Trigger.dev `tasks.trigger` 사용)
3.  **API 안정성 모니터링**:
    - 스케줄 Upsert 시 `deduplicationKey` 충돌 여부 및 중복 생성 여부 지속적 모니터링.

## 5. 테스트 케이스 예시
- 사용자 설정: 월요일 01:00 (Asia/Seoul)
- 생성 스케줄: 일요일 23:00 (Asia/Seoul) -> `0 23 * * 0` (크론 요일 보정 확인)
- 업로드 스케줄: 월요일 01:00 (Asia/Seoul) -> `0 1 * * 1`
