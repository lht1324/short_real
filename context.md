# 작업 진행 상황 (Last Updated: 2026-07-24 03:35)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **에디터 씬 단건/연쇄 재생성 통합 모달 구축 및 UI/UX 정제 완료**:
    * **통합 단건 재생성 모달 신설 ([SceneRegenerateModal.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneRegenerateModal.tsx))**:
        * 이미지(`RegenerateMode.IMAGE`) 및 비디오(`RegenerateMode.VIDEO`) 단건 재생성을 단일 모달로 통합 구현.
        * 유저 조작 부담 최적화를 위해 긴 영문 나레이션/시스템 프롬프트 Textarea를 전면 제거.
        * 카테고리별 호환 AI 모델 선택 드롭다운 (`image-to-image`, `image-to-video`) 및 z-index 보정(모달 바깥 뷰포트로 시원하게 팝업).
        * **`ESTIMATED DEDUCTION` 과금 명세서 카드**:
            * 메인 요율($0.0500)을 `text-3xl font-extrabold font-mono text-zinc-100` 서체로 강조.
            * **연쇄 비디오 재생성 옵션 (`[☑️ Also regenerate video with new image]`)**: 체크 토글 시 이미지 요금 + 비디오 요금이 실시간으로 합산 계산됨.
            * **`Itemized Breakdown` (영수증 세부 내역서)**: 체크박스가 선택되었을 때만 카드 하단에 `• Scene Image ($0.0500)` 및 `• Motion Video (+$0.2333)` 세부 항목별 단가가 투명하게 분리 표시되도록 조건부 렌더링.
        * **`design-taste-frontend` 지침 엄격 준수**:
            * 답답하고 흐릿했던 11px 서체 및 `text-zinc-500`을 완전 폐지하고, `14px (text-sm)`와 `text-zinc-300 / text-zinc-100` High Contrast 명도 적용.
        * **모달 Top Y축 고정 및 하향 확장(Downward Expansion) 보정**:
            * 체크박스 토글 시 모달 중심점이 이동하면서 마우스 커서 위치에서 체크박스가 벗어나던 Target Drift 현상을 해결하기 위해 최외각 레이아웃을 `items-start pt-[15vh]`로 상단 고정.
            * 체크박스를 껐다 켤 때 모달 상단 및 체크박스의 Y축 위치가 1px도 흔들리지 않고 아래쪽으로만 시원하고 안정적으로 확장되도록 UI/UX 보정.

    * **씬 카드 UI 개정 ([SceneSequenceItem.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneSequenceItem.tsx))**:
        * 기존 불필요한 `[Settings]` 버튼을 완전 제거하고 **[🖼️ Image]** 및 **[🎬 Video]** 버튼 클릭 시 해당 모드로 모달이 떠오르도록 바인딩.
        * 특정 씬 재생성 진행 중 타 작업 블로킹 없이 해당 카드 영역에만 표시되는 **독립 스피너 오버레이(`Generating Image...` / `Rendering Motion...`)** 구현.

    * **에디터 최상위 아키텍처 연동 및 사전 모델 로드 ([WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx) & [SceneSequencePanel.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneSequencePanel.tsx))**:
        * 부모 `backdrop-blur-sm` 속성으로 인해 좌측 패널(24% 폭) 내부로 `position: fixed` 구획이 갇히던 CSS Containing Block 문제를 해결하기 위해, `<SceneRegenerateModal>`을 최상위 루트(`WorkspaceEditorPageClient.tsx` 최하단)로 이동시킴.
        * 에디터 진입 시(`loadData`) Task에 저장된 `videoGenerationTask.ai_model_config` 모델 ID(`Imagineart 2.0 Preview` / `Seedance 1.5 Pro`) 및 AI 모델 데이터를 사전 준비(Pre-loading)하여 비동기 지연 없이 모달에 1순위로 즉시 바인딩되도록 조치.
        * 모달 확인 클릭 시 추후 백엔드 API 엔드포인트(`POST /api/video/scene/regenerate-image` 및 `POST /api/video/scene/regenerate-video`) 연속 호출 상세 가이드 주석 명시 및 alert() 안내 연동 완료.

* **수정 반영된 파일**:
    * [SceneRegenerateModal.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneRegenerateModal.tsx) (신규)
    * [SceneSequenceItem.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneSequenceItem.tsx) (개정)
    * [SceneSequencePanel.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/SceneSequencePanel.tsx) (개정)
    * [WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx) (개정)

---

## 2. 향후 작업 (Next Steps) - [Priority: CRITICAL]

### 1) [백엔드] 에디터 내 씬별 이미지 & 비디오 개별 재생성 API 라우트 구축
1. **단건 이미지 재생성 엔드포인트 (`POST /api/video/scene/regenerate-image`)**:
   * Fal AI `fal.subscribe` 동기 스트리밍 방식으로 씬 이미지 단건 생성 (기존 `entity_manifest_list` I2I 캐릭터 일관성 유지).
   * Supabase Storage `scene_image_temp_storage`의 `${taskId}/${sceneNumber}.jpeg` 덮어쓰기(`upsert`) 및 신규 Signed URL 반환.
   * `isAlsoRegenerateVideo: true` 응답 시 프론트엔드 2차 연쇄 호출 연동.
2. **단건 비디오 재생성 엔드포인트 (`POST /api/video/scene/regenerate-video`)**:
   * Fal AI `fal.queue.submit` 비동기 웹훅 기반 단건 비디오 생성 요청.
   * 비디오 완공 웹훅 수신 시 `videoServerAPI.postProcessedVideo` 재활용(속도/길이 조절) 후 `processed_video_storage`의 `video_raw_${sceneNumber}.mp4` 및 `video_processed_${sceneNumber}.mp4` 덮어쓰기.