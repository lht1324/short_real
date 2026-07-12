# 작업 진행 상황 (Last Updated: 2026-07-13 02:51)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **소셜 계정 보관함(Connected Accounts) UI 리팩토링 완료**:
    * [ProfilePageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/profile/ProfilePageClient.tsx)의 `Connected Accounts` 섹션을 하드코딩에서 `socialPlatforms` 데이터 배열 기반의 동적 렌더링 방식으로 변경.
    * 플랫폼이 2개(YouTube, TikTok)일 때는 가로 2열(`md:grid-cols-2`)을 유지하고, 인스타그램 등 플랫폼 추가 시 별도 CSS/마크업 수정 없이 자동으로 가로 3열(`lg:grid-cols-3`)로 확장 정렬되도록 반응형 그리드(`gridColsClass`) 적용.
    * 각 플랫폼 타이틀(`YouTube`, `TikTok`) 및 연동 추가 버튼의 텍스트(`Link channel`, `Link account`)를 콤팩트하게 다듬어 가로폭 압박에 대응함.
* **신규 image-to-video(I2V) AI 모델 삽입용 SQL 쿼리 설계 완료**:
    * [ai_model_data_rows.csv](file:///home/jaeho/Projects/short_real/ai_model_data_rows.csv) 파일의 스키마 및 JSONB/Array 포맷(Price List, Duration Range) 분석을 진행함.
    * xAI Grok, Gemini Omni Flash, Ltx 2.3, Cosmos 3 Super, Kling V3 Turbo, Happy Horse 1.1, Seedance 2.0 Mini 등 신규 I2V 모델 8종의 요금제 정보 및 해상도 사양을 매핑한 Supabase 데이터 적재용 Upsert SQL 스크립트를 작성함.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[검증] 소셜 계정 보관함 리팩토링 결과 UI 테스트**:
    * 로컬 개발 서버에서 리팩토링된 Connected Accounts 반응형 UI와 연동 해제 흐름의 린트 에러 여부 실기기 최종 검증.
2. **[DB/기획] i2i / t2i AI 모델 데이터 추가 적재 진행**:
    * 금일 진행한 I2V 모델에 이어, 나머지 Image-to-Image 및 Text-to-Image 모델군에 대해서도 단가 정보를 조사하고 테이블 데이터(SQL 및 CSV) 업데이트 작업 진행 예정.
3. **[기획/장기] Replicate 모델 실연동 검토**:
    * Replicate 모델의 실제 서비스 연동 및 기획 단계 진행 예정.
