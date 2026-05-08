2026-05-08 22:00

# 프로젝트 컨텍스트: 지능형 LUFS 기반 오디오 믹싱 전략 (Intensity-based Audio Balancing)

## 1. 개요
LLM의 기술적 오디오 수치 분석 한계와 AI 생성 음악의 일관성 없는 마스터링 레벨 문제를 해결하기 위해, **'수학적 상대 목표치(Target LUFS)'**와 **'AI의 스크립트 강도 분석'**을 결합한 지능형 오디오 믹싱 파이프라인을 구축함.

## 2. [신규 전략] Intensity-based LUFS Matching - [구현 완료]
음악의 절대적인 볼륨(% 또는 dB)을 결정하는 대신, 나레이션 음성 대비 일정한 LU(Loudness Unit) 차이를 유지하는 방식.

### 2.1 핵심 공식
- **공식**: `Target Music LUFS = Voice LUFS - Offset`
- **Gain 계산**: `gain(dB) = Target Music LUFS - Current Music LUFS`
- **FFmpeg 적용**: `-af volume={gain}dB`

### 2.2 격렬함(Intensity)에 따른 오프셋 매핑
LLM은 오디오를 듣지 않고 **스크립트 텍스트**만 분석하여 강도를 1~10 정수로 판정함.
- **선형 보간 공식**: `Offset = 15.0 - (Intensity - 1) * (10.0 / 9.0)`
- **결과**: Intensity 1 (-15dB) ~ Intensity 10 (-5dB)

## 3. 작업 완료 및 검증 사항

### 3.1 AI 분석 로직 고도화 (Step 4) - [완료]
- `POST_MUSIC_HIGHLIGHT_SELECTION_PROMPT.ts` 및 `llmServerAPI.ts` 수정 완료.
- AI가 스크립트를 분석하여 `script_intensity(1~10)`를 반환하도록 지능화.

### 3.2 오토파일럿 파이프라인 연동 - [완료]
- `app/api/autopilot/music/route.ts`에서 `scriptIntensity`를 바탕으로 `mixingGainDb` 자동 계산 및 저장 로직 구현 완료.

### 3.3 최종 병합 API 연동 (Step 5) - [완료]
- `api/video/merge/final/route.ts` 및 `musicServerAPI.ts` 수정 완료.
- % 단위 대신 dB 단위의 게인값을 Replicate(`ffmpeg-audio-modifier`)에 전달하여 정밀 믹싱 수행.

### 3.4 데이터 스키마 확장 - [완료]
- `FinalVideoMergeData` 인터페이스에 `mixingGainDb` 필드 추가 완료.

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1.  **실제 결과물 청취 테스트**: 다양한 Intensity 점수(1, 5, 10)에 따른 음악 믹싱 밸런스가 사장님의 의도와 일치하는지 최종 확인.
2.  **Replicate 모델 검증**: `ffmpeg-audio-modifier`가 `mixing_gain_db` 입력을 정확히 처리하는지(혹은 업데이트 필요한지) 모니터링.
3.  **트리거 워크플로우 전체 점검**: 곡 선택부터 최종 병합까지의 전 과정이 오토파일럿 모드에서 예외 없이 작동하는지 확인.
