2026-04-06 23:59

# 프로젝트 컨텍스트: 오토파일럿 중복 실행 방지 및 멱등성 보장

## 1. 개요
비디오 생성 소요 시간을 고려하여 실제 업로드 2시간 전 생성을 시작하되, 사용자가 설정을 변경할 때 발생하는 **'동일 날짜 중복 실행'** 문제를 해결하기 위해 **태스크 단위의 멱등성(Idempotency) 로직**을 도입했습니다. 또한, 생성과 업로드 단계를 `current_generating_task_id`를 통해 연결하여 안정성을 확보했습니다.

## 2. 주요 결정 사항 및 구현 완료 사항
- **생성 버퍼 시간 (`n`)**: 2시간으로 설정.
- **타임존 기반 멱등성 로직 (완료)**:
    - `lib/utils/dateUtils.ts` 구현: 타임존별 날짜 비교 및 버퍼 시간 계산 유틸리티.
    - `autopilot-generation-orchestrator.ts` 수정: 실행 시 `payload.timestamp + 2h`를 계산하여 `last_run_at`과 비교 후 중복 시 스킵.
- **태스크 추적 및 업로드 방어 (완료)**:
    - `app/api/autopilot/video-metadata/route.ts`: 태스크 생성 시 `autopilot_data.current_generating_task_id`에 저장하도록 수정.
    - `autopilot-upload-orchestrator.ts`: 저장된 `taskId`를 조회하고, 실제 영상 파일이 존재하는지(`videoServerAPI.getVideoSignedUrl`) 확인 후 업로드 진행하도록 방어 로직 추가.
- **DB 스키마 (설계)**:
    - `autopilot_data` 테이블에 `last_run_at` (timestamptz), `current_generating_task_id` (uuid) 컬럼 추가 필요.

## 3. 현재 상태 (Status)
- **로직 구현 완료**: 생성 멱등성 체크 및 업로드 연동 로직 코드 반영 완료.
- **남은 과제**: 실제 업로드 로직(YouTube, TikTok 등 API 연동) 구현 시 `upload-orchestrator`의 TODO 섹션 채우기.

## 4. 향후 작업 및 기술적 메모 (Next Steps)
1.  **실제 업로드 연동**: `autopilot-upload-orchestrator.ts` 내부의 플레이스홀더를 각 플랫폼별 업로드 API로 교체.
2.  **테스트**: 자정 교차 시점(23:00 생성 -> 01:00 업로드)에 `last_run_at`이 정상적으로 다음 날짜로 기록되어 중복을 막는지 최종 확인.
