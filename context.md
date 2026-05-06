2026-05-06 16:30

# 프로젝트 컨텍스트: 하이브리드 오디오 전략 고도화 (Librosa + 2단계 AI 분석)

## 1. 개요
LLM의 기술적 오디오 분석 한계(Hallucination)를 인정하고, **'수학적 정밀도(Librosa)'**와 **'AI의 감성적 선택'**을 결합한 2단계 하이브리드 파이프라인을 구축함. 음악의 박자가 엇나가는 문제와 볼륨 불균형을 원천적으로 해결하는 것이 목표.

## 2. 작업 완료 및 검증 사항

### 2.1 지능형 음성 배속 보정 (Voice Duration Scaling) 구현 완료
- **핵심 성과**: `32.43s` -> `30.00s` 정밀 압축 및 자막 싱크 보정 로직 안착.

### 2.2 Librosa 기반 오디오 전처리기 모델 배포 및 연동 완료
- **모델**: `lht1324/audio-preprocessor` (Replicate 배포 완료)
- **성과**: 비트 정렬 및 볼륨 정규화(나레이션 대비 1:1)가 완료된 후보 클립 자동 추출 로직 구현 완료.

### 2.3 [Step 4] AI 최종 매칭 로직 및 프롬프트 고도화 완료
- **성과**: `llmServerAPI.ts` 내 `postMusicHighlightSelection` 인터페이스를 고도화하여 나레이션(Track 0)과 음악 후보(Track 1~N)를 멀티모달로 분석하는 로직 완성.

### 2.4 [Step 1] 예술적 곡 선택(Artistic Song Selection) 리팩토링 완료
- **성과**: AI의 역할을 '음악 감독'으로 전환하고 시대/장소/톤 기반의 정밀 곡 선정 로직 안착.

### 2.5 [통합] 오토파일럿 음악 분석 엔드포인트 리팩토링 완료
- **성과**: `app/api/autopilot/music/route.ts` 내에 Step 1(곡 선택) -> Step 2(Librosa 추출) -> Step 3(최종 클립 매칭) 파이프라인 구축 완료.
- **최적화**: 최종 선택된 파일을 `autopilot_cut_music.mp3`로 고정하고 `isMusicPreProcessed` 플래그를 통해 병합 API와의 인터페이스 정립.

## 3. [확정] 하이브리드 오디오 파이프라인 5단계

### 3.1 [Step 1] AI 예술적 곡 선택 (Artistic Song Selection) - [완료]
- **목적**: 비디오의 스타일 컨텍스트를 기반으로 최적의 배경음악 후보 1곡 낙점.

### 3.2 [Step 2 & 3] 스마트 하이라이트 추출 (Smart Extraction) - [완료]
- **방식**: 선택된 곡을 기반으로 Librosa 모델을 통해 박자 정렬된 후보 클립 3개 생성 및 업로드.

### 3.3 [Step 4] AI 최종 매칭 및 가중치 결정 (Final Matching) - [완료]
- **방식**: 나레이션과 후보 클립들을 AI가 분석하여 최종 1개 낙점 및 `mixingWeight`(0.15~0.45) 결정.

### 3.4 [Step 5] FFmpeg 정밀 병합 (Final Mixdown) - [진행 중]
- **방식**: 가공 완료 플래그(`isMusicPreProcessed`) 확인 시 별도 컷팅 없이 최종 파일을 그대로 병합.

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1.  **최종 병합 API 연동**: `api/video/merge/final/route.ts`에서 `isMusicPreProcessed` 플래그에 따라 `autopilot_cut_music.mp3`를 우선 사용하도록 로직 수정.
2.  **트리거 워크플로우 검증**: `autopilot-generation-orchestrator.ts`에서 음악 분석 단계가 정상적으로 연쇄 호출되는지 확인.
