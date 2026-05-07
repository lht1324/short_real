2026-05-08 21:00

# 프로젝트 컨텍스트: 지능형 LUFS 기반 오디오 믹싱 전략 (Intensity-based Audio Balancing)

## 1. 개요
LLM의 기술적 오디오 수치 분석 한계와 AI 생성 음악의 일관성 없는 마스터링 레벨(-12~-14 LUFS) 문제를 해결하기 위해, **'수학적 상대 목표치(Target LUFS)'**와 **'AI의 스크립트 강도 분석'**을 결합한 지능형 오디오 믹싱 파이프라인을 구축함.

## 2. [신규 전략] Intensity-based LUFS Matching
음악의 절대적인 볼륨(% 또는 dB)을 결정하는 대신, 나레이션 음성 대비 일정한 LU(Loudness Unit) 차이를 유지하는 방식.

### 2.1 핵심 공식
- **공식**: `Target Music LUFS = Voice LUFS - Offset`
- **Gain 계산**: `gain(dB) = Target Music LUFS - Current Music LUFS`
- **FFmpeg 적용**: `-af volume={gain}dB`

### 2.2 격렬함(Intensity)에 따른 오프셋 매핑
LLM은 오디오를 듣지 않고 **스크립트 텍스트**만 분석하여 강도를 1~10 정수로 판정함.

| 격렬함(Intensity) | 오프셋(Offset) | 분위기 예시 |
| :--- | :--- | :--- |
| 1 | 15.0 LU | 매우 차분함 (학습, 설명, 정보 전달) |
| 5 | 10.6 LU | 일반적 (동기부여, 스토리텔링) |
| 10 | 5.0 LU | 매우 강렬함 (액션, 하이라이트, 강한 감정) |

- **선형 보간 공식**: `Offset = 15.0 - (Intensity - 1) * (10.0 / 9.0)`

## 3. 작업 완료 및 검증 사항 (이전 세션 포함)

### 3.1 지능형 음성 배속 보정 (Voice Duration Scaling) - [완료]
- `32.43s` -> `30.00s` 정밀 압축 및 자막 싱크 보정 로직 안착.

### 3.2 하이브리드 음악 처리 파이프라인 구축 - [완료]
- **Step 1 (선정)**: AI의 '음악 감독' 역할을 통한 예술적 곡 선정.
- **Step 2 & 3 (추출)**: Replicate(Librosa) 기반 박자 정렬 클립 자동 추출.
- **Step 4 (매칭)**: 나레이션과 후보 클립 간의 최종 매칭.

### 3.3 오토파일럿 음악 분석 엔드포인트 리팩토링 - [완료]
- `app/api/autopilot/music/route.ts` 내 파이프라인 통합 완료.
- 최종 파일을 `autopilot_cut_music.mp3`로 고정.

## 4. 향후 작업 (Next Steps) - [Priority: CRITICAL]
1.  **Intensity 분석 로직 구현**: LLM 프롬프트에 '스크립트 격렬함(1~10)' 판정 로직 추가 및 데이터 스키마 반영.
2.  **LUFS 실측 및 Gain 계산기 구현**: 
    - `ffmpeg -i {file} -af ebur128=peak=true -f null -` 명령을 통해 Voice와 Music의 LUFS 각각 실측.
    - 위 공식을 적용하여 최종 `gain` 값을 도출하는 유틸리티 작성.
3.  **최종 병합 API 연동**: `api/video/merge/final/route.ts`에서 계산된 `gain` 값을 FFmpeg 필터에 적용하도록 수정.
4.  **트리거 워크플로우 검증**: 전체 오토파일럿 과정에서 새로운 믹싱 전략이 정상 작동하는지 확인.
