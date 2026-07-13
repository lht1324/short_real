# 작업 진행 상황 (Last Updated: 2026-07-14 02:40)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **신규 AI 모델 요금 및 해상도 정책 조사/분석 완료**:
    * `Grok Imagine 1.5`, `Luma Uni-1`, `Microsoft MAI-Image-2.5`, `Nano Banana Lite` 등의 해상도 스펙(Aspect Ratio만 넘기고 고정 화소 출력)과 메가픽셀 기반 요금 규격 분석 완료.
* **BYOK 모델 선택기 UI 경고 뱃지 및 커스텀 툴팁 구현 완료**:
    * [BYOKModelSelector.tsx](file:///home/jaeho/Projects/short_real/components/public/BYOKModelSelector.tsx)의 `selectedModel` 및 옵션 목록 렌더링 영역에 인풋 이미지 추가 과금 모델 감지 시 주황색 경고 뱃지(`AlertCircle`) 노출.
    * 마우스 오버 시 소수점 4자리 정밀 요율(예: `$0.0045/ref`)을 출력하는 커스텀 툴팁 팝업 구현.
    * `SCENE` 라벨 옆에도 대칭으로 `ⓘ` 아이콘을 배치하여, 인물이 없을 경우 배경 전용 모드로 요금이 자동 인하된다는 혜택 위주의 세련된 안내 문구 적용 완료.
* **가변 인풋 이미지 과금용 유닛 설계 및 연동 완료**:
    * [AIModelData.ts](file:///home/jaeho/Projects/short_real/lib/api/types/supabase/AIModelData.ts) 및 [costCalculator.ts](file:///home/jaeho/Projects/short_real/lib/utils/costCalculator.ts)에 `input_image` (첫 장부터 과금)와 `input_image_above_1` (첫 장은 무료, 2장째 추가분부터 과금) 단위를 새롭게 설계하고 가격 산출기에 연동하여 특수 과금 모델을 완벽히 수용.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[DB/기획] 신규 모델 리스트 분석 및 DB 적재 데이터 생성**:
    * [new_model_list.json](file:///home/jaeho/Projects/short_real/new_model_list.json) 파일에 수집된 신규 모델 데이터들을 확인하여, 가격 정책 문구를 읽고 정리한 뒤 Supabase DB 적재용 최종 삽입 데이터(CSV 또는 SQL) 생성.
2. **[검증] BYOKModelSelector 린트 및 UI 실기기 최종 테스트**:
    * 로컬 개발 환경에서 뱃지/툴팁 UI의 디자인 완성도와 린트 에러 여부를 사장에게 최종 컨펌 요청.
