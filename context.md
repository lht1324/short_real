2026-05-23 17:30

# 프로젝트 컨텍스트: 오토파일럿 고도화 및 유연한 모델 선택/과금 구조 전환

## 1. 개요
오토파일럿 플랫폼 관리 시스템 업그레이드가 완료되었으며, 현재 고정 모델 구독 서비스에서 **크레딧 기반 유연한 모델 선택 서비스**로의 전환 작업을 진행 중. 최근 작업으로 AI 모델 적합성 판단의 정확도를 비약적으로 높이는 파이프라인 리팩토링을 완료함.

## 2. 완료된 작업

### 2.1 오토파일럿 플랫폼 관리 업그레이드 - [완료]
- **데이터 모델**: `UserYoutubeToken`, `UserTikTokToken`, `AutopilotData` 타입 업데이트 및 DB 컬럼 대응 완료.
- **OAuth 콜백**: YouTube(핸들, 이름) 및 TikTok(이름) 정보 자동 수집 로직 구현 완료. (틱톡은 리스크 최소화를 위해 `user.info.profile` 스코프 제외)
- **API 확장**: `platform-connection` API가 계정 정보를 반환하도록 고도화.
- **UI 개편**: `PlatformAccountCard` 신규 구현 및 `AutopilotControlPanel` 리팩토링 완료. 
- **설정 통합**: `ExportSettingsModal`을 연동하여 시리즈별 공개 범위 설정 기능 추가.

### 2.2 업로드 파이프라인 이슈 해결 - [완료]
- `internalFireAndForgetFetch` 바디 유실 이슈를 `videoGenerationTask`의 `user_id`를 직접 활용하는 방식으로 우회하여 해결 완료.

### 2.3 AI 모델 선택 구조 개편: 1단계 (DB 동기화 전략 및 스크래핑 구조 고도화) - [완료]
- **데이터 스키마 통일**: `AIModelPrice` 구조(`unit`, `price_per_unit`)를 도입하여 비디오와 이미지의 과금 단위를 하나의 테이블 필드(`ai_model_price_list`)로 통합.
- **비용 투명성 강화 (이미지 해상도별 과금 분리)**:
  - `AIModelPriceUnit`에 `IMAGE_720P`, `IMAGE_1080P` 추가.
  - UI에 투명한 비용 표기를 제공하기 위해, 이미지 모델도 비디오처럼 720p(약 0.9MP)와 1080p(약 2.07MP) 기준의 가격을 각각 계산하여 분리 저장하도록 로직 고도화.
- **스크래핑 엔드포인트 및 LLM 프롬프트 분할/고도화**:
  - 비디오(`video/route.ts`, `POST_VIDEO_PRICE_ANALYSIS_PROMPT.ts`)와 이미지(`image/route.ts`, `POST_IMAGE_PRICE_ANALYSIS_PROMPT.ts`) 분리.
  - 이미지 스크래핑 시 `input_parameters`를 LLM에 제공하여 `16:9` 및 `9:16` 비율 지원 여부와 해상도를 엄격히 검증하는 로직 추가 (I2I 모델의 Native Processing 특성 반영).
- **이미지(T2I/I2I) 스크래핑 최적화 및 버그 픽스**:
  - `display_name`을 기준으로 T2I와 I2I를 동시 지원하는 듀얼 모델 필터링 로직 구현.
  - **Worst-case Pricing 적용**: I2I 엔드포인트(ControlNet 등 추가 비용 포함)만 LLM으로 분석한 뒤, 결과물(가격)을 T2I 모델에도 덮어씌워 매핑하는 방식(UX 단순화 및 마진 확보) 구현 완료.
  - 비디오/이미지 라우트에서 발생하던 과거 스키마 잔재(`priceByResolutionList` 등) 매핑 버그 수정 완료.

### 2.4 AI 모델 메타데이터 추출 고도화 (Raw Schema Injection) 및 버그 픽스 - [완료]
- **문제 해결**: 추출 로직이 `name`, `type`, `description`만 필터링하여 전달함에 따라, LLM이 `enum`(ex. 비디오 지원 초수), `minimum/maximum` 제약 조건을 확인하지 못해 Kling o3/v3나 GPT 같은 훌륭한 모델들을 오작동으로 탈락시키는 문제(False Negative) 발견 및 해결.
- **Raw Schema Injection 적용**: `image/route.ts`와 `video/route.ts`의 스키마 추출 로직을 전면 수정하여, OpenAPI의 `schemaObj.properties` 객체 자체를 필터링 없이 그대로 `JSON.stringify(..., null, 2)` (들여쓰기 적용)하여 LLM에 주입하도록 변경 (`schemaPropertiesString`). LLM의 계층 구조 파싱 정확도 극대화.
- **비디오 파이프라인 에러 수정**: `llmServerAPI.ts`에서 구형 파라미터(`inputDataList`)를 참조하여 TypeError가 발생하고 전체 비디오 모델이 `is_valuable: false`로 폴백되던 치명적 버그 수정 완료.
- **원본 데이터 CSV 추출**: LLM의 수학적 오류/환각에 대비하여, DB 적재 전 원본 메타데이터를 `csv` 형태로 추출하는 방어 로직 추가. (DB 저장은 조기 리턴으로 임시 차단 상태)

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
*참고: 모델 선택 및 과금 관련 상세 스펙은 `@add-model-selection-plan.md` 파일을 참조할 것.*

1. **AI 모델 가격 수동 매핑 및 DB 업로드 스크립트 구현 (신규)**:
   - **목적:** LLM의 토큰 계산/수학적 환각을 배제하고, 정리된 CSV 모델 리스트에 가격을 빠르게 입력하여 DB에 확실하게 동기화.
   - **사용 파일 및 방식:**
     - `processed_model_list_[image/video].csv`: 갤러리/LoRA 등 불필요한 모델을 걷어낸 클린 마스터 모델 리스트.
     - `prices_[image/video].txt`: CSV의 줄 번호(Row)에 1:1로 매핑되는 가격 입력 텍스트 파일. (입력 포맷 예: `0.05/0.08` -> 720p/1080p 가격. 제외할 모델은 `-` 입력)
   - **작업 내용:** Node.js 스크립트 또는 임시 API를 작성하여 `txt` 파일을 줄 단위로 읽고 `/`를 기준으로 파싱. 해당 값을 CSV 데이터의 `ai_model_price_list` JSON 포맷으로 변환하고 `is_valuable`을 자동 설정한 뒤 Supabase `ai_model_data` 테이블에 일괄 업서트(Upsert)하는 로직 개발.

2. **AI 모델 오토파일럿/수동 분리 아키텍처 개편 (모델 2-Track 전략)**:
   - **DB 스키마 추가:** `ai_model_data`에 `is_autopilot_eligible` (boolean) 컬럼 추가. (1초 단위 제어가 가능한 Seedance, PixVerse 등만 True)
   - **오토파일럿 로직:** `Math.round(duration)`을 사용하여 1초 단위로 안전하게 API 전송 (배속 왜곡/비용 낭비 방지).
   - **장면(Scene) 스튜디오 (수동):** Kling(5, 10초)이나 Veo(4, 6, 8초) 등 제약은 있지만 퀄리티가 높은 모델들은 대본 길이에 얽매이지 않고 유저가 직접 길이를 선택하여 단일 B롤을 생성할 수 있도록 매뉴얼 파이프라인 구축.

3. **AI 모델 선택 UI 및 DB 연동 (Phase 2)**: 
   - `video_generation_tasks`에 `selected_model_id` 추가.
   - `/workspace/create`에 `ModelSelectionPanel` 컴포넌트 추가 및 상태 연동 로직 구현 (720p/1080p 해상도별 비용 Preview 포함).

4. **크레딧 및 과금 구조 개편 (Phase 3)**:
   - Polar.sh 크레딧 상품 셋업 및 자동 충전 로직(Auto Top-up) 백엔드/UI 구현.

5. **오토파일럿 연동 및 E2E 테스트**:
   - 오토파일럿 자동 생성 -> 자동 업로드 (공개 범위, 계정 정보 포함) E2E 테스트.
   - 플랫폼 연결 해제 로직 구현.