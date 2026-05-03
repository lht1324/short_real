2026-04-30 07:15

# 프로젝트 컨텍스트: 하이브리드 오디오 전략 고도화 (Librosa + 2단계 AI 분석)

## 1. 개요
LLM의 기술적 오디오 분석 한계(Hallucination)를 인정하고, **'수학적 정밀도(Librosa)'**와 **'AI의 감성적 선택'**을 결합한 2단계 하이브리드 파이프라인을 구축함. 음악의 박자가 엇나가는 문제와 볼륨 불균형을 원천적으로 해결하는 것이 목표.

## 2. 작업 완료 및 검증 사항

### 2.1 지능형 음성 배속 보정 (Voice Duration Scaling) 구현 완료
- **핵심 성과**: `32.43s` -> `30.00s` 정밀 압축 및 자막 싱크 보정 로직 안착.

### 2.2 음악 분석 실패 분석 및 피벗 결정
- **해결책**: AI에게 주관식(계산)이 아닌 객관식(비교) 문제를 내는 방식으로 구조 변경.

### 2.3 [NEW] Librosa 기반 하이라이트 추출 및 볼륨 정규화 모델 검증 완료
- **기술**: Python, Librosa, FFmpeg, Cog 활용.
- **로직 고도화**: 
    1. **Voice Anchor**: 나레이션 오디오의 LUFS를 먼저 측정하여 기준점으로 설정.
    2. **Beat-Aligned Cutting**: 슬라이딩 윈도우 에너지 분석 + 다운비트 정렬로 박자가 완벽히 맞는 하이라이트 구간 추출.
    3. **1:1 Normalization**: 추출된 각 음악 클립을 나레이션의 LUFS와 수학적으로 일치하도록 자동 Gain 조절(1:1 매칭).
- **검증 결과**: 로컬 테스트(`cog predict`)에서 음성(-23.0 LUFS)에 맞춰 음악 클립들이 정밀하게 보정(예: -12.20dB Gain 적용)되는 것을 확인.

## 3. [확정] 하이브리드 오디오 파이프라인 5단계

### 3.1 [Step 1] AI 곡 선택 (Song Selection)
- **목적**: 2개의 후보 곡 중 비디오 주제/감정에 더 어울리는 1곡 낙점.

### 3.2 [Step 2 & 3] 스마트 하이라이트 추출 (Smart Extraction)
- **방식**: 신규 Replicate 모델을 통해 나레이션 볼륨에 1:1로 맞춰진 박자 정렬 클립 3~5개 생성.

### 3.3 [Step 4] AI 최종 매칭 및 가중치 결정 (Final Matching)
- **방식**: 1:1 정렬된 나레이션과 후보 클립들을 AI에게 전달하여 최적의 하나를 선택하고 최종 믹싱 Weight(0.1~0.3) 결정.

### 3.4 [Step 5] FFmpeg 정밀 병합 (Final Mixdown)
- **기술**: AI가 결정한 최종 Weight를 적용하여 단 한 번의 FFmpeg 호출로 최종 결과물 생성.

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1.  **Librosa 모델 Replicate 배포**: 로컬 테스트 완료된 모델 `cog push`.
2.  **`llmServerAPI.ts` 개편**: `postMusicAnalysis`를 `postMusicSelection`과 `postMusicMatch`로 분리 및 프롬프트 최적화.
3.  **`/api/autopilot/music` 파이프라인 통합**: 위 5단계를 순차적으로 연결하는 비동기 워크플로우 완성.
