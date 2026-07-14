# 작업 진행 상황 (Last Updated: 2026-07-15 00:05)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **마케팅 분석 및 Perplexity AI 전용 제품 사양 명세서 작성 완료**:
    * [shortreal_product_brief.md](file:///home/jaeho/Projects/short_real/shortreal_product_brief.md) 파일을 생성하여 핵심 파이프라인(Trigger.dev), 특화 Niche 카테고리, 3개 구독 티어($19, $29, $49) 제한 정책 및 BYOK 요금제 구조 정리.
    * Perplexity 복사/붙여넣기용 핵심 마케팅 브레인스토밍 프롬프트 패키지 탑재 완료.
* **신규 이미지 모델 16종 원가 기반 SQL 적재 데이터 생성 완료**:
    * [new_model_list.json](file:///home/jaeho/Projects/short_real/new_model_list.json)을 분석하여, 메가픽셀(MP) 요율 모델들을 16:9 기준 화소(720p = 0.92MP, 1080p = 2.07MP) 및 최대 해상도 한도(2K)에 맞춰 환산 단가 도출 완료.
    * 단일 해상도 모델에 대해 720p와 1080p에 일괄로 동일 단가를 적용하도록 반영.
    * [new_image_model.sql](file:///home/jaeho/Projects/short_real/new_image_model.sql) 파일에 Supabase 적재용 16개 INSERT SQL 쿼리 작성 완료 (`supported_duration_range` 컬럼의 `numeric[]` 타입 미스매치 에러를 해결하기 위해 `ARRAY[]::numeric[]` 캐스팅 적용 완료).
* **신규 AI 모델 요금 및 해상도 정책 조사/분석 완료**:
    * `Grok Imagine 1.5`, `Luma Uni-1`, `Microsoft MAI-Image-2.5`, `Nano Banana Lite` 등의 해상도 스펙(Aspect Ratio만 넘기고 고정 화소 출력)과 메가픽셀 기반 요금 규격 분석 완료.
* **BYOK 모델 선택기 UI 경고 뱃지 및 커스텀 툴팁 구현 완료**:
    * [BYOKModelSelector.tsx](file:///home/jaeho/Projects/short_real/components/public/BYOKModelSelector.tsx)의 `selectedModel` 및 옵션 목록 렌더링 영역에 인풋 이미지 추가 과금 모델 감지 시 주황색 경고 뱃지(`AlertCircle`) 노출.
    * 마우스 오버 시 소수점 4자리 정밀 요율(예: `$0.0045/ref`)을 출력하는 커스텀 툴팁 팝업 구현.
    * `SCENE` 라벨 옆에도 대칭으로 `ⓘ` 아이콘을 배치하여, 인물이 없을 경우 배경 전용 모드로 요금이 자동 인하된다는 혜택 위주의 세련된 안내 문구 적용 완료.
* **가변 인풋 이미지 과금용 유닛 설계 및 연동 완료**:
    * [AIModelData.ts](file:///home/jaeho/Projects/short_real/lib/api/types/supabase/AIModelData.ts) 및 [costCalculator.ts](file:///home/jaeho/Projects/short_real/lib/utils/costCalculator.ts)에 `input_image` (첫 장부터 과금)와 `input_image_above_1` (첫 장은 무료, 2장째 추가분부터 과금) 단위를 새롭게 설계하고 가격 산출기에 연동하여 특수 과금 모델을 완벽히 수용.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[검증] BYOKModelSelector 린트 및 UI 실기기 최종 테스트**:
    * 로컬 개발 환경에서 뱃지/툴팁 UI의 디자인 완성도와 린트 에러 여부를 사장에게 최종 컨펌 요청.
