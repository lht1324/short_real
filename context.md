# 작업 진행 상황 (Last Updated: 2026-07-28 03:00)

## 1. 현재 상황 (Current Status)
* **단건 이미지/비디오 비동기 Fire-and-Forget 재생성 파이프라인 연동 완료**:
    * 단건 이미지 재생성 (`/api/image/regenerate`) 및 단건 비디오 재생성 (`/api/video/regenerate`)의 비동기 200 OK 응답 규격 연동 완료.
    * 씬 카드 글래스모피즘 스피너 오버레이 연동 및 Supabase Realtime 실시간 `COMPLETED` 완공 알림/비디오 URL 교체 체계 구축 완료.
    * 비디오 완공 시 1차 속도 배율 후처리 및 Storage 덮어쓰기 완료 상태를 `COMPLETED`로 통합 관리.

---

## 2. 세션 진행 작업 (Work Accomplished in Current Session)

### [UI/UX] 단건 재생성 모달 개편 및 UI 고정 (`SceneRegenerateModal.tsx`)
1. **드롭다운 정렬 헤더 상단 고정 (`sticky top-0`)**:
    * 드롭다운 내부 목록 스크롤 시 `Sort by (Name | Price ↑ | Price ↓)` 헤더가 상단에 착 붙어 고정되도록 구조 개편 (`sticky top-0 bg-zinc-900 z-10 shrink-0`).
2. **모달 화면 수직 위치 고정 (`pt-[18vh] mb-12`)**:
    * 이미지 재생성 시 "비디오 연쇄 재생성" 체크박스를 켜고 끌 때 모달의 전체 높이가 바뀌면서 세로 중앙(`my-auto`) 위치가 변해 마우스 커서 위치가 튀는 UX 현상 해결.
    * `my-auto` 마진을 제거하고 상단 위치를 `pt-[18vh]`로 고정하여 체크박스 연쇄 클릭 시 모달 상단 및 마우스 Y축 위치가 1px도 안 움직이도록 처리.
3. **비디오 드롭다운 슬라이드 애니메이션**:
    * 체크박스 클릭 시 비디오 드롭다운이 아래 방향으로 부드럽게 펼쳐지도록 `animate-in fade-in slide-in-from-top-2 duration-200` 적용.

### [통신/API] 비동기 Fire-and-Forget 통신 약속 규격 통일
1. **클라이언트 API 수신 규격 통일 (`imageClientAPI.ts`)**:
    * 백엔드 비동기 return 규격 (`{ success: boolean, status: number, message?: string, error?: string }`)에 맞춰 `postImageRegenerate` 메서드의 구형 동기식 `imageUrl` 체크 로직 제거 및 표준 반환형으로 개편.
2. **프론트엔드 재생성 핸들러 교정 (`WorkspaceEditorPageClient.tsx`)**:
    * `handleConfirmRegenerate` 내 이미지 재생성 완료 검사 조건(`if (regenerateResult.success)`)을 비동기 표준에 맞추어 교정.
    * 백엔드가 백그라운드 처리를 수행하는 동안 UI 씬 카드는 `status = GENERATING_IMAGE` 로딩 스피너 상태를 안전하게 유지하며, 완공 시 Supabase Realtime 채널이 DB `COMPLETED` 이벤트를 받을 때까지 조용히 대기하도록 수정.

### [Realtime/UX] Supabase Realtime 수신 최적화 및 브라우저 스레드 차단 해제 (`WorkspaceEditorPageClient.tsx`)
1. **`SceneData.status` 변동 씬 정밀 감지 가드 구축**:
    * `videoDataRef`를 도입하여, 수신된 신규 씬 데이터 중 `SceneData.status`가 기존과 실제로 달라진 씬이 1개라도 있을 때만 후속 연산을 타도록 가드 구축 (`statusChangedScenes.length === 0` 시 즉시 반환하여 헛스윙 DB UPDATE 릴레이 연산 완전 차단).
2. **React Strict Mode 중복 팝업 해제**:
    * React 18 개발 모드(Strict Mode)의 State Updater 콜백 2회 실행(Double Invocation)으로 인한 `alert()` 중복 출력 방지를 위해 Side Effect(`alert()`, URL fetch)를 State Updater 함수 바깥으로 분리.
3. **브라우저 동기 블로킹 해제 및 UX 순서 교정**:
    * 브라우저 `alert()`의 동기적 스레드 차단(Freeze) 현상 해결: `await`로 최신 이미지/비디오 URL State를 먼저 바꾼 뒤 UI 화면에 새 이미지가 먼저 교체 렌더링되게 하고, `setTimeout(..., 100)`을 써서 유저 눈으로 바뀐 이미지를 확인한 후 완공 알림 팝업이 출현하도록 UX 순서 완벽 교정.

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