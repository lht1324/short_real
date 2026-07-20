# 작업 진행 상황 (Last Updated: 2026-07-21 03:41)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **프론트엔드 장면 배속(speedMultiplier) 조작 및 HUD 오버레이 고도화 완료**:
    * **렉 방지용 `sceneSpeedList` 분리 캐싱**: 슬라이더 값을 조작할 때 무거운 자막 전체 목록(`captionDataList`)을 리렌더링하는 것을 방지하기 위해 가벼운 `{ sceneNumber: number; speedMultiplier: number; }[]` 상태를 신설. 사용자가 **[Finish]** 버튼을 누를 때 레이지 조인(Lazy Join)되어 백엔드로 일괄 전송되도록 저장 흐름 연동 완료.
    * **실시간 배속 변조(playbackRate) 적용**: 에디터 상에서 배속 슬라이더(0.5x ~ 2.0x) 조작 시 현재 활성화된 비디오(`HTMLVideoElement`) 및 성우 목소리 오디오(`HTMLAudioElement`)의 `playbackRate`를 실시간 강제 매핑하여 재생 속도 및 소리 싱크를 맞춤.
    * **가상 시간 동적 델타 싱크**: 플레이어 가상 시간 누적 루프(`elapsed * playbackRate`)와 연동되어 자막 흘러감 속도가 영상 배속에 맞춰 완전히 자동으로 동기화됨.
    * **장면 로컬 프로그레스 바 원복 및 클릭 감도 보정**: 프로그레스 바의 시간 계산식을 전체 기준에서 다시 **현재 활성화된 장면 한정(Scene Duration)** 범위로 환원하고, 마우스 클릭 및 드래그 편의성을 위해 바의 기본 두께(`h-1.5` ➡️ `h-2.5`) 및 호버 시 두께(`hover:h-3.5`), 노브 크기(`w-4`)를 인체공학적으로 보정.
    * **3D Carousel 카드 직접 클릭 네비게이션 복구**: 이전/다음 씬 전환을 좁은 버튼 조준 대신 좌우 대기 카드를 직접 툭툭 클릭하는 것으로도 횡이동이 가능하도록 구현.
    * **3D 카드 마우스 호버 입체 효과**: 대기 중인 카드를 호버할 때 z축 위로 들림(`scale(0.93)`, `zIndex: 20`), 어둡고 흐리던 블러 디포커스 해제(`blur(0.5px)`), 테두리 글로우 라이트(`border-white/30`) 효과를 부여하여 고유 깊이감을 연출하고 클릭 햅틱(찌그러짐) 모션을 제거해 쾌적함 유지.
    * **고스트 잔상 겹침 차단**: 2단계 거리 이상 떨어진 먼 카드는 `opacity: 0` 및 `zIndex: 0`으로 완전 차단하여 화면에 메인 카드 1개와 좌우 인접 카드 2개(= 총 3개)만 노출되도록 제한.
    * **재생 중 횡이동 엇박자 버그 수리**: 재생 중 씬 전환 시 `currentTimeRef` 누락으로 무한 씬전환에 빠져 목소리가 0초에서 다다닥 튀던 현상을 100% 디버깅 완료하여, 이동 시 영상/목소리/BGM/자막이 칼싱크로 이어서 재생되도록 고침.
    * **HUD 2층 복층 오버레이 구현 (음악 바 겹침 충돌 영구 해방)**:
        * 하단에 턱을 형성해 세로 가용 높이를 초과하여 아래 음악 편집 바(Music Panel) 영역을 짓누르던 검은색 하단 플레이어 대시보드 바를 완전히 제거.
        * **[상단 HUD (`top-4`)]**: `[◀ SCENE 01 ▶]` 모양의 둥글고 시인성이 스케일업된 서클 단추 컨트롤 캡슐을 상단 중앙에 플로팅.
        * **[하단 HUD (`bottom-4`)]**: 속도 슬라이더 캡슐을 가로폭의 70%인 `w-[70%]` 콤팩트 크기로 다이어트해 불필요한 `SPEED` 텍스트를 제거하고 슬라이더 실질 트랙 작동 거리를 2.5배 널널하게 확장하여 정중앙 배치. 타임라인과의 상하 세로 간격 마진도 촘촘하게 좁혀 비디오 카드 580px 영역 내부 오버레이로 완전히 봉인.
    * **수정 반영된 파일**:
        * [WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx)
        * [VideoPlayerPanel.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/VideoPlayerPanel.tsx)

---

## 2. 향후 작업 (Next Steps) - [Priority: CRITICAL]

### 1) [백엔드] 비디오 렌더링 서버(FFmpeg)의 배속 곱연산 최종 병합 파이프라인 개정
> [!IMPORTANT]
> 본 백엔드 FFmpeg 곱연산 stitched 병합 파이프라인 개발 시, 전체 기믹과 무음 공백 처리 로직에 대해 마스터플랜으로 작성된 **[reconstruction_plan.md (장면 단위 마이크로 파이프라인 및 에디터 개편 계획서)](file:///home/jaeho/Projects/short_real/reconstruction_plan.md)**를 필독 및 연계 참조하십시오.

#### 1. 기존 동작 로직 (Before)
최종 병합 API(`POST /api/video/merge/music`) 호출 시, 기존에는 다음과 같은 **4단계 순차적 인코딩 체인**을 거쳐 최종 비디오를 도출하고 있었습니다.
1. **1차 비디오 개별 가공 (`videoServerAPI.postProcessedVideo`)**:
   * Fal AI에서 생성된 원본 영상(`videoRawUrl`)을 다운로드하여 성우 나레이션 음성 길이(`targetDuration`)에 맞추기 위해 **1차 배속 가속/감속** 처리.
   * `videoPtsRatio = targetDuration / (실제비디오길이 - 0.2초)`를 계산.
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
