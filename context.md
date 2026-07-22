# 작업 진행 상황 (Last Updated: 2026-07-23 02:30)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **최종 오디오 병합 시 amix duration=longest 필터 옵션 주입 완료 (BGM 싹둑 끊김 완벽 해결)**:
    * **배경음악 끊김 원천 소탕**: `videoServerAPI.ts` (`postVideoMergeMusic`)에서 배경음악 믹싱 시 기존 `amix` 기본값(`duration=shortest`)이 성우 대사가 53.28초에 끝나는 스트림을 따라가 배경음악(54.58초)을 싹둑 잘라버리던 현상을, `amix=inputs=2:duration=longest` 인자 주입으로 정밀 개정했습니다.
    * **자연스러운 여운 완성**: 성우 대사가 53.28초에 끝난 후, 남은 1.3초 동안 배경 음악(BGM)이 끊기지 않고 54.58초 영상 마감까지 아름답게 계속 연주되는 기존 3박자 동기화 구조를 완전히 회복했습니다.
    * **MediaBunny 실측 기반 비디오 배속 렌더링(MediaBunny computeDuration) 및 -bf 0 적용 완료**: 비디오 팽창(59초) 및 인코더 Flush 딜레이 현상을 완전히 차단했습니다.

* **수정 반영된 파일**:
    * [lib/api/server/videoServerAPI.ts](file:///home/jaeho/Projects/short_real/lib/api/server/videoServerAPI.ts)
    * [app/api/video/merge/final/route.ts](file:///home/jaeho/Projects/short_real/app/api/video/merge/final/route.ts)
    * [WorkspaceEditorPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/editor/WorkspaceEditorPageClient.tsx)

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
