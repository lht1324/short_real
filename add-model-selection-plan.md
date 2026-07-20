# AI 모델 선택 및 신규 과금 구조 구현 계획

본 문서는 고정 모델 구독 서비스에서 크레딧 기반 자동 충전 과금 시스템을 갖춘 유연한 모델 선택 서비스로 전환하기 위한 단계별 상세 구현 계획입니다.

## 1. fal.ai 모델 목록 스케줄러 (Trigger.dev)

**목표:** 48시간마다 fal.ai에서 사용 가능한 모델 목록을 자동으로 가져와 데이터베이스와 동기화합니다.

**구현 단계:**
1.  **데이터베이스 스키마 (Supabase)**
    UI 성능과 유연성을 최적화하기 위해 하이브리드 방식을 사용하는 `ai_models` 테이블을 신설합니다.
    *   **테이블 정의:**
        *   `endpoint_id` (text, PRIMARY KEY): 예) `fal-ai/kling-video/v3/pro/image-to-video`
        *   `provider` (text): 당분간 `fal-ai`로 고정
        *   `display_name` (text): UI 노출용 이름
        *   `category` (text): 예) `image-to-video`. (빠른 UI 필터링을 위해 인덱스 추가)
        *   `status` (text): 예) `active`
        *   `thumbnail_url` (text): UI 썸네일용 URL
        *   `raw_metadata` (jsonb): 미래의 확장성을 위해 API 응답의 `metadata` 객체 전체를 저장
        *   `created_at` (timestamptz): 기본값 now()
        *   `updated_at` (timestamptz): 수정 시 자동 업데이트

2.  **Trigger.dev Task 생성**
    *   **48시간 크론 스케줄**(`0 0 */2 * *`)로 실행되는 새로운 예약 작업(예: `sync-fal-ai-models.ts`)을 생성합니다.
    *   **로직:**
        1.  fal.ai REST API를 통해 모델 목록을 가져옵니다.
        2.  응답을 파싱하여 `ai_models` 테이블 스키마에 맞게 매핑합니다.
        3.  `endpoint_id`를 충돌 기준으로 사용하여 Supabase `ai_models` 테이블에 "Upsert" (존재하면 Update, 없으면 Insert)를 수행합니다.

## 2. 모델 선택 기능 (DB 및 UI)

**목표:** 사용자가 생성 과정에서 특정 AI 모델을 선택하고 이 선택을 데이터베이스에 저장할 수 있도록 합니다.

**구현 단계:**
1.  **데이터베이스 스키마 업데이트**
    *   `video_generation_tasks` 테이블에 새 컬럼 추가: `selected_model_id` (text, 초기에는 nullable, `ai_models(endpoint_id)`를 참조하는 Foreign Key).
    *   *(선택 사항)* 오토파일럿 기능도 모델 선택을 지원할 경우 `autopilot_data` 테이블에도 동일한 컬럼 추가.

2.  **UI 업데이트 (`/workspace/create`)**
    *   **데이터 패칭:** `ai_models` 테이블에서 활성화된(`active`) 모델들을 가져와 `category`(예: Image-to-Video, Text-to-Image)별로 그룹화합니다.
    *   **컴포넌트 생성:** (기존 `VoiceSelectionPanel`과 유사한) `ModelSelectionPanel` 컴포넌트를 만듭니다.
    *   **UI 요소:** `thumbnail_url`, `display_name` 및 `raw_metadata`에서 추출한 주요 태그를 보여주는 선택 가능한 카드 형태로 모델들을 표시합니다.
    *   **상태 관리:** `WorkspaceCreatePageClient`를 업데이트하여 `selectedModelId` 상태를 관리하고 이를 `CreateFormPanel` 및 `ResultPanel`로 전달합니다.
    *   **저장 로직:** `onClickSaveDraft` 및 비디오 생성 페이로드에 `selectedModelId`가 포함되도록 수정합니다.

## 3. 과금 구조 개편 (크레딧 및 자동 충전)

**목표:** 월간 구독제에서 자동 충전 메커니즘을 갖춘 "사용한 만큼 지불(pay-as-you-go)"하는 크레딧 시스템으로 전환합니다.

**구현 단계:**
1.  **Polar.sh 설정**
    *   Polar 대시보드에서 기존 월간/연간 구독 상품을 사용 중단(Deprecate) 처리합니다.
    *   크레딧 팩(예: 500 크레딧, 1000 크레딧)에 대한 새로운 "1회성 결제(One-time purchase)" 상품을 생성합니다.

2.  **자동 충전 로직 (백엔드)**
    *   **스키마 업데이트:** `users` 테이블에 필드 추가:
        *   `auto_top_up_enabled` (boolean, 기본값 false).
        *   `auto_top_up_threshold` (integer): 충전을 트리거하는 크레딧 잔액 기준.
        *   `auto_top_up_amount` (integer): 충전(구매)할 크레딧 양.
    *   **실행 로직:** 매 생성 후 사용자의 잔액을 확인하는 견고한 백엔드 서비스(또는 Trigger.dev Task) 생성. 만약 `credit_count`가 `auto_top_up_threshold` 미만으로 떨어지고 `auto_top_up_enabled`가 true일 경우:
        1.  저장된 결제 수단(Polar/Stripe 경유)을 불러옵니다.
        2.  `auto_top_up_amount`만큼 결제를 청구합니다.
        3.  성공적인 결제 웹훅 수신 시 사용자 잔액에 크레딧을 추가합니다.

3.  **결제 UI 업데이트**
    *   **Pricing 페이지 (`/landing`):** 구독 티어를 크레딧 팩 옵션으로 교체합니다.
    *   **Profile 페이지 (`/profile`):**
        *   "Change Plan" 및 "Cancel Subscription" 모달을 제거합니다.
        *   **"Auto Top-up Settings"**라는 새로운 섹션을 추가합니다.
        *   자동 충전을 켜고 끄는 토글 스위치를 포함합니다.
        *   기준치("잔액이 X 미만일 때")와 충전량("Y 크레딧 구매")을 설정하는 입력/드롭다운을 포함합니다.
    *   **모달:** "Insufficient Credits(크레딧 부족)" 모달을 업데이트하여 수동 충전을 유도하거나 자동 충전 활성화를 제안하도록 합니다.

## 4. 백엔드 모델 연동

**목표:** 백엔드 비디오 생성 파이프라인이 사용자가 명시적으로 선택한 모델을 사용하도록 보장합니다.

**구현 단계:**
1.  **생성 페이로드 업데이트**
    *   미디어 생성을 담당하는 Trigger.dev Task들(예: `orchestrate-image-generation.ts`, `post-image.ts`, `post-video.ts`)을 찾습니다.
    *   Task 시작 부분의 데이터베이스 조회 로직을 수정하여 `video_generation_tasks` 레코드에서 `selected_model_id`를 가져오도록 합니다.
2.  **fal.ai Client 업데이트**
    *   API 호출 로직(예: `FalAIClient.ts` 또는 `FalAIService.ts` 내부)을 업데이트합니다.
    *   하드코딩된 모델 엔드포인트(예: `fal-ai/luma-dream-machine`)를 동적으로 가져온 `selected_model_id`로 교체합니다.
    *   모델마다 요구하는 파라미터가 조금씩 다를 수 있으므로, 요청 페이로드 구조가 동적으로 선택된 모델의 요구사항과 일치하는지 확인합니다.