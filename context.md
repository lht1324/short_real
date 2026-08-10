# 작업 진행 상황 (Last Updated: 2026-08-11 03:43)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: 숏폼 영상 편집기의 Remotion 기반 마이그레이션
* 클라이언트(에디터 미리보기/자막 렌더링)는 Remotion Player 기반 전환 **완료**.
* 서버 final merge 파이프라인(ffmpeg 스티칭 + ASS 번인 + BGM 편집)을 Remotion 서버 렌더링(`renderMedia`)으로 교체하는 작업 **남음**.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-1. Remotion Player 마이그레이션 후속 수정 (타입/런타임 정리)
* **TS 타입 에러 전면 해소** (`npx tsc --noEmit` 클린):
    * Remotion 4.0.507의 `Player`/`Composition`은 `component` prop의 제네릭 추론이 불가능한 구조(유니언 제네릭)라 Props가 `Record<string, unknown>`으로 폴백됨 → `SceneBlock`을 `Record<string, unknown>` 수용형으로 선언 후 내부에서 `as unknown as RemotionSceneInput` 캐스팅.
    * `SceneBlock`: `Loop`에 `durationInFrames` 부여(`useVideoConfig` 활용), `memo()` 제거, `Player`에서 `playbackRate` 제거.
    * `components/remotion/fonts.ts`: 서버 렌더 환경 안전을 위한 `document` 가드 추가.
    * `playerRef.play()` 반환이 void인 버전이라 기존 `.catch()` 제거.
* 파일: `components/remotion/SceneBlock.tsx`, `ShortRealRoot.tsx`, `fonts.ts`, `components/page/workspace/editor/VideoPlayerPanel.tsx`

### 2-2. 장면 자동 전환 버그 수정 (4단계)
1. **전환 미발생**: 기존 조건(`frameupdate` + 마지막 프레임 + 정지)이 Remotion 자동 정지 타이밍과 어긋남 → **PlayerRef `ended` 이벤트** 기반으로 교체.
2. **전환 후 음악만 재생**: 활성 씬 카드가 바뀌면 `Player`가 통째로 리마운트(`autoPlay=false`)되어 영상/음성 정지 → 리마운트 동기화 effect 추가 (`isPlaying === true`면 새 Player를 프레임 0부터 재생).
3. **음성 초반부 컷**: 전환 직후 새로 마운트된 음성이 콜드 로드되어 버퍼링 후 현재 위치에 합류 → 현재/이전/다음 씬 음성 **프리로드**(숨은 `Audio` 요소 + 브라우저 캐시 워밍, 사용 종료 엔트리 정리 로직 포함).
4. **프로그레스 바 씬 2 이후 정지**: `frameupdate` 리스너가 빈 deps(`[]`)로 등록되어 리마운트 시 사라짐 → deps에 `activeSceneIndex` 추가해 재바인드.
* 파일: `components/page/workspace/editor/VideoPlayerPanel.tsx`

### 2-3. 자막 렌더링: 청크(묶음) 카라오케 방식으로 전면 재설계
* **업계 조사 결론**: 숏폼 자막 표준 = **1~3단어 묶음 + 활성 단어 강조**, 묶음은 흘러가듯 누적되지 않고 **통째로 교체**. 카라오케 최적 크기 70~90px@1080, Hue Hormozi 스타일(굵은 산스 + 강조색)이 지배적.
* `CaptionLayer` 전면 재작성:
    * 청크 단위 교체(청크 시작 인덱스 기준 고정 경계) + 단어 간 갭에서도 묶음 유지(논리 활성 인덱스).
    * 활성 단어만 스프링 팝(0.9→1.1, Y리프트), 비활성 단어 45% 투명도.
    * `captionChunkSize` 추가: `auto`(Hormozi 기본, 목표 캐던스 0.9초 기준 평균 단어 길이로 2~3단어 자동 산출), 2/3/4 고정.
* **Word Grouping 선택기 UI** 추가 (Auto / 2 / 3 / 4) — 에디터 + 오토파일럿 양쪽 동작.

### 2-4. 폰트 크기 단위 재정의: "px @1080" 절대 단위 전환
* 기존 `REMOTION_DESIGN_WIDTH = 360` 설계 기준 → **1080 출력 해상도 기준**으로 전환. (가장 중요한 사실: 컴포지션은 소스 해상도와 무관하게 9:16 = 1080×1920, 16:9 = 1920×1080 고정이라 캔버스 px가 곧 절대 단위)
* 슬라이더/입력 범위 36~84 → **48~120**, 기본값 48 → **72** (업계 카라오케 스위트 스팟) — 에디터/오토파일럿/ShortRealRoot 일괄.
* 라벨을 "px" → **"px @1080"** + 보조 표기 **"≈ {X}% of frame height"**(aspectRatio별 실제 캔버스 기준 계산) 추가.
* 아웃라인 두께 환산 공식 재보정(`36 * fontSize/72 * width/1080`) — 시각 비율 기존과 동일.
* 서버 ASS 경로(`captionUtils`의 `captionOneLineHeight`)도 같은 환산 함수 경유라 자동 일관성 확인.
* 참고: 기존 저장 설정(예: 48)은 이후 "48px @1080" = 업계 최소 가독 수준으로 해석됨.

### 2-5. 서명 URL 만료 대응 (Remotion MediaPlaybackError Code 4)
* **원인**: 씬 영상/음성 URL은 전부 **1시간 만료 Supabase 서명 URL**(`/api/video/task/[taskId]/urls`가 3600s 발급). 마운트 시 1회만 발급받고 편집 세션이 1시간을 넘기면 전체 미디어 만료 → Remotion `<Video>`가 명시적으로 에러 스로우. (기존 `<video>`는 파일 전체를 1회 버퍼링 + HTTP 캐시로 만료가 은폐됐음)
* **수정**: 에디터 로드 완료 후 **50분 주기 자동 재발급 interval** (`getVideoTaskUrls` 재호출 → `scenesUrlData` 갱신) + 음성 프리로드 캐시의 만료 URL 엔트리 정리.

### 2-6. 단어 애니메이션 6종 구현 + Word Animation 선택기
* `RemotionCaptionStyleConfig.captionAnimation`: **pop**(기본, 업계 스탠다드) / **swift**(오버슛 없는 스내피) / **fadeSlide**(슬라이드+페이드, 차분) / **bounce**(과장 팝) / **colorOnly**(무빙 0) / **highlightBar**(단어 뒤 활성색 반투명 배너 페이드 인).
* 기존 저장 데이터는 미지정 시 `pop`으로 자동 폴백.

### 2-7. 컨트롤 오버레이 네이티브 드래그 고스터 제거
* 버튼/속도/프로그레스 바 클러스터가 드래그 시 브라우저 드래그 고스트로 떠다니는 현상 → 오버레이 루트에 `onDragStart` preventDefault + `select-none` 추가, 슬라이더들에 `touch-action: none`.

---

## 3. 향후 작업 (Next Steps)

### 🔴 서버 Remotion 마이그레이션 (핵심 남은 작업)
1. **서버 렌더 인프라**: Remotion 서버 사이드 렌더링(`renderMedia` + 번들, Chrome headless) 환경 구성.
2. **FullVideo 컴포지션 작성**: `RemotionFullVideoInput`(remotionTypes.ts:82) 계약 기반 주 컴포지션 — 씬 스티칭 + 씬별 배속 + 음성 + BGM(startSec/endSec/volume) + 자막을 하나의 렌더로 (기존 씬 단위 SceneBlock 구조를 전체 타임라인으로 확장).
3. **`/api/video/merge/final/process` 교체**: `postFinalVideo`(ffmpeg 스티칭) + `generateASSContent`/`postVideoMergeCaption`(ASS 번인) + `postMusicModifying`(BGM) 파이프라인 → `renderMedia` 1회로 수렴. 상태 전이/DB 갱신(`final_video_merge_data` 배속 타임라인 재계산)/업로드는 기존 로직 유지.
4. ASS 기반 폴백은 당분간 유지 (롤백 안전망).

### 🟡 잔여 확인 항목 (사장님 프리뷰 필요)
* 자막 Word Grouping/Word Animation 토글 실동작 확인 (특히 Highlight Bar 가독성).
* 50분 URL 자동 재발급 실측 (검증 시 `50 * 60 * 1000`을 임시로 `10 * 1000`으로 단축 가능).
* (이전 랜딩 페이지 잔여) Features 섹션 소리 복원 최종 확인.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어/한국어 구분 준수, 들여쓰기 공백 4칸.
* Remotion 4.0.507 습성 메모: `component` prop 타입 추론 불가(Record 수용형 패턴), `PlayerProps`에 `onEnded` 없음(`ended` 이벤트 리스너 사용), `play()` 반환 void.
* 서명 URL: `postVideoMergeCaption` 등 샌드박스 예약 작업은 `lht1324/ffmpeg-sandbox-2` (Replicate) 사용 중.