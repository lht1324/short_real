# Autopilot Platform Management Upgrade 계획서

## 개요
단순 체크박스를 계정 핸들(`@username`)이 포함된 상세 "Account Card"로 교체하고, OAuth 콜백 시 계정 핸들 및 표시 이름을 자동 수집/저장하며, 플랫폼별 공개 범위 설정 모달을 통합합니다.

## 완료된 작업
- [x] Supabase DB 마이그레이션 (SQL 직접 실행 완료)
  - `user_youtube_tokens`에 `youtube_handle_name`, `youtube_display_name` 컬럼 추가
  - `user_tiktok_tokens`에 `tiktok_display_name` 컬럼 추가
  - `autopilot_data`에 `tiktok_privacy` 컬럼 추가

---

## Phase 1: 타입 정의 업데이트

### 1-1. `lib/api/types/supabase/UserYoutubeToken.ts`
`youtube_channel_id` 아래에 다음 필드 추가:
```typescript
youtube_handle_name?: string;   // YouTube 채널 customUrl (예: @handle) - 없는 채널도 있음
youtube_display_name?: string;  // YouTube 채널명 (snippet.title)
```

### 1-2. `lib/api/types/supabase/UserTikTokToken.ts`
`tiktok_user_id` 아래에 다음 필드 추가:
```typescript
tiktok_display_name?: string;   // TikTok 프로필 display_name
```

### 1-3. `lib/api/types/supabase/AutopilotData.ts`
`youtube_privacy` 아래에 다음 필드 추가:
```typescript
tiktok_privacy?: ExportPrivacySetting | null; // TikTok 공개 범위 (PUBLIC / PRIVATE만 사용, Unlisted 없음)
```

---

## Phase 2: OAuth 콜백 고도화 (프로필 정보 자동 수집)

### 2-1. `app/callback/youtube/route.ts`
**목표**: 토큰 저장 직후 YouTube Data API로 채널 정보를 조회하여 `youtube_handle_name`, `youtube_display_name`을 DB에 저장한다.

**추가할 로직** (토큰 upsert 성공 후, 리다이렉트 전에 삽입):
```
1. GET https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true
   Header: Authorization: Bearer {tokens.access_token}
2. 응답에서 items[0].snippet 추출:
   - youtube_handle_name = snippet.customUrl ?? null  (customUrl이 없는 채널도 있음)
   - youtube_display_name = snippet.title ?? null
3. supabase.from('user_youtube_tokens').upsert({..., youtube_handle_name, youtube_display_name ...})
   (별도 upsert 대신, 4단계 기존 upsert에 필드만 추가)
```

**구체적 코드 위치**: `route.ts` 99~113행의 기존 upsert 객체에 `youtube_handle_name`, `youtube_display_name` 프로퍼티를 추가한다.
- 주의: 채널 정보 API 호출이 실패해도 토큰 저장과 리다이렉트는 정상 진행되어야 함 (try/catch로 감싸고 에러는 로깅만)

### 2-2. `app/callback/tiktok/route.ts`
**목표**: 토큰 저장 직후 TikTok Display API로 `display_name`을 조회하여 DB에 저장한다.

**추가할 로직** (토큰 upsert 성공 후, 리다이렉트 전에 삽입):
```
1. GET https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name
   Header: Authorization: Bearer {tokens.access_token}
2. 응답에서 data.user.display_name 추출
3. supabase.from('user_tiktok_tokens').upsert({..., tiktok_display_name ...})
```

**구체적 코드 위치**: `route.ts` 99~110행의 기존 upsert 객체에 `tiktok_display_name` 프로퍼티를 추가한다.
- 현재 scope `user.info.basic`으로 `display_name` 조회 가능 (scope 변경 불필요)
- API 호출 실패해도 토큰 저장은 정상 진행

---

## Phase 3: Platform Connection API 확장

### 3-1. `app/api/autopilot-data/platform-connection/route.ts`
**목표**: 연결 여부 외에 `handle_name`, `display_name` 정보도 함께 반환한다.

**변경 전 응답**:
```typescript
{
    platformConnection: {
        youtube: boolean,
        tiktok: boolean,
        instagram: boolean,
    }
}
```

**변경 후 응답**:
```typescript
{
    platformConnection: {
        youtube: {
            connected: boolean,
            handleName: string | null,   // youtube_handle_name
            displayName: string | null,  // youtube_display_name
        },
        tiktok: {
            connected: boolean,
            handleName: string | null,   // tiktok_display_name (TikTok은 handle 대신 표시)
            displayName: string | null,  // tiktok_display_name
        },
        instagram: {
            connected: boolean,
            handleName: null,
            displayName: null,
        },
    }
}
```

**구현 방식**: 기존 `supabase.from('user_youtube_tokens').select('user_id')` 등을 `.select('youtube_handle_name, youtube_display_name')`로 변경 (user_id도 함께 select하여 존재 여부 확인)

### 3-2. `lib/api/client/autopilotDataClientAPI.ts`
반환 타입을 위 응답에 맞게 업데이트한다 (TypeScript interface 추가).

---

## Phase 4: UI 컴포넌트 구현

### 4-1. `components/page/workspace/autopilot/PlatformAccountCard.tsx` (신규)
**목표**: 플랫폼 계정 정보를 카드 형태로 표시하는 통합 컴포넌트.

**Props 인터페이스**:
```typescript
interface PlatformAccountCardProps {
    platform: 'youtube' | 'tiktok' | 'instagram';
    logoSrc: string;
    activeColor: string;        // 활성화 시 테두리/배경 (Tailwind)
    iconColor: string;          // 활성화 시 아이콘 색상 (Tailwind)
    label: string;              // "YouTube Shorts", "TikTok", "Instagram Reels"
    connectLabel: string;       // "Connect YouTube", "Connect TikTok"
    isConnected: boolean;
    isChecked: boolean;         // AutopilotData.platforms[platform] 값 (토글)
    handleName?: string | null; // @handle or display_name
    isDisabled?: boolean;       // Instagram 등
    onClickToggle: () => void;   // 활성화 토글 클릭
    onClickConnect: () => void;  // 연결 버튼 클릭
    onClickSettings: () => void; // 톱니바퀴 클릭
    onClickDisconnect: () => void; // 연결 해제 클릭
}
```

**렌더링 분기**:
1. **연결됨 (`isConnected === true`)**:
   ```
   ┌────────────────────────────────────────┐
   │ [플랫폼아이콘] @handle_name  [토글] [⚙][✕] │
   │              YouTube Shorts             │
   └────────────────────────────────────────┘
   ```
   - 왼쪽: 플랫폼 로고 이미지 (24x24)
   - 중앙: `@handle_name` (또는 display_name) + 작은 글씨로 `label`
   - 오른쪽: 토글 스위치 (isChecked에 따라 ON/OFF) + 톱니바퀴 아이콘 + X 아이콘
   - isChecked가 true이면 activeColor 테두리/배경 적용
   - 톱니바퀴 클릭 → onClickSettings()
   - X 클릭 → onClickDisconnect()

2. **미연결 (`isConnected === false`)**:
   - 기존 `PlatformConnectButton` 대체: 아이콘 + "Connect {platform}" 텍스트
   - 클릭 시 OAuth 플로우 시작 (onClickConnect)

3. **비활성화 (`isDisabled === true`)**:
   - opacity 40% + Wrench 아이콘 (기존 PlatformCheckbox 스타일 유지)

**스타일**: Tailwind CSS, 기존 AutopilotControlPanel의 다크 테마(어두운 배경, purple accent)에 맞춤.
- 톱니바퀴, X 아이콘은 `lucide-react`의 `Settings`, `X` 사용
- 토글은 tailwind 기반 커스텀 스위치

### 4-2. `components/page/workspace/autopilot/AutopilotControlPanel.tsx` 수정
**목표**: PlatformCheckbox/PlatformConnectButton 분기 로직을 PlatformAccountCard로 교체.

**주요 변경점**:
1. state에 `platformConnections`의 타입 변경 (단순 boolean → `PlatformConnectionInfo` 객체)
2. `platformConnections` state에 `handleName`, `displayName` 정보 포함하여 저장
3. `useEffect`에서 `getAutopilotDataPlatformConnection()` 호출 시 새 응답 형식으로 받아 저장
4. 플랫폼 매핑 배열에서 기존 분기문 제거하고 PlatformAccountCard로 통합

**연결 해제(onClickDisconnect) 처리**:
- 현재는 alert("준비 중입니다.") 또는 아무 동작 없음 (UI만 구현)
- 향후 DELETE API 엔드포인트 필요

**설정(onClickSettings) 처리**:
- `ExportSettingsModal` open 상태 관리 (useState)
- 모달에서 privacy 설정 변경 시 `updateSeries` 호출

### 4-3. ExportSettingsModal 수정

#### 4-3-1. `components/page/workspace/dashboard/export-settings-modal/ExportSettingsModal.tsx`
**변경점**:
1. `platform` prop 추가: `platform: ExportPlatform` (YouTube인지 TikTok인지 구분)
2. `PRIVACY_OPTIONS` 배열에서 Unlisted 항목을 조건부 필터링:
   ```typescript
   const filteredOptions = useMemo(() => {
       if (platform === ExportPlatform.TIKTOK) {
           return PRIVACY_OPTIONS.filter(opt => opt.value !== ExportPrivacySetting.UNLISTED);
       }
       return PRIVACY_OPTIONS;
   }, [platform]);
   ```
3. 모달 타이틀을 플랫폼에 따라 변경 (예: "YouTube Shorts Settings" / "TikTok Settings")
4. 확인 버튼 텍스트: "Save" (기존 "Authorize & Continue" → 세팅 저장 용도이므로 변경)

**기존 props는 유지**하며 `platform`만 추가.

#### 4-3-2. ExportPlatform import 추가
`ExportSettingsModal.tsx` 상단에 `ExportPlatform` import 추가:
```typescript
import { ExportPlatform } from "@/lib/api/types/supabase/VideoGenerationTasks";
```

---

## Phase 5: AutopilotControlPanel + ExportSettingsModal 연동

### 5-1. 모달 상태 관리
`AutopilotControlPanel.tsx`에 추가:
```typescript
const [settingsModalOpen, setSettingsModalOpen] = useState<ExportPlatform | null>(null);
```

### 5-2. 톱니바퀴 클릭 핸들러
```typescript
const onClickPlatformSettings = useCallback((platform: ExportPlatform) => {
    setSettingsModalOpen(platform);
}, []);
```

### 5-3. ExportSettingsModal 렌더링 조건
```tsx
{settingsModalOpen && (
    <ExportSettingsModal
        platform={settingsModalOpen}
        privacySetting={
            settingsModalOpen === ExportPlatform.YOUTUBE
                ? (currentSeries.youtube_privacy ?? ExportPrivacySetting.UNLISTED)
                : (currentSeries.tiktok_privacy ?? ExportPrivacySetting.PRIVATE)
        }
        onChangePrivacySetting={(setting) => {
            if (settingsModalOpen === ExportPlatform.YOUTUBE) {
                updateSeries({ youtube_privacy: setting });
            } else {
                updateSeries({ tiktok_privacy: setting });
            }
        }}
        onClickConfirm={async () => setSettingsModalOpen(null)}
        onClickCancel={() => setSettingsModalOpen(null)}
    />
)}
```

---

## Phase 6: TikTok 업로드에 Privacy 연동 (선택적)

### 6-1. `app/api/video/export/tiktok/upload/route.ts`
현재 `privacy_level: 'SELF_ONLY'`로 하드코딩되어 있음 (182행).
향후 오토파일럿 모드에서 `tiktok_privacy` 값을 쿼리 파라미터로 받아 적용할 수 있음.
- 단, 자동 업로드는 오토파일럿 오케스트레이터에서 트리거되므로, privacy 값을 query param에 추가하는 작업 필요.
- **이 Phase는 별도 작업으로 분리 가능** (현재 Phase에서는 생략).

---

## 요약: 수정 파일 목록

| # | 파일 | 작업 |
|---|------|------|
| 1 | `lib/api/types/supabase/UserYoutubeToken.ts` | 필드 추가 |
| 2 | `lib/api/types/supabase/UserTikTokToken.ts` | 필드 추가 |
| 3 | `lib/api/types/supabase/AutopilotData.ts` | `tiktok_privacy` 필드 추가 |
| 4 | `app/callback/youtube/route.ts` | 채널 정보 조회 + DB 저장 |
| 5 | `app/callback/tiktok/route.ts` | display_name 조회 + DB 저장 |
| 6 | `app/api/autopilot-data/platform-connection/route.ts` | 응답에 handle/display_name 추가 |
| 7 | `lib/api/client/autopilotDataClientAPI.ts` | 반환 타입 업데이트 |
| 8 | `components/page/workspace/autopilot/PlatformAccountCard.tsx` | **신규** 통합 계정 카드 |
| 9 | `components/page/workspace/autopilot/AutopilotControlPanel.tsx` | PlatformAccountCard로 교체 + 모달 연동 |
| 10 | `components/page/workspace/dashboard/export-settings-modal/ExportSettingsModal.tsx` | `platform` prop 추가, Unlisted 조건부 숨김 |

## 참고사항

- TikTok `display_name`은 현재 scope(`user.info.basic`)으로 조회 가능 → scope 변경 불필요
- YouTube `customUrl`은 없는 채널도 있으므로 null 허용
- 연결 해제 API는 추후 구현 (현재는 UI만)
- `PlatformCheckbox.tsx`와 `PlatformConnectButton.tsx`는 PlatformAccountCard로 대체되므로 삭제 또는 보류
