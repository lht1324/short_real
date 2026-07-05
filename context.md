# 작업 진행 상황 (Last Updated: 2026-07-06 02:32)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **수동/자동 OAuth 및 업로드 플로우 리팩토링 & 버그 수정 완료**:
    - **다중 수동 계정 식별 아키텍처 도입**: 기존의 `series_id` 대신 토큰 고유의 PK인 `id` (`tokenId`)로 계정을 식별하도록 개편하여, 여러 개의 수동 계정을 정상적으로 개별 제어 가능하게 함.
    - **🚨 [치명적] 다중 계정 토큰 업데이트 오염 버그 해결**: 백그라운드 토큰 리프레시 갱신 시 업데이트 필터가 `.eq('user_id', userId)`로 잘못되어 타 계정의 토큰까지 동일값으로 덮어씌워 파괴하던 결함을 `.eq('id', tokenData.id)` 고유 물리 PK 기준으로 수정하여 완치.
    - **AES-256-GCM 암호화 및 AAD 교차 바인딩 보안 가드 적용**: 브라우저와 리다이렉트 과정에서 DB 물리 UUID 노출을 100% 차단하기 위해 `cryptoUtils`를 도입, 계정 목록 조회 시 토큰 ID를 암호화하여 FE에 내리고, 백엔드 진입 시 `user_id`를 bindMarker로 묶어 복호화하여 타인의 임의 변조 시도를 원천 차단함.
    - **API 널 가드(Null Guard) 탑재**: 쿼리 파라미터가 브라우저나 직렬화 과정에서 `"null"` 또는 `"undefined"` 문자열로 바뀔 때 발생하던 DB UUID 캐스팅 에러를 실제 `null`로 보정하는 가드 함수 적용.
    - **마스킹 API의 Client-Gateway S2S 정형화**: 우회 호출 중이던 `/api/user/[userId]/social-channels` API를 `baseFetch`의 `getFetch`로 통일하고 백엔드에 `getIsValidRequestS2S` 가드를 얹어 보안 표준 아키텍처로 정렬.
    - **TypeScript 린트 에러(maybeSingle 타입 컴파일 에러) 해결**: `.maybeSingle()`의 반환 타입을 추론하게 처리하여 `TS2322` 빌드 크래시를 전면 해결.
* **대시보드 수동 내보내기 시 업로드할 소셜 계정 선택 기능 구현 완료 (이전 완료)**:
    - 보안 마스킹 API 신설, 수동 OAuth 시작 API 분기 보완, OAuth 콜백 API 리다이렉트 보완, 내보내기 설정 모달 UI 연동 등.
* **BYOK 및 부가 기능 연동 (이전 완료)**:
    - BYOK 전환 완료를 위한 Credit 시스템 전면 제거 완료, 실제 비디오 생성 로직에 유저 API Key 탑재 완료.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[진행 예정] 랜딩 페이지 하단 Pricing, FAQ 섹션 디자인 개편**:
    - 현재 랜딩페이지 하단 섹션 중 Pricing 및 FAQ 영역의 디자인 개편 작업 대기 중.
2. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) 기능 추가**:
    - 오토파일럿 시리즈에 즉시 매핑하지 않더라도, 사용자가 소유한 여러 소셜 플랫폼 계정을 마이페이지(ProfilePage)에서 미리 인증하여 하나의 계정 풀(Pool) 형태로 보관하고 관리하는 저장소 역할 개발 예정.
3. **[기획/장기] Replicate 모델 실연동 검토**:
    - Replicate 모델의 실 서비스 연동 및 기획 단계 진행 예정.
