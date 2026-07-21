# 작업 진행 상황 (Last Updated: 2026-07-22 03:38)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **속도 슬라이더 리셋 버튼 이탈 UI 레이아웃 수정 완료**:
    * **반응형 w-fit 캡슐 스타일로 전환**: 기존에 가로 너비를 `w-[70%]` 고정 비율로 설정하여 요소들의 부피 대비 검은색 알약 컨테이너가 좁아져 리셋 버튼이 테두리 밖으로 탈출하던 문제를 해결했습니다. **`w-fit px-4 min-w-[240px] max-w-[80%] mx-auto`** 스타일을 도입하여 슬라이더 내부 폭에 맞추어 검은색 배경 컨테이너가 자연스럽게 늘어나며 리셋 버튼을 내부에 안정감 있게 가두도록 마크업을 보정 완료했습니다.
* **에디터 이전/다음 횡이동 먹통 및 엇박자 오류 디버깅 완료**:
    * **DB sceneDuration 오리지널 길이 역산 복원**: 완료되었던 태스크를 수동으로 EDITOR 상태로 되돌렸을 때, DB `scene_breakdown_list`의 `sceneDuration`에 이미 배속이 가공/나누기되어 늘어난 시간이 들어있는 현상을 잡았습니다. 최초 로딩 시점(`WorkspaceEditorPageClient.tsx` L500 부근)에 `sceneData.sceneDuration * speedMultiplier` 연산을 통해 **순수한 1.0배속 기준의 원래 씬 길이로 복원**하여 자막 타임테이블(`captionDataList`)의 시작/종료 경계축을 설계함으로써, 씬 전환 및 슬라이더 조작 시 시간 축이 뒤틀리는 근본 데이터 불일치를 완전 종식시켰습니다.
    * **재생(`play()`) 직전 배속 강제 주입으로 정체 버그 해결**: 브라우저가 새 비디오를 버퍼링하며 재생하는 순간 `.playbackRate`를 기본값으로 되돌려버리거나, 리액트 상태 렉(Lag)으로 인해 이전 씬 배속을 타던 문제를 방지하기 위해 **모든 미디어의 `play()` 지점(네비게이션 클릭, 자동 씬 전환, 선제 로드, 일시정지 해제 등 4대 진입점) 바로 직전에 타겟 씬의 최신 배속값(`defaultPlaybackRate` & `playbackRate`)을 강제 고정 주입**하는 방식을 적용하여 싱크가 완벽히 고정되도록 해결했습니다.
    * **expectedIndex 전이 방어망 및 재생 예외 복구**: 이전/다음 버튼 등으로 순간이동(Seek) 후 상태 렉 도중 타이머가 `activeSceneIndex + 1`을 잘못 지목해 재생 충돌을 내던 루프 감지를 `expectedIndex` 기반으로 개정하고, 비디오 `.play()` 거절 시 `.catch` 블록을 달아 잠금 플래그(`isTransitioning`)를 강제 해제하여 플레이어가 완전히 프리징되던 먹통 문제를 철저하게 방제했습니다.
    * **최종 병합본 자막 싱크 밀림 원천 해결**: 개별 씬 비디오를 이어 붙일 때(`videoServerAPI.ts`) 타임스탬프(PTS) 왜곡 렉을 유발해 자막을 밀리게 만들던 `-c copy` 무손실 스트림 복사를 걷어내고, `-c:v libx264 -pix_fmt yuv420p -an`을 적용해 깔끔하게 재인코딩(Re-encode) 병합하도록 보정하여 자막 하이라이트 싱크 지연 버그를 종식시켰습니다.

* **수정 반영된 파일**:
    * [WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx)
    * [VideoPlayerPanel.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/VideoPlayerPanel.tsx)
    * [videoServerAPI.ts](file:///home/jaeho/Projects/short_real/lib/api/server/videoServerAPI.ts)

---

## 2. 향후 작업 (Next Steps) - [Priority: CRITICAL]

### 1) [백엔드] 비디오 렌더링 서버(FFmpeg)의 배속 곱연산 최종 병합 파이프라인 개정
* **최종 곱연산 배율 `X` 계산**: 1차 비디오 배율 `A`와 사용자 조절 배율 `B`를 곱해 단일 팩터 도출.
* **1회 인코딩 필터 개정**: 원본 비디오 파일(`videoRawUrl`)을 직접 입력 소스로 하여 `setpts=(1/X)*PTS` 및 `atempo=X` 필터로 단 1회만 인코딩을 거치도록 리팩토링 진행 예정. (화질 저하 0% 통제)Duration / (실제비디오길이 - 0.2초)`를 계산.
   * Replicate FFmpeg Sandbox를 사용해 `setpts=${videoPtsRatio}*PTS` 필터 연산을 씌워 가공된 개별 클립 비디오(`.mp4`)를 추출하여 `processed_video_storage`에 업로드.
2. **클립 Stitching 및 나레이션 믹싱 (`videoServerAPI.postFinalVideo`)**:
   * 위에서 1차 가공 완료된 개별 비디오 클립들을 순서대로 다운로드한 뒤 하나로 Stitching하고, 그 위에 성우 전체 나레이션 목소리(`audioUrl`)를 믹싱하여 하나의 통합 비디오 파일로 결합.
3. **자막 오버레이 버닝 (`videoServerAPI.postVideoMergeCaption`)**:
   * 생성된 통합 비디오 위에 자막 ASS 파일을 버닝하여 자막 오버레이 영상 생성.
4. **BGM 믹싱 (`videoServerAPI.postVideoMergeMusic`)**:
   * 자막 버닝이 완료된 영상에 배경 음악(BGM) 오디오를 믹스 필터(`amix`)로 결합해 최종 영상 렌더링 완료.

#### ⚠️ 기존 구조에 2차 속도 조절을 그냥 얹을 때의 심각한 문제점 (화질 뭉개짐)
* 기존 체인은 이미 `[Fal 원본]` ➡️ `[1차 배속 인코딩]` ➡️ `[Stitching 인코딩]` ➡️ `[자막 인코딩]` ➡️ `[BGM 인코딩]`의 **다단계 재인코딩(Re-encoding)**을 거치고 있습니다.
* 이 상태에서 사용자가 수정한 2차 배속 값(`speedMultiplier`)을 적용하기 위해 이미 가공 완료된 비디오를 또다시 가속/감속 인코딩하게 되면, **화질이 픽셀 단위로 뭉개지고(Compress Artifacts) 렌더링 소요 시간이 극적으로 지연**되는 치명적인 문제가 발생합니다.

---

#### 2. 배속 조절 연동에 따른 백엔드 변경 계획 (After)
화질 손실을 원천 방지하기 위해, 1차 AI 배속 연산과 2차 사용자 배속 연산을 **FFmpeg 렌더링 파이프라인에서 단 1회의 필터 곱연산으로 처리**하도록 결합 설계해야 합니다.

```
[Fal AI 원본 (videoRawUrl)] 
      ↓
[FFmpeg 1회 인코딩] ─── ( 1차 배속 배율 A * 2차 사용자 조절 배율 B ) 곱연산 적용
      ↓
[Stitching 및 최종 믹싱]
```

* **1단계: 배속 데이터 결합**:
  * DB의 `video_generation_tasks` 테이블에 저장되어 있는 AI 엔진의 1차 비디오 배율 `A` (`videoPtsRatio`)를 추출.
  * 프론트엔드가 **[Finish]** 버튼 클릭 시 POST Body로 쏘아 보낸 JSON 내의 장면별 2차 사용자 배율 `B` (`speedMultiplier`)를 추출.
  * **최종 곱연산 배율 `X` 계산**: `X = A * B` (또는 역산 반영을 위해 `A`와 `B`를 곱해 단일 팩터 도출)
* **2단계: 원본 영상 기반의 1회 인코딩 필터 개정**:
  * 1차 가공 완료된 영상(`.mp4`)을 입력물로 쓰지 않고, ** Fal AI가 생성한 최초 원본 비디오 파일(`videoRawUrl`)**을 직접 입력 소스로 타겟팅.
  * FFmpeg 필터에 곱연산 배율 `X`를 주입하여 **단 1회만 인코딩**을 거치도록 리팩토링:
    * **비디오 속도 제어**: `setpts=(1/X)*PTS`
    * **오디오 속도 제어**: `atempo=X` (성우 보이스오버 배속 싱크 및 자막 지속 시간 일치 유도)
  * 이로써 [reconstruction_plan.md](file:///home/jaeho/Projects/short_real/reconstruction_plan.md)에 상세 설계된 씬 슬라이싱 및 믹싱 순서를 충족하며 화질 저하를 0%로 통제함.

#### 🚨 에이전트 주의 지침 (CRITICAL)
* 백엔드 API 및 인코딩 서버 코드를 개정하기 전에, **FFmpeg 필터 명령어의 정확한 인코더 옵션 및 곱연산 스크립트 설계안에 대해 사장님께 먼저 보고하고 최종 승인을 득한 후 작업을 시작하십시오.** (AGENTS.md 규칙 준수)
