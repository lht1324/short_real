# 작업 진행 상황 (Last Updated: 2026-07-11 17:10)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **Pricing 신규 요금제 도입에 따른 생성 및 활성화 제한 연동 완료**:
    * **한도 계산 유틸 함수 추가**: `lib/utils/subscriptionUtils.ts`를 신규 생성하여 유저의 `SubscriptionPlan`별로 생성/활성화 가능한 오토파일럿 시리즈 한도(`Indie` = 1, `Studio` = 2, `Agency` = 무제한, `none` = 0)를 반환하는 공통 함수 구현.
    * **서버 측 생성 제한 API 검증 추가**: `/app/api/autopilot-data/route.ts`의 POST 핸들러에서 사용자의 플랜 한도와 기존 생성된 개수를 비교하여 초과 시 `403 Forbidden` 에러를 반환하는 최종 보안 방어선 구축.
    * **클라이언트 측 생성 제한 및 업그레이드 모달 연결**: `WorkspaceAutopilotPageClient.tsx`에서 신규 시리즈 추가 클릭 시 플랜 한도 검증 로직을 탑재하고, 초과 시 마이페이지(`Upgrade Plan`)로 이동할 수 있는 `DefaultModal` 연결.
    * **동시 활성화 제한 및 토글 차단**:
        * 사용자가 `is_active: true` 토글 스위치를 켤 때, 이미 켜져 있는 활성 시리즈 수가 요금제 한도에 도달했다면 스위치를 차단하고 "Active Limit Reached" 모달을 띄움.
    * **다운그레이드 유저 자동 비활성화 보정**: 
        * 페이지 초기 로딩 시, 다운그레이드로 인해 활성 시리즈 개수가 현재 요금제 한도보다 많다면 한도를 초과하는 하위 시리즈들을 자동으로 비활성화(`is_active: false`)하여 DB에 패치하고 로컬 상태를 정비함.
        * 대시보드 최상단에 다운그레이드 상태를 경고하고 업그레이드를 제안하는 "Plan Exceeded Warning Banner" 상시 노출 처리.
    * **헤더 휴지통(삭제) 버튼 추가**: 헤더 드롭다운 및 추가 버튼 영역 옆에 휴지통(`Trash2`) 아이콘 버튼을 바로 추가하여 현재 활성 시리즈를 원클릭으로 손쉽게 삭제할 수 있도록 개선.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) UI 화면 추가**:
    * 백엔드 코어 구조는 1:N 공용 풀로 다 전환되었으므로, 마이페이지(ProfilePage) 상의 "보관함 관리 인터페이스 UI" 개발 진행 예정.
2. **[기획/장기] Replicate 모델 실연동 검토**:
    * Replicate 모델의 실 서비스 연동 및 기획 단계 진행 예정.
