2026-05-28 04:15

# 프로젝트 컨텍스트: 오토파일럿 고도화 및 유연한 모델 선택/과금 구조 전환

## 1. 개요
오토파일럿 플랫폼 관리 시스템 업그레이드가 완료되었으며, 현재 고정 모델 구독 서비스에서 **크레딧 기반 유연한 모델 선택 서비스**로의 전환 작업을 진행 중. 최근 작업으로 AI 모델 적합성 판단의 정확도를 비약적으로 높이는 파이프라인 리팩토링 및 관리자용 데이터 조회 API 구축을 완료함.

## 2. 완료된 작업

### 2.1 오토파일럿 플랫폼 관리 업그레이드 - [완료]
- (기존 내용 유지)

### 2.2 업로드 파이프라인 이슈 해결 - [완료]
- (기존 내용 유지)

### 2.3 AI 모델 선택 구조 개편: 1단계 (데이터 정제 및 관리 API 구축) - [완료]
- **데이터 무결성 검증**: 수동 정제된 45개 모델의 엔드포인트, 해상도별 가격, 비디오 지원 기간 데이터가 `initial_ai_model_list.csv`에 정확히 매핑되었음을 전수 조사로 확인 완료.
- **관리자 전용 GET API 구현**: `app/api/ai-model-data/route.ts`에 GET 핸들러 추가. DB의 모든 모델 데이터를 `display_name` 및 `category` 순으로 정렬하여 클라이언트가 사용하기 편한 구조로 반환하도록 구현.
- **클라이언트 API 모듈 구축**: `lib/api/client/aiModelDataClient.ts`를 신규 생성하여 프론트엔드에서 모델 데이터를 간편하게 호출할 수 있는 인터페이스 마련.

### 2.4 AI 모델 메타데이터 추출 고도화 (Raw Schema Injection) - [완료]
- (기존 내용 유지)

### 2.5 AI 모델 수동 데이터 정제 및 DB Import 파일 생성 완료 - [완료]
- (기존 내용 유지)

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
*참고: 모델 선택 및 과금 관련 상세 스펙은 `@add-model-selection-plan.md` 파일을 참조할 것.*

1. **랜딩 페이지 비용 계산기(Cost Calculator) 구현**:
   - 사용자가 모델과 해상도를 선택하면 예상 비용을 실시간으로 계산해주는 섹션 추가.
   - `aiModelDataClient`를 연동하여 실제 DB의 최신 가격 데이터를 반영.

2. **AI Model DB Import 및 연동**:
   - 생성된 `initial_ai_model_list.csv` 파일을 Supabase 대시보드에서 `ai_model_data` 테이블에 직접 Import.

3. **AI 모델 오토파일럿/수동 분리 아키텍처 개편 (모델 2-Track 전략)**:
   - **DB 스키마 추가:** `ai_model_data`에 `is_autopilot_eligible` (boolean) 컬럼 추가.
   - **장면(Scene) 스튜디오 (수동):** 제약은 있지만 퀄리티가 높은 모델들을 위한 매뉴얼 파이프라인 구축.

4. **AI 모델 선택 UI 및 DB 연동 (Phase 2)**: 
   - `video_generation_tasks`에 `selected_model_id` 추가 및 `/workspace/create` 화면 연동.

5. **크레딧 및 과금 구조 개편 (Phase 3)**:
   - Polar.sh 크레딧 상품 셋업 및 자동 충전 로직(Auto Top-up) 구현.
