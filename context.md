# 작업 진행 상황 (Last Updated: 2026-07-26 03:33)

## 1. 현재 상황 (Current Status)
* **단건 이미지 재생성 테스트 성공**:
    * 단건 씬 이미지 재생성, LLM 신규 프롬프트 재선출, `display_name` 1:1 T2I/I2I 모델 자동 매칭, Storage 파일 덮어쓰기 및 에디터 UI 갱신 테스트를 완료했습니다.
    * `trigger/post-image.ts`와 동일하게 `subjectEntityManifestList`에서 `role === 'main_hero' || role === 'sub_character'` 필터링 및 `entityOrder` 정렬을 보정하여 Storage `Object not found` 500 에러를 전면 해소했습니다.
    * `imageClientAPI.postImageRegenerate` 및 `videoClientAPI.postVideoRegenerate` 클라이언트 모듈 작성 완료.
    * 에디터 UI에서 재생성 버튼 클릭 시 직관적인 `alert()` 알림 수신 연동 완료.

---

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]

### Task 1: `SceneData` 내 씬별 사용 AI 모델 ID 필드 신설 및 재생성 모달 연동
1. **타입 추가 ([VideoGenerationTasks.ts](file:///home/jaeho/Projects/short_real/lib/api/types/supabase/VideoGenerationTasks.ts))**:
    * `SceneData` 인터페이스에 해당 씬에 적용된 `selectedImageModelId?: string`, `selectedVideoModelId?: string` 필드를 신설.
2. **모델 ID 생애주기 (Lifecycle) 구현**:
    * **초기화**: `undefined` 또는 유저 프로필(`Users.preferred_ai_model_config`) 설정값으로 초기화.
    * **태스크 생성 시**: 태스크 수준에서 최종 설정된 모델 ID로 덮어쓰기.
    * **재생성 시**: 재생성 모달에서 다른 모델이 선택되면 **해당 씬 `SceneData`의 해당 필드값으로 덮어쓰기**.
3. **모달 연동 ([SceneRegenerateModal.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneRegenerateModal.tsx))**:
    * 모달을 열 때 기본(Default)으로 보여줄 모델 ID를 Task 전체 설정이 아닌 **해당 씬 `SceneData`의 필드값**에서 추출하여 표시.

### Task 2: `SceneGenerationStatus` 세분화 및 씬 카드 로딩 UI 연동
1. **상태 세분화 ([VideoGenerationTasks.ts](file:///home/jaeho/Projects/short_real/lib/api/types/supabase/VideoGenerationTasks.ts))**:
    * `SceneGenerationStatus` enum에 씬 단위 생성 중 상태인 `GENERATING_IMAGE`, `GENERATING_VIDEO` 추가.
2. **씬 카드 로딩 연동 ([SceneSequenceItem.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneSequenceItem.tsx))**:
    * 재생성 시작 시 `SceneData.status`를 `GENERATING_IMAGE` 또는 `GENERATING_VIDEO`로 변경.
    * `SceneSequenceItem.tsx` 씬 카드는 `SceneData.status` 값에 따라 로딩 스피너 오버레이("Generating Image...", "Rendering Motion...")를 동적으로 렌더링.

### Task 3: 이미지 재생성 API의 비동기 Fire-and-Forget 구조 전환
1. **응답 대기 해제 ([app/api/image/regenerate/route.ts](file:///home/jaeho/Projects/short_real/app/api/image/regenerate/route.ts))**:
    * 현재 이미지 재생성이 Fal AI 렌더링 완공 시까지 HTTP 응답을 수 초간 지연 대기(await)하는 동기 방식인 문제점 개선.
    * 요청 수신 및 `SceneData.status = GENERATING_IMAGE` 세팅 후 **1초 만에 HTTP 200 OK 비동기 응답(Fire-and-Forget) 반환 구조로 전환**.
    * 완료 후 `SceneData.status`를 `COMPLETED`로 갱신하거나 이벤트/웹훅으로 상태 동기화.

### Task 4: [백엔드/파이프라인] 정규 생성 실패 건 선택적 재생성 (Selective Retry) 및 상태 동기화 체계 구축
1. **기술적 실패 씬 선택적 재요청**:
    * 정규 생성 진행 중 기술적 오류로 실패한 씬만 선택적으로 재요청(Selective Retry)하는 파이프라인 필터링 검토.
2. **대시보드 UI 연동 ([DashboardItem.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/dashboard/DashboardItem.tsx))**:
    * `SceneData.status` 동기화를 바탕으로 Retry 영수증 툴팁 가격이 실패한 씬 기준으로 동적으로 정확히 계산되도록 연동.