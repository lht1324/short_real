2026-05-30 05:58

# 프로젝트 컨텍스트: 오토파일럿 고도화 및 유연한 모델 선택/과금 구조 전환

## 1. 개요
오토파일럿 플랫폼 관리 시스템 업그레이드가 완료되었으며, 현재 고정 모델 구독 서비스에서 **크레딧 기반 유연한 모델 선택 서비스**로의 전환 작업을 진행 중. 최근 작업으로 AI 모델 적합성 판단의 정확도를 비약적으로 높이는 파이프라인 리팩토링, 관리자용 데이터 조회 API 구축 및 랜딩 페이지 내 투명한 과금 구조 안내(계산기) 구현을 완료함.

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

### 2.6 랜딩 페이지 비용 계산기(Cost Calculator) 및 BYOK 섹션 구현 - [완료]
- **인터랙티브 계산기 도입**: `CostStructureSection` 컴포넌트를 신규 개발하여 사용자가 모델(캐릭터/장면/영상) 및 파라미터(등장인물 수, 장면 수, 총 영상 길이)를 조작해 실시간 예상 비용(USD)을 확인할 수 있도록 함.
- **하네스 로직 적용**: t2i 모델을 등장인물 캐릭터 시트 생성 용도로 정의하고, `등장인물 수` 항목을 계산식에 반영.
- **마케팅 친화적 UI**: 기술적 용어(t2i, i2i, i2v) 배제 및 직관적 레이블('Character Generator Model', 'Total Video Duration' 등) 사용.
- **BYOK 안내**: API 원가로 플랫폼 수수료 없이 사용 가능하다는 메시지와 함께 지원 프로바이더 정보를 배치.

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
*참고: 모델 선택 및 과금 관련 상세 스펙은 `@add-model-selection-plan.md` 파일을 참조할 것.*

1. **AI Model DB Import 및 연동**:
   - 생성된 `initial_ai_model_list.csv` 파일을 Supabase 대시보드에서 `ai_model_data` 테이블에 직접 Import.

2. **AI 모델 오토파일럿/수동 분리 아키텍처 개편 (모델 2-Track 전략)**:
   - **DB 스키마 추가:** `ai_model_data`에 `is_autopilot_eligible` (boolean) 컬럼 추가.
   - **장면(Scene) 스튜디오 (수동):** 제약은 있지만 퀄리티가 높은 모델들을 위한 매뉴얼 파이프라인 구축.

3. **AI 모델 선택 UI 및 DB 연동 (Phase 2)**: 
   - `video_generation_tasks`에 `selected_model_id` 추가 및 `/workspace/create` 화면 연동.

4. **크레딧 및 과금 구조 개편 (Phase 3)**:
   - Polar.sh 크레딧 상품 셋업 및 자동 충전 로직(Auto Top-up) 구현.