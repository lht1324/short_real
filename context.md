# 작업 진행 상황 (Last Updated: 2026-07-23 03:29)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **에디터 자동 저장 (30초 간격) 및 design-taste-frontend 프리미엄 UI 디자인 추가 완료**:
    * **30초 간격 자동 저장 (Auto-save)**: `WorkspaceEditorPageClient.tsx`에서 사용자가 자막 스타일, 씬별 배속, 선택 음악/구간, 볼륨을 수정할 때 30초마다 조용히 DB에 자동으로 임시 저장(`patchVideoTaskByTaskId`)하는 `useEffect` 및 `onClickAutoSave` 로직 적용 완료.
    * **플로팅 저장 알림 뱃지 (Floating Save Pill)**: 오토파일럿/대시보드 디자인 시스템과 통일된 `Fixed Floating Status Pill` (`Auto-saving...` / `Saved ✓` / `Connection lost`) 백드롭 글래스모피즘 뱃지 렌더링 추가.
    * **프리미엄 로딩 오버레이 (Loading Overlay)**: 초기 에디터 데이터 로딩 및 렌더링 마감(`isFinishLoading`) 시 대시보드 수준의 `backdrop-blur-sm` 오버레이 및 고급형 카드 스타일 로더 연동.
    * **최종 오디오 병합 amix duration=longest 주입**: 성우 대사 끝 지점에서 배경 음악이 잘리지 않고 영상 끝(54.58초)까지 연주되도록 `amix` 필터 개정 완료.

* **수정 반영된 파일**:
    * [WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx)
    * [lib/api/server/videoServerAPI.ts](file:///home/jaeho/Projects/short_real/lib/api/server/videoServerAPI.ts)

---

## 2. 향후 작업 (Next Steps) - [Priority: CRITICAL]

### 1) [백엔드/프론트엔드] 에디터 내 씬별 이미지 & 비디오 개별 재생성 파이프라인 구축 (초안)

#### 🎯 1. 기능 개요 및 추진 목표
* `WorkspaceEditorPageClient` ➡️ `SceneSequencePanel` ➡️ `SceneSequenceItem` 계층 구조를 확장하여, 에디터에서 마음에 들지 않는 **특정 장면(Scene) 단건의 이미지 및 비디오를 개별 재생성**할 수 있는 파이프라인을 구축함.

---

#### 🎨 2. 프론트엔드 UI/UX 설계 (`SceneSequenceItem` & 재생성 모달)
* **씬 카드 썸네일 오버레이 액션 바 (`SceneSequenceItem.tsx`)**:
  * 씬 썸네일 상단/하단에 **[🖼️ Image]**, **[🎬 Video]**, **[⚙️ Option]** 반투명 글래스모피즘 액션 버튼 추가 (9:16 및 16:9 반응형 호환).
  * **1-Click 즉시 재생성**: [Image] 또는 [Video] 클릭 시, 기존 프로젝트 설정 모델 및 프롬프트를 사용하여 1클릭 즉시 단건 재생성을 쏘아보냄.
* **씬 재생성 세부 옵션 모달 (`SceneRegenerateOptionModal.tsx`)**:
  * [⚙️ Option] 클릭 시 모달이 팝업되어, 해당 씬 단건에 대한 **AI 모델 개별 변경(`BYOKModelSelector` 연동: T2I, I2I, I2V)** 및 **이미지/비디오 프롬프트 커스텀 수정** 지원.
* **씬별 독립 로딩 인디케이터**:
  * 특정 씬이 재생성 중일 때 전체 에디터를 블로킹하지 않고, **해당 씬 카드 영역에만 독립적인 반투명 로딩 오버레이 스피너**를 띄워 타 작업과 병행 가능하게 유도.

---

#### 🛠️ 3. 백엔드 API & 파이프라인 설계

1. **단건 이미지 재생성 엔드포인트 (`POST /api/video/scene/regenerate-image`)**:
   * **캐릭터 일관성(Consistency) 유지**: `post-master-style.ts`에서 이미 생성하여 DB (`entity_manifest_list`)에 보관 중인 캐릭터 시트 레퍼런스 이미지 URL을 그대로 참조(`I2I`)하여 캐릭터 연관성을 유지함.
   * `imageServerAPI.postImage` 단건 호출 후 발급된 신규 이미지 URL을 Supabase Storage(`processed_video_storage`)의 `video_image_${sceneNumber}.png`에 덮어쓰기(`upsert`).

2. **단건 비디오 재생성 엔드포인트 (`POST /api/video/scene/regenerate-video`)**:
   * 최신 씬 이미지 URL 및 자막 오디오 시간(`targetDuration`)을 기반으로 Fal AI 비디오 엔진에 단건 비디오 생성 요청.
   * 비디오 완공 웹훅 수신 시 `videoServerAPI.postProcessedVideo`로 1차 속도 조절을 수행하여 `video_raw_${sceneNumber}.mp4` 및 `video_processed_${sceneNumber}.mp4`를 저장하고 에디터 플레이어를 실시간 갱신.

---

#### 📌 4. 레퍼런스 캐릭터 시트 연동 전략 (`post-master-style.ts`)
* 씬 재생성 시엔 기존 `entity_manifest_list` 레퍼런스 이미지를 재활용하여 캐릭터 무너짐 방지 및 처리 속도를 3배 이상 단축.
* 만약 캐릭터 얼굴 자체를 아예 바꾸고 싶어 하는 유저 케이스를 대비해, 에디터 상단에 **Character Sheet (레퍼런스) Viewer/Regenerator 모달** 접점을 연동함.