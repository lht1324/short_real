2026-05-09 18:45

# 프로젝트 컨텍스트: 오토파일럿 자동 업로드 파이프라인 고도화

## 1. 개요
오토파일럿 플랫폼 관리 시스템 업그레이드 완료. 계정 정보 수집 및 UI 개선을 통해 사용자 경험을 고도화함.

## 2. 완료된 작업

### 2.1 오토파일럿 플랫폼 관리 업그레이드 - [완료]
- **데이터 모델**: `UserYoutubeToken`, `UserTikTokToken`, `AutopilotData` 타입 업데이트 및 DB 컬럼 대응 완료.
- **OAuth 콜백**: YouTube(핸들, 이름) 및 TikTok(이름) 정보 자동 수집 로직 구현 완료. (틱톡은 리스크 최소화를 위해 `user.info.profile` 스코프 제외)
- **API 확장**: `platform-connection` API가 계정 정보를 반환하도록 고도화.
- **UI 개편**: `PlatformAccountCard` 신규 구현 및 `AutopilotControlPanel` 리팩토링 완료. 
- **설정 통합**: `ExportSettingsModal`을 연동하여 시리즈별 공개 범위 설정 기능 추가.

### 2.2 업로드 파이프라인 이슈 해결 - [완료]
- `internalFireAndForgetFetch` 바디 유실 이슈를 `videoGenerationTask`의 `user_id`를 직접 활용하는 방식으로 우회하여 해결 완료.

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **연동 테스트**: 실제 YouTube/TikTok 계정 연동 후 UI에 핸들/이름이 정상 표시되는지 확인.
2. **공개 범위 저장 테스트**: 설정 모달에서 변경한 공개 범위가 DB에 정상 저장되고 새로고침 후에도 유지되는지 확인.
3. **오토파일럿 End-to-End 테스트**: 자동 생성 -> 자동 업로드 전 과정 검증.
4. **연결 해제 로직 구현**: `PlatformAccountCard`의 X 버튼을 위한 실제 DELETE API 및 핸들러 구현.
