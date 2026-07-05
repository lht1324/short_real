# 작업 진행 상황 (Last Updated: 2026-07-06 03:13)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **1:N 공용 토큰 참조 구조(Account Pool 백엔드 코어) 개편 완료**:
    - **DB 스키마 마이그레이션**: 토큰 테이블에서 `series_id`를 완전히 제거하여 공용 풀화하고, 시리즈 테이블(`autopilot_data`)에 `youtube_token_id` 및 `tiktok_token_id` 외래키 컬럼을 신설하여 1:N 관계 성립. (기존 연동 관계 데이터 복원 완료)
    - **OAuth 콜백 라우터 개편**: 로그인 시 특정 시리즈 대신 유저 공용 토큰으로 중복 확인(이메일/오픈아이디 기준) 후 INSERT/UPDATE를 타며, 오토파일럿 모드일 시 획득된 공용 토큰 ID를 `autopilot_data` 컬럼에 업데이트하도록 맵핑 엔진 구축.
    - **스케줄러 자동 업로드 API 징검다리 조인 개편**: `video_generation_tasks`에 존재하는 `series_id`(태스크의 시리즈 소속 메타데이터)를 훼손하지 않고 그대로 보존하여 활용. `Task.series_id ➔ AutopilotData.token_id ➔ UserToken.refresh_token` 순으로 안전하게 토큰을 파싱하는 다중 시리즈 1:N 매핑 로직 탑재.
    - **연동 해제(DELETE) 로직 안전화**: 공용 토큰 원본이 삭제되지 않도록, 설정 해제 시 토큰 로우를 제거하는 대신 `autopilot_data`의 외래키 컬럼을 `null`로 업데이트하도록 변경하여 다른 시리즈의 연동을 원천적으로 보호.
    - **수동 OAuth 및 마스킹 API 간소화**: `series_id is null`을 필터링하던 레거시 쿼리 필터를 전면 걷어내고 공용 토큰 조회 스펙으로 정렬.
* **수동/자동 OAuth 및 업로드 플로우 리팩토링 & 버그 수정 완료 (이전 완료)**:
    - AES-256-GCM 암호화 가드, 널 가드(Null Guard), S2S 게이트웨이 정형화 및 컴파일 린트 경고 해결.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[진행 예정] 랜딩 페이지 하단 Pricing, FAQ 섹션 디자인 개편**:
    - 현재 랜딩페이지 하단 섹션 중 Pricing 및 FAQ 영역의 디자인 개편 작업 대기 중.
2. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) UI 화면 추가**:
    - 백엔드 코어 구조는 1:N 공용 풀로 다 전환되었으므로, 향후 사용자가 여러 소셜 계정을 직접 등록하고 조회할 수 있는 마이페이지(ProfilePage) 상의 "보관함 관리 인터페이스 UI" 개발 진행 예정.
3. **[기획/장기] Replicate 모델 실연동 검토**:
    - Replicate 모델의 실 서비스 연동 및 기획 단계 진행 예정.
