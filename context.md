2026-05-04 15:45

# 프로젝트 컨텍스트: 하이브리드 오디오 전략 고도화 (Librosa + 2단계 AI 분석)

## 1. 개요
LLM의 기술적 오디오 분석 한계(Hallucination)를 인정하고, **'수학적 정밀도(Librosa)'**와 **'AI의 감성적 선택'**을 결합한 2단계 하이브리드 파이프라인을 구축함. 음악의 박자가 엇나가는 문제와 볼륨 불균형을 원천적으로 해결하는 것이 목표.

## 2. 작업 완료 및 검증 사항

### 2.1 지능형 음성 배속 보정 (Voice Duration Scaling) 구현 완료
- **핵심 성과**: `32.43s` -> `30.00s` 정밀 압축 및 자막 싱크 보정 로직 안착.

### 2.2 Librosa 기반 오디오 전처리기 모델 배포 및 연동 완료
- **모델**: `lht1324/audio-preprocessor` (Replicate 배포 완료)
- **성과**: `app/api/autopilot/music/route.ts`에서 해당 모델을 호출하여 비트 정렬 및 볼륨 정규화가 완료된 후보 클립 3개를 자동 추출하고 Supabase Storage에 저장하는 로직 구현 완료 (Step 2 & 3 완료).

### 2.3 AI 최종 매칭 인터페이스 준비
- **성과**: `llmServerAPI.ts` 내 `postMusicHighlightSelection` 함수 뼈대 구현. AI가 후보 곡들을 직접 듣고 최적의 하나를 고를 수 있는 환경 구축.

## 3. [확정] 하이브리드 오디오 파이프라인 5단계

### 3.1 [Step 1] AI 곡 선택 (Song Selection)
- **목적**: 2개의 후보 곡 중 비디오 주제/감정에 더 어울리는 1곡 낙점.

### 3.2 [Step 2 & 3] 스마트 하이라이트 추출 (Smart Extraction) - [완료]
- **방식**: Replicate 모델을 통해 나레이션 볼륨에 1:1로 맞춰진 박자 정렬 클립 3개 생성 및 스토리지 업로드.

### 3.3 [Step 4] AI 최종 매칭 및 가중치 결정 (Final Matching) - [진행 중]
- **방식**: 1:1 정렬된 나레이션과 후보 클립들을 AI에게 전달하여 최적의 하나를 선택하고 최종 믹싱 Weight(0.1~0.3) 결정.

### 3.4 [Step 5] FFmpeg 정밀 병합 (Final Mixdown)
- **기술**: AI가 결정한 최종 Weight를 적용하여 단 한 번의 FFmpeg 호출로 최종 결과물 생성.

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1.  **후보 곡 AI 분석 로직 완성**: 스토리지에 저장된 후보 곡들을 리샘플링하여 AI에게 전달하고 최종 선택을 받는 과정 완성.
2.  **프롬프트 고도화**: `postMusicHighlightSelection`의 시스템 프롬프트 및 유저 메시지 작성.
3.  **최종 병합 API 연동**: AI의 선택 결과를 `final_video_merge_data`에 반영하고 병합 API 호출.
