2026-04-30 06:45

# 프로젝트 컨텍스트: 하이브리드 오디오 전략 고도화 (Librosa + 2단계 AI 분석)

## 1. 개요
LLM의 기술적 오디오 분석 한계(Hallucination)를 인정하고, **'수학적 정밀도(Librosa)'**와 **'AI의 감성적 선택'**을 결합한 2단계 하이브리드 파이프라인을 구축함. 음악의 박자가 엇나가는 문제와 볼륨 불균형을 원천적으로 해결하는 것이 목표.

## 2. 작업 완료 및 검증 사항

### 2.1 지능형 음성 배속 보정 (Voice Duration Scaling) 구현 완료
- **핵심 성과**: `32.43s` -> `30.00s` 정밀 압축 및 자막 싱크 보정 로직 안착.
- **기술 스택**: Replicate `ffmpeg-sandbox-2` 활용.

### 2.2 음악 분석 실패 분석 및 피벗 결정
- **해결책**: AI에게 주관식(계산)이 아닌 객관식(비교) 문제를 내는 방식으로 구조 변경.

### 2.3 [NEW] Librosa 기반 하이라이트 추출 모델 개발 및 로컬 테스트 중
- **기술**: Python, Librosa, FFmpeg, Cog 활용.
- **로직**: 슬라이딩 윈도우 기반 RMS 에너지 분석으로 '하이라이트 구간'을 식별하고, 다운비트(Downbeat) 정렬을 통해 박자가 완벽히 맞는 지점부터 커팅하도록 구현.
- **상태**: `predict.py`, `cog.yaml`, `requirements.txt` 작성이 완료되었으며, 클라우드 배포 전 `cog predict`를 통해 로컬 환경에서 결과물의 정밀도 및 LUFS 측정 로직을 최종 검증 중.

## 3. [확정] 하이브리드 오디오 파이프라인 5단계

### 3.1 [Step 1] AI 곡 선택 (Song Selection)
- **목적**: 2개의 후보 곡 중 비디오 주제/감정에 더 어울리는 1곡 낙점.

### 3.2 [Step 2] 볼륨 포렌식 (Volume Analysis)
- **전략**: 나레이션을 기준점(Anchor)으로 삼고 음악의 LUFS를 정렬하여 1:1 Gain값 도출.

### 3.3 [Step 3] Librosa 하이라이트 추출 (Highlight Extraction)
- **방식**: 선택된 곡에서 박자에 맞춘 3~5개의 하이라이트 후보 클립 생성 (Replicate 신규 모델 사용).

### 3.4 [Step 4] AI 최종 매칭 및 가중치 결정 (Final Matching)
- **방식**: 나레이션과 후보 클립들을 비교하여 최적의 하나를 선택하고 최종 믹싱 Weight 결정.

### 3.5 [Step 5] FFmpeg 정밀 병합 (Final Mixdown)
- **공식**: `Final_Music_Vol = (Step 2의 1:1 Gain) * (Step 4의 AI Weight)`

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1.  **Librosa 모델 Replicate 배포**: 로컬 테스트 완료 후 `cog push`를 통한 클라우드 배포.
2.  **`llmServerAPI.ts` 개편**: `postMusicAnalysis`를 `postMusicSelection`과 `postMusicMatch`로 분리 및 프롬프트 최적화.
3.  **서버 사이드 볼륨 분석 유틸리티 개발**: FFmpeg를 통해 나레이션과 음악의 LUFS 차이를 계산하는 로직 구현.
4.  **전체 파이프라인 통합**: `/api/autopilot/music` 엔드포인트에서 5단계를 순차적으로 실행하도록 리팩토링.

테스트 코드: cog predict --debug -i audio_url="https://tbgymsmwuljvewatnvqg.supabase.co/storage/v1/object/sign/narration_voice_storage/0a32d8a3-1428-4946-ba87-0205fe1f0460.mp3?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV9iZjk2NWFiNi1hYmE4LTRkYTEtYTM5Yy0yMDk3ZmQ1ZGU1MGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJuYXJyYXRpb25fdm9pY2Vfc3RvcmFnZS8wYTMyZDhhMy0xNDI4LTQ5NDYtYmE4Ny0wMjA1ZmUxZjA0NjAubXAzIiwiaWF0IjoxNzc3NTgxNDI2LCJleHAiOjE3NzgxODYyMjZ9.BzjOY70F6kH3uDcgzXSqRW9F6q30KTuyelHAxGeuE20"