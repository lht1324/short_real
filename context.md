# 작업 진행 상황 (Last Updated: 2026-07-07 21:35)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **오토파일럿 및 채널 연동 설정 모달 컴포넌트 린트 에러 및 무한 로딩 버그 수정 완료**:
    - **`ExportSettingsModal` 무한 API 요청 버그 해결**: 부모 컴포넌트에서 프롭으로 전달되는 익명 핸들러 및 선택값 변경으로 인해 모달 내 채널 목록 API(`fetchChannels`)가 무한 반복 호출(화면 깜빡임)되는 문제를 `useRef`를 이용해 격리함으로써 해결.
    - **누락된 프롭 보완**: `AutopilotControlPanel.tsx`에서 `ExportSettingsModal`을 렌더링할 때 타입 스펙상 필수적인 `userId`, `selectedTokenId`, `onChangeSelectedTokenId` 및 `aspectRatio` 프롭이 빠져있던 것을 정상 연동 처리함.
    - **`AutopilotControlPanel.tsx` 내 핸들러 최적화**: 자식 컴포넌트로 전달되거나 상태를 갱신하는 모든 내부 핸들러들(`onToggleDay`, `onChangeHour`, `onChangeMinute`, `onChangeTimezone` 등)을 `useCallback`으로 감싸 불필요한 렌더링 오버헤드와 레퍼런스 변경을 원천 차단함.
* **오토파일럿 설정 저장 PATCH API UUID 타입 에러 수정 완료**:
    - **PATCH 라우터 복호화 가드 구축**: 클라이언트가 암호화된 토큰 ID(`iv:authTag:encryptedText`)를 전송했을 때, 백엔드 PATCH API([route.ts](file:///home/jaeho/Projects/short_real/app/api/autopilot-data/series/%5BseriesId%5D/route.ts)) 단에서 이를 `cryptoUtils.decrypt`로 복호화한 후 Supabase UUID 컬럼에 저장하도록 패치하여 PostgreSQL `22P02` (invalid input syntax for type uuid) 에러를 완전히 해결함.
* **`ExportSettingsModal` 재사용성 확립 및 확정/취소 로직 개편 완료**:
    - **임시 설정 상태(Temp State) 관리 도입**: 모달이 열려 있는 동안 사용자가 채널이나 프라이버시 수준을 바꿀 때 부모 컴포넌트의 실제 상태가 실시간으로 변경되던 오작동을 해결하기 위해 `AutopilotControlPanel.tsx`에 임시 설정 상태를 도입함.
    - **확정 및 롤백 흐름 구현**: 사용자가 **`Confirm` (확인)**을 누른 경우에만 임시 설정이 메인 상태(`updateSeries`)에 영구 반영되도록 하고, **`Cancel` (취소)**을 누르거나 바깥 영역을 클릭해 닫을 시에는 임시 변경이 유실(롤백)되도록 로직을 정상화함.
    - **버튼 텍스트 동적 분기**: `confirmButtonText` Props를 도입하여 대시보드 화면에서는 기본값인 `"Export Video"`로, 오토파일럿 설정 모달에서는 `"Confirm"`으로 알맞은 버튼 텍스트가 표시되도록 조치함.
* **`Today's window closed` 수동 저장 팝업 전환 및 크레딧 보너스 문구 제거 완료**:
    - **인라인 경고 배너 걷어내기**: 패널 하단의 세로 높이 부족과 잘림 및 스크롤바 미표출의 원인이 되던 `Today's window closed` 인라인 경고 배너 및 `Start immediately` 체크박스를 패널 하단에서 제거함.
    - **수동 저장 전용 확인 모달 도입**: 사용자가 `Save Configuration` 버튼을 수동으로 클릭했을 때만 확인 팝업 모달이 노출되도록 구현함. (30초마다 작동되는 백그라운드 자동 저장 시에는 모달이 비활성화됨.)
    - **잔재 UI 삭제**: 예상 요금 블록 근처에 크레딧 시스템 시절의 잔재로 남아있던 31일 기준 보너스 혜택 알림 박스(`usageInfo.isBonusApplied` 영역)를 제거함.
* **오토파일럿 컨트롤 패널 높이 및 세로 스크롤 이슈 해결 완료**:
    - **`h-full` 클래스 부여**: 우측 설정 패널([AutopilotControlPanel.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/autopilot/AutopilotControlPanel.tsx))과 이를 래핑하는 부모 컬럼 `div`([WorkspaceAutopilotPageClient.tsx](file:///home/jaeho/Projects/short_real/components/page/workspace/autopilot/WorkspaceAutopilotPageClient.tsx))에 높이 지시자인 `h-full` 스타일을 추가함. 이로써 세로 한계를 벗어나는 설정 항목이 노출될 경우 정상적으로 세로 스크롤바가 렌더링되어 최하단 저장 버튼까지 자유롭게 스크롤하여 조작할 수 있게 됨.
* **오토파일럿 경고 모달 트리거 조건 고도화 완료**:
    - **요일 및 시간 범위 고도화**: 설정된 타임존 기준으로 오늘 요일이 스케줄 요일(`selectedDays`)에 포함되어 있는지를 먼저 검증하고, 현재 타임존의 현지 시각이 **`[생성 시작 시간 (업로드 2시간 전)] <= [현재 시각] < [업로드 예정 시간]`**의 2시간 범위 내에 쏙 들어올 때만 경고 모달을 띄우도록 판정 조건식을 고도화함. 이로써 이미 업로드 예정 시각이 지나버린 시각대에 설정을 변경할 때는 모달 경고 없이 정상적으로 저장되고 내일부터 가동되도록 처리함.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[진행 예정] 랜딩 페이지 하단 Pricing, FAQ 섹션 디자인 개편**:
    - 현재 랜딩페이지 하단 섹션 중 Pricing 및 FAQ 영역의 디자인 개편 작업 대기 중.
2. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) UI 화면 추가**:
    - 백엔드 코어 구조는 1:N 공용 풀로 다 전환되었으므로, 마이페이지(ProfilePage) 상의 "보관함 관리 인터페이스 UI" 개발 진행 예정.
3. **[기획/장기] Replicate 모델 실연동 검토**:
    - Replicate 모델의 실 서비스 연동 및 기획 단계 진행 예정.
