2026-05-21 16:45

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

### 2.3 AI 모델 선택 구조 개편: 1단계 (DB 동기화 전략 및 스크래핑 구조 고도화) - [진행 중]
- **데이터 스키마 통일**: `AIModelPrice` 구조(`unit`, `price_per_unit`)를 도입하여 비디오(720p/1080p)와 이미지(image)의 과금 단위를 하나의 테이블 필드(`ai_model_price_list`)로 통합.
- **스크래핑 엔드포인트 분할 (Image vs Video)**:
  - 기존 비디오 중심의 스크래핑 로직을 분리하여 `@app/api/admin/ai-model/extraction/image/route.ts` (이미지용) 신규 구축.
  - LLM 프롬프트 또한 비디오(`POST_VIDEO_PRICE_ANALYSIS_PROMPT.ts`)와 이미지(`POST_IMAGE_PRICE_ANALYSIS_PROMPT.ts`)로 분리.
- **이미지(T2I/I2I) 스크래핑 최적화**:
  - `display_name`을 기준으로 T2I와 I2I를 동시 지원하는 모델(`dualSupportAIModelList`)만 필터링.
  - LLM 비용 및 복잡도 절감을 위해 파라미터 메타데이터를 제외한 가벼운 텍스트(`pricingText`, `category`)만 전송.
  - **Worst-case Pricing 적용**: I2I 엔드포인트만 LLM으로 분석한 뒤, 결과물(가격)을 T2I 모델에도 덮어씌워 매핑하는 방식(UX 단순화 및 마진 확보) 구현 완료.

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
*참고: 모델 선택 및 과금 관련 상세 스펙은 `@add-model-selection-plan.md` 파일을 참조할 것.*

1. **AI 모델 DB 동기화 파이프라인 E2E 테스트**:
   - 신규 분리된 이미지 스크래핑 엔드포인트(`extraction/image/route.ts`) 및 비디오 스크래핑 엔드포인트 로컬 구동 및 결과물(DB 적재) 검증.
2. **AI 모델 선택 UI 및 DB 연동 (Phase 2)**: 
   - `video_generation_tasks`에 `selected_model_id` 추가.
   - `/workspace/create`에 `ModelSelectionPanel` 컴포넌트 추가 및 상태 연동 로직 구현.
3. **크레딧 및 과금 구조 개편 (Phase 3)**:
   - Polar.sh 크레딧 상품 셋업 및 자동 충전 로직(Auto Top-up) 백엔드/UI 구현.
4. **오토파일럿 연동 및 E2E 테스트**:
   - 오토파일럿 자동 생성 -> 자동 업로드 (공개 범위, 계정 정보 포함) E2E 테스트.
   - 플랫폼 연결 해제 로직 구현.
