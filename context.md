2026-04-30 03:00

# 프로젝트 컨텍스트: 하이브리드 오디오 전략 고도화 (Librosa + 2단계 AI 분석)

## 1. 개요
LLM의 기술적 오디오 분석 한계(Hallucination)를 인정하고, **'수학적 정밀도(Librosa)'**와 **'AI의 감성적 선택'**을 결합한 2단계 하이브리드 파이프라인을 구축함. 음악의 박자가 엇나가는 문제와 볼륨 불균형을 원천적으로 해결하는 것이 목표.

## 2. 작업 완료 및 검증 사항

### 2.1 지능형 음성 배속 보정 (Voice Duration Scaling) 구현 완료
- **핵심 성과**: `32.43s` -> `30.00s` 정밀 압축 및 자막 싱크 보정 로직 안착.
- **기술 스택**: Replicate `ffmpeg-sandbox-2` 활용.

### 2.2 음악 분석 실패 분석 및 피벗 결정
- **한계 발견**: LLM이 긴 오디오에서 정밀한 `startSec`을 찍지 못하는 문제 확인.
- **해결책**: AI에게 주관식(계산)이 아닌 객관식(비교) 문제를 내는 방식으로 구조 변경.

## 3. [확정] 하이브리드 오디오 파이프라인 5단계

### 3.1 [Step 1] AI 곡 선택 (Song Selection)
- **목적**: 생성된 2개의 후보 곡 중 비디오 주제/감정에 더 어울리는 1곡 낙점.
- **방식**: 곡의 태그(Metadata)와 리샘플링된 저화질 오디오를 AI(Gemini)에 전달하여 선택.

### 3.2 [Step 2] 볼륨 포렌식 (Volume Analysis)
- **전략**: **나레이션(Voice)을 기준점(Anchor)**으로 삼고 음악을 여기에 정렬.
- **기술**: FFmpeg `ebur128` 필터를 사용하여 나레이션과 선택된 음악의 **LUFS(체감 볼륨)** 측정.
- **계산**: 음악을 나레이션과 1:1 체감 크기로 맞추기 위한 `Gain`값 도출 (예: 음악이 8dB 크면 -8dB 조정값 확보).

### 3.3 [Step 3] Librosa 하이라이트 추출 (Highlight Extraction)
- **기술**: Replicate에 Cog 기반 전용 모델 배포 (`predict.py`).
- **로직**: `librosa.beat.beat_track`으로 다운비트 위치를 찾고, `RMS Energy` 피크 지점 중 다운비트와 정렬된 $n$개의 후보 구간(30초)을 물리적 파일로 추출.
- **결과**: 3개의 하이라이트 후보 클립 생성 및 Supabase Storage 업로드.

### 3.4 [Step 4] AI 최종 매칭 및 가중치 결정 (Final Matching)
- **방식**: 나레이션과 3개의 후보 클립(1:1 볼륨 정렬 상태)을 AI에게 전달.
- **결정**: 
    1. 가장 감정선이 잘 맞는 클립 1개 선택.
    2. 나레이션 대비 음악의 최종 상대적 가중치(`Weight`, 0.1~0.3) 결정.

### 3.5 [Step 5] FFmpeg 정밀 병합 (Final Mixdown)
- **공식**: `Final_Music_Vol = (Step 2의 1:1 Gain) * (Step 4의 AI Weight)`
- **기술**: 단 한 번의 FFmpeg 호출로 `loudnorm` 표준화와 AI 가중치 적용을 동시에 수행하여 최종 결과물 생성.

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1.  **Librosa 기반 Replicate 모델 배포**: Python/Librosa를 사용하여 비트에 맞춰 하이라이트를 추출하는 스크립트(`predict.py`) 작성 및 Cog 배포.
2.  **`llmServerAPI.ts` 개편**: `postMusicAnalysis`를 `postMusicSelection`과 `postMusicMatch`로 분리.
3.  **볼륨 분석 유틸리티 개발**: FFmpeg를 통해 LUFS를 측정하고 1:1 Gain을 계산하는 서버 로직 구현.
4.  **`/api/autopilot/music` 파이프라인 통합**: 위 5단계를 순차적으로 연결하는 비동기 워크플로우 완성.

