2026-05-18 23:45

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

### 2.3 AI 모델 선택 구조 개편: 1단계 (DB 동기화 전략 수정) - [진행 중]
- **데이터 스키마**: `ai_models` 테이블 용 `AIModelData` 인터페이스 정의 완료.
- **스케줄러 연동**: Trigger.dev 용 `fal-ai-model-update-scheduler` 태스크 구조화 완료.
- **동기화 API**: 기존 OpenAPI 덤프 파싱 방식에서 **Playground HTML 구조 기반의 정밀 타격(Scraping) + LLM 추출 하이브리드 방식**으로 전략 완전 전면 수정.
  - **이유:** fal.ai의 모델마다 OpenAPI 구조가 파편화되어 있고, 가격 산정 문구도 모두 다름.
  - **새로운 전략 (Cheerio 활용):**
    1. HTML의 `<h3>Input</h3>`과 `<h3>Result</h3>` 태그를 앵커로 삼아, Playground UI의 해당 카드 섹션(`.border-stroke-strong`) DOM만 통째로 격리.
    2. 격리된 **Input 섹션**에서 `.form-control` 내부의 `<label>` 및 선택 가능한 옵션(Hint) 텍스트를 구조적으로 추출.
    3. 격리된 **Result 섹션**에서 안내용 `<p>` 태그만 추출하여, 특정 키워드에 의존하지 않고도 깔끔한 가격 문장을 획득.
  - **Kling 4K 모델 특이사항 발견:** Kling V3-Omni 4K(`o3/4k`) 엔드포인트는 해상도(Resolution)나 종횡비 파라미터를 노출하지 않음. 이는 1080p 업스케일링이 아닌 **Native 4K (3840x2160) 단일 생성** 파이프라인이며, Input 이미지의 종횡비를 자동으로 상속받도록 설계되었기 때문임. (최상위 스펙 충족 확인)

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
*참고: 모델 선택 및 과금 관련 상세 스펙은 `@add-model-selection-plan.md` 파일을 참조할 것.*

1. **AI 모델 DB 동기화 파이프라인 완성 (초기 데이터 구축)**:
   - 확정된 Playground HTML 추출 전략을 `@app/api/admin/ai-model/route.ts`의 메인 로직에 적용.
   - 추출된 요약본(Input 파라미터 리스트 + Result 가격 문단)을 활용하여 LLM 프롬프트를 간소화하고, 정확한 초당 가격을 산출하는 로직 구현.
2. **AI 모델 선택 UI 및 DB 연동 (Phase 2)**: 
   - `video_generation_tasks`에 `selected_model_id` 추가.
   - `/workspace/create`에 `ModelSelectionPanel` 컴포넌트 추가 및 상태 연동 로직 구현.
3. **크레딧 및 과금 구조 개편 (Phase 3)**:
   - Polar.sh 크레딧 상품 셋업 및 자동 충전 로직(Auto Top-up) 백엔드/UI 구현.
4. **오토파일럿 연동 및 E2E 테스트**:
   - 오토파일럿 자동 생성 -> 자동 업로드 (공개 범위, 계정 정보 포함) E2E 테스트.
   - 플랫폼 연결 해제 로직 구현.
