2026-04-03 02:28

# 프로젝트 컨텍스트: 오토파일럿 스케줄링 및 타임존 개선

## 1. 개요
비디오 생성(AI 생성 및 렌더링) 소요 시간을 고려하여, 실제 업로드 시간보다 **2시간 먼저** 생성 프로세스를 시작하도록 시스템을 개선합니다. 또한, 전 세계 사용자의 로컬 시간을 정확히 대응하기 위해 IANA 타임존 기반의 예약 시스템을 구축합니다.

## 2. 주요 결정 사항
- **생성 버퍼 시간 (`n`)**: 2시간으로 설정. (외부 API 지연 및 재시도 가능성 고려)
- **타임존 관리**: 
    - `UTC +n` 방식 대신 `Asia/Seoul`, `America/New_York` 등 **IANA 타임존 이름**을 사용. (서머타임 대응)
    - 브라우저 API(`Intl`)를 사용하여 사용자 타임존 자동 감지.
    - `autopilot_data` 테이블에 `timezone` 컬럼 추가 (완료됨).
- **Trigger.dev 연동**:
    - `schedules.create` 호출 시 `timezone` 파라미터를 전달하여 해당 지역 시각 기준 실행 보장.
- **엣지 케이스 처리**:
    - 설정 시점이 실행 시점과 너무 가까운 경우(예: 5분 전 설정), 당일분은 건너뛰거나 UI 경고를 통해 사용자에게 알림.

## 3. 기술적 구현 계획
- **Cron 유틸리티**: `lib/utils/cronUtils.ts`에 `subtractHoursFromCron(cron, n)` 함수 추가. (시간 차감 시 요일 변경 로직 포함)
- **UI (React)**: `AutopilotControlPanel.tsx`에 타임존 자동 감지 및 검색 가능한 드롭다운 추가.
- **API (Next.js)**: `app/api/autopilot-data/series/[seriesId]/route.ts`의 PATCH/DELETE 로직에서 Trigger.dev 스케줄 동기화 코드 수정.
    - 생성 태스크: `adjustedCron` (2시간 전) + `timezone` 적용.
    - 업로드 태스크: `originalCron` + `timezone` 적용.

## 4. 향후 작업 순서
1. `subtractHoursFromCron` 유틸리티 함수 구현 및 유닛 테스트.
2. UI에 타임존 선택 및 자동 감지 로직 반영.
3. API 엔드포인트에서 Trigger.dev 스케줄 생성/삭제 로직 고도화.
