# 작업 진행 상황 (Last Updated: 2026-07-04 03:30)

## 1. 최근 세션 작업 내용 (Current Session Changes)
### 1.1 Autopilot 다중 소셜 계정 연동 및 자동 업로드 분기 리팩토링 - [완료]
* **DB 스키마 마이그레이션**:
    - `user_youtube_tokens` 및 `user_tiktok_tokens` 테이블의 단일 PK(`user_id`)를 제거하고 전역 고유 `id` UUID PK를 설정.
    - `series_id` 컬럼에 Unique 제약 인덱스를 설정하여 1시리즈당 플랫폼별 최대 1개 계정 연동을 가능하게 함.
    - 수동 업로드 모드 호환을 위해 `series_id IS NULL` 부분 고유 인덱스를 구성하여 수동 토큰이 공존할 수 있게 스펙 개편.
* **OAuth 시작 API 수정**:
    - 유튜브 및 틱톡 Autopilot OAuth 시작 쿼리 조건에 `series_id`를 추가하여, 이미 다른 시리즈가 연동되어 있어도 가로채기 당하지 않고 새 시리즈 로그인 창이 뜨도록 수정.
* **OAuth 콜백 API 고도화**:
    - 토큰 저장(`upsert`) 시 `series_id`가 누락되던 문제를 해결하고, 부분 인덱스 충돌 예외를 피하기 위해 `SELECT ➔ UPDATE or INSERT` 구조로 쿼리 분기 처리.
    - 구글 로그인 범위에 민감하지 않은 범위 스코프(`userinfo.profile`, `userinfo.email`)를 추가 요청하도록 수정하여 구글 계정 이름, 이메일, 프로필 이미지 URL 수집 성공.
    - 틱톡 로그인 시에도 `avatar_url`을 함께 긁어오도록 수집 명세를 고도화하고 내부 에러 로그 감지 보강.
* **자동 업로드 엔진 분기 연동**:
    - 비디오 생성 태스크 완료 후 호출되는 유튜브/틱톡 업로드 API가 해당 태스크의 `series_id`에 할당된 1:1 토큰만을 쿼리하여 업로드하도록 수정.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[진행 예정] 대시보드 수동 내보내기 시 업로드할 소셜 계정 선택 기능 구현**:
    - **백엔드 설계 방향 (보안 강화)**: 브라우저가 민감한 소셜 토큰 테이블에 직접 접근(SELECT)하지 않도록 차단하고, 유저 ID에 묶인 연동 소셜 채널 정보(`display_name`, `handle_name`, `avatar_url`, `series_id`)를 마스킹하여 반환하는 **전용 API 엔드포인트**를 신설하여 보안 규칙 준수.
    - **UI 연동**: 대시보드 내보내기 모달에서 위 API 데이터를 호출해 업로드할 채널을 드롭다운으로 선택할 수 있도록 구현하고, 선택한 `series_id`를 쿼리 파라미터(`&targetSeriesId=...`)로 OAuth 시작 API에 전달.
    - **수동 OAuth 시작 API 보완**: 파라미터로 넘어온 `targetSeriesId` 값에 따라 `eq('series_id', targetSeriesId)` 또는 `is('series_id', null)` 조건으로 분기 조회하여 즉시 다이렉트 업로드 처리.
2. **[진행 예정] BYOK 전환 완료를 위한 Credit 시스템 전면 제거 및 안내/에러 핸들링 강화**:
    - `WorkspaceCreatePageClient.tsx` 및 `WorkspaceAutopilotPageClient.tsx` 등에서 `userCreditCount`, `expectedCreditUsage`, `isCreditInsufficient` 계산식과 헤더의 `Credits` 스탯 영역을 완전히 제거.
    - `Insufficient Credit Modal` 및 크레딧 부족 시 생성을 차단하는 클라이언트 사이드 validation 로직 걷어내기.
    - 사전 경고 가이드 UI 배치 및 사후 에러 핸들링 고도화.
3. **[진행 예정] 실제 비디오 생성 로직에 유저 API Key 탑재**:
    - 현재 시스템 환경변수에서 가져오는 API Key를, 생성 요청을 보낸 유저의 DB 프로필에서 꺼내 쓰도록 백엔드 생성 엔진 로직 수정 필요.
4. **[진행 예정] Editor 페이지 디자인 리팩토링**
5. **[검토 필요] Replicate 모델 실연동**
6. **[버그 수정] HeroSection 뮤트 버튼 작동 불량**
7. **랜딩 페이지 하단 섹션 (HowItWorks, Pricing, FAQ) 디자인 개편**
8. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) 기능 추가**:
    - **컨셉트**: 오토파일럿 시리즈에 즉시 매핑하지 않더라도, 사용자가 소유한 여러 소셜 플랫폼 계정을 마이페이지(ProfilePage)에서 미리 인증하여 하나의 계정 풀(Pool) 형태로 보관하고 관리하는 저장소 역할.
    - **DB 대응**: `series_id`가 아직 `NULL`인 상태에서도 `user_id`를 소유주로 지정하여 소셜 토큰을 안전하게 유지 및 관리할 수 있도록 설계.

