# 작업 진행 상황 (Last Updated: 2026-07-05 01:10)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **대시보드 수동 내보내기 시 업로드할 소셜 계정 선택 기능 구현 완료**:
    - **보안 마스킹 API 신설**: 민감한 OAuth 토큰을 제외하고 연동된 계정의 메타데이터(`id`, `series_id`, `display_name`, `handle_name`, `avatar_url`)만 마스킹하여 반환하는 `/api/user/[userId]/social-channels` API 신설.
    - **수동 OAuth 시작 API 분기 보완**: `targetSeriesId` 파라미터 연동을 통해 토큰이 있으면 **즉시 다이렉트 업로드**를 수행하고, 없으면 OAuth 리다이렉션을 태우도록 유튜브/틱톡 둘 다 리팩토링.
    - **OAuth 콜백 API 리다이렉트 보완**: `state`로부터 `targetSeriesId`를 전달받아 소셜 토큰 테이블의 `series_id` 필드를 맵핑해 저장하고, 업로드 트리거 전 비디오 태스크(`videoGenerationTask`)의 `series_id` 또한 해당 시리즈로 패치되도록 리팩토링.
    - **내보내기 설정 모달 UI 연동**: `ExportSettingsModal`에서 플랫폼별 연동 채널 리스트를 동적으로 로드해 드롭다운으로 보여주고, "+ New Account"를 통한 신규 연동 및 플랫폼별 안내문(동의사항)을 렌더링하는 프리미엄 다크 테마 UI 완비.
* **BYOK 및 부가 기능 연동 (이전 완료 내용 정리)**:
    - BYOK 전환 완료를 위한 Credit 시스템 전면 제거 완료.
    - 실제 비디오 생성 로직에 유저 API Key 탑재 완료.
    - Editor 페이지 디자인 리팩토링 완료.
    - HeroSection 뮤트 버튼 작동 불량 버그 수정 완료.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[진행 예정] 랜딩 페이지 하단 Pricing, FAQ 섹션 디자인 개편**:
    - 현재 랜딩페이지 하단 섹션 중 Pricing 및 FAQ 영역의 디자인 개편 작업 대기 중.
2. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) 기능 추가**:
    - 오토파일럿 시리즈에 즉시 매핑하지 않더라도, 사용자가 소유한 여러 소셜 플랫폼 계정을 마이페이지(ProfilePage)에서 미리 인증하여 하나의 계정 풀(Pool) 형태로 보관하고 관리하는 저장소 역할 개발 예정.
3. **[기획/장기] Replicate 모델 실연동 검토**:
    - Replicate 모델의 실 서비스 연동 및 기획 단계 진행 예정.

## 3. 수동 및 오토파일럿 OAuth/업로드 플로우 점검 사항 (Last Updated: 2026-07-05 03:10)

### 3.1 4대 업로드/연동 플로우 개요
1. **수동 Export 시 신규 OAuth 연동 플로우**:
    - `ExportSettingsModal` ➔ `/manual/oauth` ➔ OAuth 로그인창 ➔ `/callback/[platform]` ➔ 토큰 저장 및 즉시 업로드 트리거
2. **수동 Export 시 기존 토큰 이용 즉시 업로드 플로우**:
    - `ExportSettingsModal` ➔ `/manual/oauth` (토큰 존재 확인) ➔ `/upload` API 백그라운드 트리거 ➔ 즉시 대시보드 리다이렉트
3. **오토파일럿 전용 OAuth 연동 플로우**:
    - `/workspace/autopilot` ➔ `/autopilot/oauth` ➔ OAuth 로그인창 ➔ `/callback/[platform]` ➔ 시리즈 연계 토큰 저장 ➔ 오토파일럿 설정화면 복귀
4. **오토파일럿 백그라운드 자동 업로드 플로우**:
    - `autopilotUploadOrchestrator` (Trigger.dev) ➔ `/upload` API 트리거 (태스크의 `series_id` 토큰 조회)

### 3.2 1번 플로우 점검/발견 사항 및 개선 방향
* **[설계적 결함] 계정(토큰) 매핑이 아닌 시리즈(`series_id`) 매핑 모순**:
    - 수동 업로드는 오토파일럿 시리즈 설정과 무관하므로, 영상 태스크(`videoGenerationTask`)의 `series_id`를 임의로 덮어씌워 토큰을 쿼리하는 현재 구조는 도메인 아키텍처 상 모순임.
    - 특히 수동 계정(`series_id IS NULL`)이 여러 개 존재할 때, 수동 태스크의 `series_id`를 단순히 `null`로 지정하게 되면 업로드 API가 여러 수동 계정 중 어떤 계정으로 전송해야 하는지 식별할 수 없는 논리적 오류가 발생함.
    - **개선안**: 수동 내보내기 모달 및 API 쿼리 파라미터 식별자를 `series_id`에서 **토큰 테이블의 고유 PK인 `id` (`tokenId`)**로 전환해야 함. 업로드 API(`upload/route.ts`)는 `tokenId` 파라미터가 들어올 경우 이를 최우선 조건(`eq('id', tokenId)`)으로 토큰을 가져오도록 쿼리 분기를 수정해야 함.
* **[런타임 에러 위험] 문자열 `"null"` 캐스팅으로 인한 PostgreSQL UUID 포맷 예외**:
    - 프론트엔드의 템플릿 리터럴 바인딩이나 JSON 직렬화/역직렬화 단계, 혹은 브라우저 쿼리 스트링 처리 도중 `null` 값이 문자열 `"null"`로 캐스팅되어 전송될 위험이 발견됨.
    - 이 상태로 DB 쿼리(Supabase insert/update)에 넘겨지면, `uuid` 타입인 `series_id` 또는 `id` 컬럼과 충돌하여 `invalid input syntax for type uuid` 오류와 함께 전체 트랜잭션이 중단됨.
    - **개선안**: 각 시작 및 콜백 API 진입부에 파라미터 값이 문자열 `"null"` 또는 `"undefined"`인 경우 이를 자바스크립트의 실제 `null`로 치환하는 방어적 **널 가드(Null Guard)** 처리를 필수 탑재해야 함.
* **[상세 코드 레벨 수정/제거 포인트]**:
    1. **YouTube 시작 API (`/app/api/video/export/youtube/manual/oauth/route.ts`)**:
        - `targetSeriesId` 변수 및 파싱을 `targetTokenId`로 교체.
        - 수동 업로드 시 영상 태스크의 `series_id`를 강제로 덮어쓰던 코드(라인 46~51)를 제거.
        - 토큰 SELECT 조회 조건(라인 54~63)을 `eq('id', targetTokenId)` 조건으로 수정.
        - 구글로 보낼 `state` JSON 조립부(라인 89~94)에 `targetTokenId`를 동봉하도록 변경.
    2. **TikTok 시작 API (`/app/api/video/export/tiktok/manual/oauth/route.ts`)**:
        - `targetSeriesId` 변수를 `targetTokenId`로 교체.
        - 태스크 `series_id` 임의 패치 코드(라인 36~41) 제거.
        - 토큰 조회 시 `targetTokenId` 기반 `eq('id', targetTokenId)` 조건 조회를 적용.
        - 틱톡으로 보낼 `state` 파라미터 내 식별자를 `targetTokenId`로 교체.
    3. **YouTube 콜백 API (`/app/callback/youtube/route.ts`)**:
        - `stateData` 파싱 시 `targetTokenId`로 수신.
        - 기존 토큰 여부 SELECT 쿼리(라인 125~137) 시 `targetTokenId`가 있으면 `eq('id', targetTokenId)` 조건 조회를 타도록 변경.
        - 토큰 저장(`tokenPayload`) 시 `series_id` 값을 수동 모드이면 `null`로 강제 고정하여 저장.
        - 대시보드로 돌아가기 전 태스크의 `series_id`를 강제 변경하던 코드(라인 189~194) 제거.
        - 백그라운드 업로드 트리거 주소 뒤에 `&tokenId=...`를 실어 호출하도록 수정.
    4. **TikTok 콜백 API (`/app/callback/tiktok/route.ts`)**:
        - `state`에서 `targetTokenId` 파싱.
        - 기존 레코드 조회 쿼리에서 `targetTokenId`가 있으면 `eq('id', targetTokenId)` 조회하도록 변경.
        - 토큰 저장 시 `series_id`를 `isAutopilot ? seriesId : null`로 고정하여 수동 독립성 보존.
        - 리다이렉트 전 태스크 `series_id` 강제 패치 로직(라인 188~193) 제거.
        - 업로드 API 호출 시 `&tokenId=...` 쿼리 파라미터 전달.


### 3.3 토큰 타입 정의 누락 점검 (UserYoutubeToken, UserTikTokToken)
* **공통 누락 필드**: 
    - `id: string;` (소셜 토큰 레코드 고유 UUID PK)
    - `series_id?: string | null;` (오토파일럿 시리즈 연동용 UUID FK)
* **현재 상태**: 데이터베이스 마이그레이션(단일 user_id PK 해제 및 1시리즈 다중 계정 인덱스 구성) 시점에 DB 상에는 해당 필드가 잘 추가되었으나, 프론트엔드/백엔드 빌드 시 참조하는 TypeScript Interface 파일에는 두 필드가 누락되어 방치됨.
* **개선안**: 점검 후 수동 및 자동 연동/업로드 리팩토링 진행 시점에 이 타입 선언부도 반드시 동기화(업데이트)해야 함.

### 3.4 2, 3, 4번 플로우 점검/발견 사항 및 개선 방향
* **2번 플로우 (수동 기존 토큰 즉시 업로드)**:
    - **발견 사항**: 기존 틱톡 manual/oauth API에는 토큰 체크 및 다이렉트 업로드 분기가 누락되어 매번 로그인을 다시 거쳐야 했고, 여러 수동 계정이 연동되어 있을 때 `series_id`만으로는 특정 계정을 식별하기 곤란했음.
    - **개선안**: 모달에서 넘겨받은 `targetTokenId`를 바탕으로 `eq('id', targetTokenId)` 조회를 수행해 유효 토큰 감지 시 즉시 백그라운드 업로드 API를 `&tokenId=...` 파라미터를 실어 호출함으로써 완벽하게 격리된 즉시 업로드를 실현함.
    - **[🚨 치명적 버그 감지 - 다중 계정 토큰 업데이트 오염]**:
        - YouTube 업로드 API(라인 153) 및 TikTok 업로드 API(라인 145, 277)에서 토큰 리프레시 갱신 또는 사용일(`last_used_at`) 업데이트 시, 업데이트 조건절을 `.eq('user_id', userId)`로만 필터링하고 있음.
        - 이는 다중 채널이 연동된 환경(전역 PK인 `id` UUID가 분리되어 들어간 상태)에서 1개 채널의 토큰이 갱신될 때, **해당 유저가 소유한 다른 모든 연동 채널의 토큰 데이터를 동일한 토큰 값으로 강제 덮어쓰기하여 파괴하는 치명적인 데이터 손상 오류**를 일으킴.
        - **조치 사항**: 토큰 업데이트 대상 필터를 유저 ID가 아닌, DB 조회 결과 획득한 고유 물리 PK인 **`.eq('id', tokenData.id)`**로 정확하게 한정하도록 강제 보완해야 함.
    - **[상세 코드 레벨 수정/제거 포인트]**:
        1. **YouTube 업로드 API (`/app/api/video/export/youtube/upload/route.ts`)**:
            - `tokenId` 쿼리 파라미터 수신 추가.
            - 토큰 로드 쿼리(라인 77~86) 시 `tokenId`가 들어오면 `eq('id', tokenId)`를 타도록 분기 얹기.
            - 토큰 업데이트 조건절(라인 153)을 `eq('id', tokenData.id)`로 수정 (오염 버그 방지).
        2. **TikTok 업로드 API (`/app/api/video/export/tiktok/upload/route.ts`)**:
            - `tokenId` 쿼리 파라미터 수신 추가.
            - 토큰 로드 쿼리(라인 60~69) 시 `tokenId`가 들어오면 `eq('id', tokenId)`를 타도록 분기 얹기.
            - 토큰 업데이트 조건절(라인 145, 277)을 `eq('id', tokenData.id)`로 수정 (오염 버그 방지).
* **3번 플로우 (오토파일럿 전용 OAuth 연동)**:
    - **발견 사항**: 해당 시리즈의 자동 업로드 전용 계정을 맵핑하는 특수 목적 플로우이므로, 수동과 달리 오토파일럿 시리즈와의 1:1 종속 관계가 핵심임.
    - **개선안**: 따라서 토큰 저장 시 기존대로 `series_id` 컬럼에 실제 `seriesId`를 기입하여 오토파일럿 설정과의 1:1 매칭 구조를 온전히 보존함 (기존 설계 정상 유지).
    - **[UX 디테일 편차 확인]**:
        - YouTube 오토파일럿 시작 API(라인 71~81)는 이미 토큰이 연동된 상태에서 재연결 시도로 진입했을 때, 현재 대기 중인 생성 완료 태스크가 있다면 백그라운드 업로드를 즉시 트리거함.
        - 반면 TikTok 오토파일럿 시작 API(라인 44~47)는 재연결 진입 시 단순히 오토파일럿 설정 페이지 리다이렉트만 수행하며 즉시 업로드 재개 로직이 없음. (Trigger.dev 스케줄러가 있으므로 동작 실패는 아님.)
    - **[상세 코드 레벨 수정/제거 포인트]**:
        - 수동 계정용 `targetTokenId` 기반의 리팩토링 개편을 진행하더라도, 3번 플로우는 오토파일럿 고유의 종속 맵핑 스펙이 보존되어야 하므로 기존 코드(`series_id` 바인딩)를 온전히 유지함.
* **4번 플로우 (오토파일럿 자동 업로드)**:
    - **발견 사항**: Trigger.dev 스케줄러 태스크는 업로드 API 호출 시 `tokenId` 파라미터를 제공하지 않음.
    - **개선안**: 업로드 API는 `tokenId` 파라미터가 없으면 2순위 조건인 `eq('series_id', videoGenerationTask.series_id)`로 조회하게 되므로, 오토파일럿 자동 업로드 파이프라인은 신규 개편 수동 흐름의 간섭을 받지 않고 온전하고 안전하게 작동하게 됨 (상호 호환성 충족).
    - **[🚨 연관 버그 감지 - 자동 업로드 시 토큰 업데이트 오염]**:
        - 4번 플로우 작동 중 토큰이 만료되어 리프레시 갱신이 일어날 때도, 유튜브/틱톡 업로드 API(`/upload/route.ts`) 내부의 기존 업데이트 조건절(`.eq('user_id', userId)`)로 인해 **오토파일럿 대상 계정뿐만 아니라 유저가 소유한 다른 모든 소셜 계정의 토큰이 동일값으로 덮어써져 망가지는 오염 버그가 똑같이 발생함.**
        - **조치 사항**: 2번 플로우와 동일하게 자동 업로드 시 갱신 쿼리 조건 역시 **`.eq('id', tokenData.id)`** 고유 물리 PK 기준으로 강제 적용해야 함.
    - **[상세 코드 레벨 수정/제거 포인트]**:
        - `trigger/autopilot-upload-orchestrator.ts` 파일의 백그라운드 트리거 호출 로직(라인 65, 74)은 `tokenId` 파라미터 없이 요청을 전달하므로 별도 수정 없이 유지함.
        - 업로드 API(`/upload/route.ts`) 내부에서 `tokenId`가 없고 `series_id`가 지정되어 있을 때 작동하는 `eq('series_id', videoGenerationTask.series_id)` 조건부 빌드 분기 적용.
        - 업로드 API 내부 토큰 갱신 및 사용일 업데이트 구문(YouTube 라인 153, TikTok 라인 145/277) 필터를 반드시 `.eq('id', tokenData.id)`로 수정하여 오토파일럿 실행 중 타 계정 오염을 완벽히 방지함.

