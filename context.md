2026-05-12 00:00

# 프로젝트 컨텍스트: 오토파일럿 고도화 및 유연한 모델 선택/과금 구조 전환

## 1. 개요
오토파일럿 플랫폼 관리 시스템 업그레이드가 완료되었으며, 현재 고정 모델 구독 서비스에서 **크레딧 기반 유연한 모델 선택 서비스**로의 전환 작업을 시작함.

## 2. 완료된 작업

### 2.1 오토파일럿 플랫폼 관리 업그레이드 - [완료]
- **데이터 모델**: `UserYoutubeToken`, `UserTikTokToken`, `AutopilotData` 타입 업데이트 및 DB 컬럼 대응 완료.
- **OAuth 콜백**: YouTube(핸들, 이름) 및 TikTok(이름) 정보 자동 수집 로직 구현 완료. (틱톡은 리스크 최소화를 위해 `user.info.profile` 스코프 제외)
- **API 확장**: `platform-connection` API가 계정 정보를 반환하도록 고도화.
- **UI 개편**: `PlatformAccountCard` 신규 구현 및 `AutopilotControlPanel` 리팩토링 완료. 
- **설정 통합**: `ExportSettingsModal`을 연동하여 시리즈별 공개 범위 설정 기능 추가.

### 2.2 업로드 파이프라인 이슈 해결 - [완료]
- `internalFireAndForgetFetch` 바디 유실 이슈를 `videoGenerationTask`의 `user_id`를 직접 활용하는 방식으로 우회하여 해결 완료.

### 2.3 AI 모델 선택 구조 개편: 1단계 (DB 동기화) - [완료]
- **데이터 스키마**: `ai_models` 테이블 용 `AIModelData` 인터페이스 정의 완료 (배속 처리를 위한 `supported_durations` 파라미터 최적화).
- **스케줄러 연동**: Trigger.dev 용 `fal-ai-model-update-scheduler` 태스크 구조화 완료 (대시보드에서 스케줄 등록 예정).
- **동기화 API**: `GET https://api.fal.ai/v1/models` API를 페이지네이션으로 호출하여 `image-to-video` 활성 모델을 파싱하고 DB에 일괄 업데이트(Bulk Upsert)하는 `/api/admin/ai-model/route.ts` 구현 완료.

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
*참고: 모델 선택 및 과금 관련 상세 스펙은 `@add-model-selection-plan.md` 파일을 참조할 것.*

1. **AI 모델 선택 UI 및 DB 연동 (Phase 2)**: 
   - `video_generation_tasks`에 `selected_model_id` 추가.
   - `/workspace/create`에 `ModelSelectionPanel` 컴포넌트 추가 및 상태 연동 로직 구현.
2. **크레딧 및 과금 구조 개편 (Phase 3)**:
   - Polar.sh 크레딧 상품 셋업 및 자동 충전 로직(Auto Top-up) 백엔드/UI 구현.
3. **오토파일럿 연동 및 E2E 테스트**:
   - 오토파일럿 자동 생성 -> 자동 업로드 (공개 범위, 계정 정보 포함) E2E 테스트.
   - 플랫폼 연결 해제 로직 구현.