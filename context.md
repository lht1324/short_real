2026-05-09 12:15

# 프로젝트 컨텍스트: 오토파일럿 자동 업로드 파이프라인 고도화

## 1. 개요
Trigger.dev 기반 오토파일럿 스케줄러(`autopilot-upload-orchestrator`)에서 YouTube/TikTok 업로드 엔드포인트로 내부 요청을 보낼 때, **POST body가 수신 측에서 파싱되지 않는 문제**를 해결 중. 음악 믹싱(Intensity-based LUFS Matching) 파이프라인은 완료되었으며 현재는 업로드 연동에 집중하고 있음.

## 2. 완료된 작업

### 2.1 지능형 LUFS 기반 오디오 믹싱 전략 - [완료]
- Intensity-based LUFS Matching 구현 완료 (`Target Music LUFS = Voice LUFS - Offset`)
- AI가 스크립트 텍스트 분석으로 `script_intensity(1~10)`를 반환
- `mixingGainDb` 기반 dB 단위 정밀 믹싱 연동 완료 (Replicate `ffmpeg-audio-modifier`)

### 2.2 오토파일럿 업로드 파이프라인 구조 - [완료]
- `trigger/autopilot-upload-orchestrator.ts`: 스토리지 영상 존재 확인 후 플랫폼별 업로드 트리거
- `app/callback/youtube/route.ts`, `app/callback/tiktok/route.ts`: OAuth 콜백 및 토큰 저장/갱신 로직
- `app/api/video/export/youtube/upload/route.ts`, `app/api/video/export/tiktok/upload/route.ts`: 토큰 조회/갱신 → Storage 다운로드 → 멀티파트/청크 업로드 로직

## 3. 현재 진행 중인 문제 (BLOCKER)

### 3.1 `internalFireAndForgetFetch` POST body 파싱 실패
- **증상**: `autopilot-upload-orchestrator`에서 `{ userId: autopilotData.user_id }`를 body에 실어 `POST` 요청을 보내면, 수신 측(`upload/route.ts`)의 `await request.json()`에서 `SyntaxError: Unexpected end of JSON input` 발생
- **원인**: Next.js의 서버 내 self-fetch 요청에서 body stream이 제대로 전달되지 않는 것으로 추정 (로컬 `next dev` + `waitUntil` 환경)
- **영향**: YouTube, TikTok 업로드 엔드포인트 모두 userId를 수신하지 못해 500 에러 발생. 수동(callback)도 동일한 함수(`internalFireAndForgetFetch`)를 사용하므로 동일 증상
- **해결 방안 고려 중**:
  1. userId를 query parameter로 이동 (즉시 땜질 가능)
  2. 업로드 핵심 로직을 별도 service/util 함수로 분리하고 Orchestrator/Route Handler가 직접 import 호출 (근본적 해결)

## 4. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **POST body 파싱 문제 해결**: `userId` 전달 방식 변경 (body → query param 또는 로직 직접 호출)
2. **수동 업로드 플로우 재점검**: callback → upload 흐름이 정상 작동하는지 확인
3. **오토파일럿 End-to-End 테스트**: generation → 영상 생성 완료 → upload orchestrator 트리거 → 실제 YouTube/TikTok 업로드까지 전 과정 검증
4. **`current_generating_task_id` 리셋 안전성 확인**: 업로드 성공/실패 후 `null`로 리셋하여 중복 업로드 방지
