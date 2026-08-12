# 작업 진행 상황 (Last Updated: 2026-08-12 03:36)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계 목표: 숏폼 영상 편집기의 Remotion 기반 마이그레이션
* 클라이언트(에디터 미리보기/자막 렌더링)는 Remotion Player 기반 전환 **완료**.
* 서버 final merge 파이프라인(ffmpeg 스티칭 + ASS 번인 + BGM 편집) → Remotion 서버 렌더링(`renderMedia`) 교체 **완료** (렌더 품질 문제까지 수정 완료).
* 남은 작업: **구조 정리** — ① `components/remotion`에 `client` 폴더를 만들어 클라이언트 컴포넌트 이전, ② 기존 ffmpeg 로직(feature 잔재) 전수 조사 후 삭제. (내일 진행 예정)

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

### 2-8. Remotion 서버 렌더 파이프라인 구현 + 프레임 스터터 수정 (2026-08-12)
* **서버 렌더 인프라 완성**: `components/remotion/server/` (`FullVideo.tsx` — 씬 스티칭 + 씬별 배속 + 음성 + BGM + 자막 올-인-원 컴포지션, `FullVideoRoot.tsx`, `index.ts`) + `trigger/render-final-video.ts` (Trigger.dev 태스크, `/api/video/merge/final/route.ts`가 등록). mediabunny로 음성 실측 길이 확인, 렌더 후 Supabase 업로드까지 1회로 수렴.
* **렌더 스터터(드드득) 원인 규명/수정**: `<Video>`(브라우저 엘리먼트)가 renderMedia 중 seek 레이스로 **홀드-점프**(같은 프레임 2회 → 2프레임분 점프) 반복. 모션 밴드(자막 없는 y384~768) 비교 분석으로 확정 (Remotion 홀드 33 vs ffmpeg 23, 큰 점프 143 vs 46). 수정: **`<OffthreadVideo>`로 교체** + `concurrency: 2 → 1` + `colorSpace: 'bt709'` (기본값은 yuvj420p full-range/BT.470BG — color flag 미전달 문제, `@remotion/renderer/dist/ffmpeg-args.js`에서 확인). 사장님 재렌더 검증 **통과**.
* 부수 발견: Remotion 결과물에 씬 경계 검은 프레임 2개(162, 294) 존재 — 스터터와 무관한 별개 이슈 (트림/반올림 경계 문제 잔재, 우선순위 낮음).
* **아키텍처 결정: Remotion 올-인-원 채택** (ffmpeg/Remotion 하이브리드 폐기). 근거: 배속 품질은 프레임 선택 기반이라 양쪽 동일(minterpolate 미사용 시), 하이브리드는 배속 씬을 2회 처리(인코딩+캡처), 방금 겪은 버그 3종이 전부 "두 시스템 경계"에서 발생. 배속 씬도 사전 인코딩(`postProcessedVideo`) 없이 raw → `playbackRate`로 통일 예정.
* **기존 ffmpeg 로직 위치 전수 파악 완료** (`merge/final/process/route.ts`에서 정방향 추적): `videoServerAPI.postFinalVideo`(:327, atempo+concat), `postVideoMergeCaption`(:173, ASS 번인), `postVideoMergeMusic`(:214, amix+afade), `musicServerAPI.postMusicModifying`(:157), `captionUtils.generateASSContent`, 웹훅 3개(`webhook/replicate/video/merge/caption`, `video/merge/music`, `music/modifying`). ⚠️ `merge/route.ts:53`도 `postFinalVideo`를 직접 호출 — 삭제 시 호출부 전수 확인 필요.

---

## 3. 향후 작업 (Next Steps)

### 🔴 components/remotion 폴더 구조 정리 (내일 진행)
1. **`client` 폴더 신설**: `components/remotion/` 루트의 클라이언트 전용 컴포넌트(`SceneBlock.tsx`, `CaptionLayer.tsx`, `ShortRealRoot.tsx`, `fonts.ts` 등)를 `components/remotion/client/`로 이전. `server/`(서버 렌더용)와 구조 분리. import 경로 전파 주의(에디터 페이지 등).
2. **기존 ffmpeg 로직 삭제** (2-8에 정리한 위치 전수 확인 후):
    * `app/api/video/merge/final/process/route.ts` (구식 최종 병합 본체)
    * `videoServerAPI.postFinalVideo` / `postVideoMergeCaption` / `postVideoMergeMusic` + `musicServerAPI.postMusicModifying`
    * `captionUtils.generateASSContent` (Remotion 자막이 대체)
    * 웹훅 3개: `webhook/replicate/video/merge/caption`, `video/merge/music`, `music/modifying`
    * `app/api/video/merge/route.ts`, `merge/music/route.ts` (호출부 확인 후 — `merge/route.ts:53`이 postFinalVideo 호출)
3. **배속 씬 올-인-원 전환**: `render-final-video.ts`에서 `postProcessedVideo` 분기 제거 → 전 씬 raw 영상을 `playbackRate`로 처리 (1차 가공본 `video_processed_N` 경로도 정리 대상).

### 🟡 잔여 확인/이슈
* OffthreadVideo 안정성 확인 후 `concurrency: 2` 복귀 테스트 (렌더 시간 단축 여부).
* 씬 경계 검은 프레임 2개(162, 294) — 트림/반올림 경계 이슈, 우선순위 낮음.
* ESLint 설정 순환참조로 린트 불가 상태 (`next lint --file/--dir` 옵션 미지원, 직접 eslint는 circular reference 에러) — tsc --noEmit은 클린.
* (이전 랜딩 페이지 잔여) Features 섹션 소리 복원 최종 확인.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어/한국어 구분 준수, 들여쓰기 공백 4칸.
* Remotion 4.0.507 습성 메모: `component` prop 타입 추론 불가(Record 수용형 패턴), `PlayerProps`에 `onEnded` 없음(`ended` 이벤트 리스너 사용), `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** 사용 (seek 레이스 없음). `colorSpace: 'bt709'` 지정 필수 (기본값 yuvj420p full-range). 저사양 머신에서는 `concurrency: 1`.
* 서명 URL: `postVideoMergeCaption` 등 샌드박스 예약 작업은 `lht1324/ffmpeg-sandbox-2` (Replicate) 사용 중. → 위 ffmpeg 로직 삭제 시 함께 제거 대상.