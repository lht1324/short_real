# Autopilot Video Specs Integration Plan

## Objective
Autopilot 설정 패널(`AutopilotConfigPanel`)에 최종 비디오 생성물의 해상도(Resolution)와 화면 비율(Aspect Ratio)을 설정하는 UI를 추가하고, 관련 데이터 구조 및 백엔드 로직을 업데이트합니다. 이 과정에서 '디자인 스킬(Anti-Slop)'의 지침에 따라 UI를 시각적으로 명확하게 분리하고, 지원하지 않는 해상도는 비활성화하여 UX를 개선합니다.

## Background & Motivation
현재 Autopilot 설정에서는 사용할 AI 모델(BYOK)을 선택할 수 있지만, 최종 생성될 비디오의 형식(해상도 및 비율)을 지정하는 기능이 누락되어 있습니다. 새로운 모델들이 다양한 해상도를 지원함에 따라(예: `ai_model_data_rows.csv` 참조), 사용자가 원하는 출력 스펙을 명시적으로 제어할 수 있어야 합니다. 

디자인 가이드라인(Anti-Slop)을 준수하여, 기존 모델 선택 섹션(BYOK)과 혼합하지 않고 독립적인 "Video Specs" 섹션을 추가함으로써, '어떤 도구를 쓸 것인가(Model)'와 '어떤 결과물을 만들 것인가(Output)'의 정보 계층을 분리합니다. 모델 선택과 규격 선택이 혼합될 경우 레이아웃 리듬(Grid)이 깨지고 UI 목적이 흐려지기 때문입니다.

## Data Structure Updates

1. **`lib/api/types/supabase/AutopilotData.ts` 업데이트**
   `AutopilotData` 인터페이스에 다음 두 가지 새로운 속성을 추가합니다.
   ```typescript
   export interface AutopilotData {
       // ... existing properties
       resolution?: '720p' | '1080p' | '2160p' | null;
       aspect_ratio?: '16:9' | '9:16' | null;
   }
   ```
   *(참고: `VideoGenerationTasks.ts`에는 이미 `resolution`, `aspect_ratio`가 존재합니다. AutopilotData 모델에 추가하여 Series 단위 설정으로 관리합니다.)*

## Component Updates

### 1. `components/page/workspace/autopilot/WorkspaceAutopilotPageClient.tsx`
*   **기본값 설정:** `onClickAddSeries` 함수에서 새로운 시리즈를 생성할 때, 숏폼의 기본인 `aspect_ratio`를 기본값 `'9:16'`으로, `resolution`을 기본값 `'1080p'`로 설정합니다.
*   **Fallback 로직 구현 (핵심):**
    *   사용자가 I2V(Video) 모델을 변경하거나 초기 로드 시, 현재 선택된 `resolution`이 해당 모델에서 지원되지 않는 경우 지원되는 가장 높은 해상도(일반적으로 1080p 또는 720p)로 자동 강등(Fallback)하는 로직을 추가합니다.
    *   이를 위해 `aiModelList`에서 선택된 `videoModelId`에 해당하는 모델의 `ai_model_price_list`를 순회하여 지원하는 해상도 배열을 추출하여 체크합니다.

### 2. `components/page/workspace/autopilot/AutopilotConfigPanel.tsx`
*   **새로운 섹션 추가 ("Video Specs" 또는 "Output Format"):**
    *   기존 "Visual AI Models (BYOK)" 섹션 바로 아래에 새로운 `<section>`을 추가합니다.
    *   아이콘은 `MonitorPlay` 또는 `Frame`을 사용합니다.
    *   레이아웃은 `grid-cols-2`로 설정하여 왼쪽에는 'Aspect Ratio' (9:16, 16:9), 오른쪽에는 'Resolution' (720p, 1080p, 2160p) 드롭다운을 배치합니다.
*   **지원되는 해상도 동적 렌더링 및 비활성화 처리:**
    *   선택된 I2V 모델(`selectedI2vId`)의 데이터를 기반으로, '720p', '1080p', '2160p' 중 어느 해상도가 지원되는지 판별합니다.
    *   해상도를 아예 숨기는 것(Hide)이 아니라, 사용자가 모델 한계를 파악할 수 있도록 **비활성화(Disabled)** 처리합니다.
    *   **지원 안 됨:** `<option>` 태그에 `disabled` 속성을 추가하고, 레이블 뒤에 `(Not supported by model)`을 추가합니다. 색상은 흐리게(`text-zinc-600` 등) 처리하여 선택 불가함을 시각적으로 안내합니다.
    *   **지원 됨:** 일반적인 스타일로 렌더링합니다.

## Design System (Anti-Slop) Alignment
*   새로운 섹션은 기존 Zinc-950 기반의 다크 테크('Cockpit') 테마를 따릅니다.
*   `bg-zinc-900/40 border border-white/5 rounded-xl p-5` 등의 기존 컨테이너 스타일을 재사용합니다.
*   불필요한 설명 문구나 장식(예: Eyebrow 텍스트의 남용)을 피하고, 드롭다운 자체만으로 직관적으로 이해할 수 있도록 심플하게 구성합니다.

## Implementation Steps (For the Next Session)
1.  **Phase 1 (Data):** `@lib/api/types/supabase/AutopilotData.ts` 수정.
2.  **Phase 2 (Logic):** `@components/page/workspace/autopilot/WorkspaceAutopilotPageClient.tsx` 수정 (새 시리즈 생성 기본값 추가 및 `resolution` 자동 Fallback 로직 추가).
3.  **Phase 3 (UI):** `@components/page/workspace/autopilot/AutopilotConfigPanel.tsx`에 "Video Specs" 독립 섹션 추가 및 동적/비활성화 처리된 `select` 박스 구현.
4.  **Phase 4 (Validation):** UI를 렌더링하여 해상도 Fallback 및 비활성화가 예상대로 작동하는지, 시각적 디자인이 통일감 있는지 검증.