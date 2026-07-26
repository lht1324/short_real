# 작업 진행 상황 (Last Updated: 2026-07-27 03:24)

## 1. 현재 상황 (Current Status)
* **이미지 및 비디오 재생성 파이프라인 검증 성공 (테스트 통과)**:
    * 단건 이미지 재생성 (`/api/image/regenerate`) 및 단건 비디오 재생성 (`/api/video/regenerate`) 기능 파이프라인 테스트 자체는 성공적으로 완료함.
    * 씬 카드 글래스모피즘 스피너 오버레이 연동 및 Supabase Realtime 실시간 `COMPLETED` 완공 알림/비디오 URL 교체 체계 구축 완료.
    * 비디오 완공 시 1차 속도 배율 후처리 및 Storage 덮어쓰기 완료 상태를 `COMPLETED`로 통합 관리.
    * 재생성 모달 해상도(`globalResolution`) 필터링 및 **Sort by (Name / Price ↑ / Price ↓)** 정렬 기능 구현 완료.

---

## 2. 해결해야 할 미세 디테일 개선 사항 (Urgent Fixing Task) - [Priority: HIGH]

### [이슈] RegenerateModal 선택 AI 모델 ID의 DB 업데이트 누락 교정
1. **현상**:
    * `SceneRegenerateModal`에서 유저가 새로 선택한 모델 ID가 `video_generation_tasks` 테이블의 `scene_breakdown_list` 내 해당 씬 객체(`selectedI2IAIModelId`, `selectedI2VAIModelId`)에 올바르게 업데이트되지 않고 있는 현상이 존재함.
    * 이로 인해 재생성 완료 후 페이지를 새로고침(F5)하거나 모달을 재오픈했을 때 유저가 바꾼 최신 모델 ID가 드롭다운 기본값으로 바인딩되지 않는 미세 디테일 문제 발생.
2. **원인 및 해결 방안**:
    * 백엔드 재생성 라우트([app/api/image/regenerate/route.ts](file:///home/jaeho/Projects/short_real/app/api/image/regenerate/route.ts) 및 [app/api/video/regenerate/route.ts](file:///home/jaeho/Projects/short_real/app/api/video/regenerate/route.ts))에서 전달받은 모델 ID를 DB 쿼리로 검증할 때 매칭 실패/조건문 스킵으로 인해 `SceneData` 필드 패치가 누락되던 현상을 교정할 예정.
    * UUID 및 endpoint_id 조회를 보정하고 `patchVideoGenerationTask` 시 `selectedI2IAIModelId`, `selectedT2IAIModelId`, `selectedI2VAIModelId`가 100% 무조건 DB `scene_breakdown_list`에 저장되도록 보장해야 함.
    * 프론트엔드([WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx))에서도 컨펌 직후 로컬 state `videoData.sceneBreakdownList`에 선택 모델 ID를 즉시 동기화 반영할 예정.

---

## 3. 향후 작업 (Next Steps)

### Task 3: 이미지 재생성 API의 비동기 Fire-and-Forget 구조 전환
1. **응답 대기 해제 ([app/api/image/regenerate/route.ts](file:///home/jaeho/Projects/short_real/app/api/image/regenerate/route.ts))**:
    * 요청 수신 및 `SceneData.status = GENERATING_IMAGE` 세팅 후 **1초 만에 HTTP 200 OK 비동기 응답(Fire-and-Forget) 반환 구조로 전환**.

### Task 4: [백엔드/파이프라인] 정규 생성 실패 건 선택적 재생성 (Selective Retry) 및 상태 동기화 체계 구축
1. **기술적 실패 씬 선택적 재요청 및 대시보드 연동**:
    * 실패한 씬만 선택적으로 재요청(Selective Retry)하는 파이프라인 필터링 및 대시보드 툴팁 금액 동적 연동.