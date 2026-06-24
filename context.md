2026-06-25 03:20

# 프로젝트 컨텍스트: 오토파일럿 고도화 및 전방위적 Anti-Slop 디자인 개편 (BYOK 전환 가속화)

## 1. 개요
기존의 크레딧 기반 과금 체계를 완전히 탈피하고, 유저가 자신의 API 키를 직접 사용하는 **BYOK (Bring Your Own Key)** 모델로의 전환을 본격화함. 이에 따라 워크스페이스(Create, Autopilot), 프로필, 로그인 페이지에 이르기까지 전방위적인 UI/UX 개편을 단행하여 'AI Slop'을 제거하고 전문적인 **'조종석 (Cockpit)'** 컨셉의 다크 테크 디자인을 완성함.

## 2. 완료된 작업

### 2.1~2.8 (기존 성능 최적화 내역 유지)
- 오토파일럿 플랫폼 관리 업그레이드, AI 모델 데이터 정제, 관리자 API 구축 완료.
- 랜딩 페이지 Phase 1 디자인 및 비디오 리소스/성능 최적화 완료 (Lighthouse 65점 달성).

### 2.9 API 라우팅 보안 및 인증 구조 개선 - [완료]
- **Gateway 대응 강화**: `client-gateway`를 통한 내부 호출 시 발생하는 `AuthSessionMissingError`(401) 해결. `/api/open-ai/scene`, `/api/open-ai/script` 등 S2S 통신이 필요한 엔드포인트에 `getIsValidRequestS2S` 검증 로직을 적용하여 보안과 연동 안정성 동시 확보.
- **로깅 시스템 개선**: 게이트웨이의 프록시 동작을 로그상에서 명확히 식별할 수 있도록 개선하여 디버깅 효율 증대.

### 2.10 Workspace (Create & Autopilot) BYOK 모델 선택 시스템 통합 - [완료]
- **콤팩트 모델 선택기 (`BYOKModelSelector`) 구현**: Script와 Storyboard 사이의 세로 공간 압박을 최소화하기 위해 가로 3열 레이아웃의 모델 선택 UI를 신설. 뷰포트 Fold 라인 이슈를 UX적으로 해결.
- **실시간 가격 예측 (`EstimatedCostCard`)**: 기존의 크레딧 카드를 제거하고, 선택된 모델 단가와 영상 길이/씬 개수를 조합하여 **"Estimated BYOK Cost"**를 실시간 산출하도록 우측 ResultPanel 개편.
- **선호 모델 기본값 연동**: `Users` 테이블 of `preferred_ai_model_config`를 1순위로 참조하도록 하여, 유저가 매번 모델을 고르지 않아도 되는 자동화 흐름 구축. (DB jsonb Default Value 설정 완료)
- **데이터 보존 로직**: 영상 생성(`Generate Video`) 및 임시 저장(`Save Draft`) 시 선택된 `ai_model_config`가 DB에 누락 없이 반영되도록 연동 로직 보완.

### 2.11 Profile 페이지 전면 개편 및 인프라 관리 기능 구축 - [완료]
- **조종석(Cockpit) 디자인 적용**: 핑크/퍼플 네온 슬롭을 완전히 걷어내고 Zinc-950 기반의 미니멀한 전문 UI로 개편.
- **인프라 상태 대시보드**: 상단 스탯 영역에서 크레딧 정보를 삭제하고 **"Compute Engine"** 카드로 대체. fal.ai 연결 상태(Status Dot)와 빌링 대시보드 퀵링크를 배치하여 운영 편의성 극대화.
- **BYOK 키 관리 시스템**: 
    - **보안 마스킹**: API 서버 단에서 키의 앞부분만 남기고 `********` 처리하여 프론트에 전달하는 보안 로직 구현.
    - **인증 패널**: fal.ai (활성), Replicate (Coming Soon) 로고와 함께 키 등록/수정 UI 구현. 키 등록 시 초록색 체크마크로 연동 상태 시각화.
    - **하위 컴포넌트 동기화**: `OrderItem`, `ChangePlanModal`, `DefaultModal` 등 모든 하위 UI의 그라데이션을 제거하고 Zinc 테마로 통일.

### 2.12 SignIn 페이지 브랜드 강화 및 Anti-Slop 개편 - [완료]
- **브랜드 정체성 확립**: 로그인 폼 최상단에 **ShortReal 로고**를 배치하여 서비스 첫인상의 신뢰도 제고.
- **디자인 슬림화**: Vaporwave 배경 효과를 제거하고 중앙의 은은한 인디고 광원만 남겨 집중도 향상. 타이틀 그라데이션 제거 및 법적 고지 문구의 시각적 소음 억제.
- **서버 사이드 리다이렉트**: 서버 컴포넌트(`SignInPageServer`)에서 유저 세션을 선제적으로 체크하여 로그인 유저의 대시보드 이동 시 깜빡임 현상을 완벽히 제거.

### 2.13 API Key 유효성 검증 강화 및 초고보안 마스킹 적용 - [완료]
- **실시간 API Key 검증**: `app/api/user/[userId]/api-key/route.ts`에 fal.ai 공식 API(`v1/models?limit=1`) 연동. 유효하지 않은 키 입력 시 401 Unauthorized 에러 응답 및 데이터베이스 저장 거부.
- **클라이언트 전용 API 추가**: `lib/api/client/usersClientAPI.ts`에 `patchUserApiKey` 메소드를 신설하여 전용 엔드포인트 호출을 깔끔하게 구조화.
- **사용자 피드백 및 고정 마스킹 최적화 완료**

### 2.14 Workspace 상세 요금 명세서(Invoice) 개편 및 해상도 미스매치 보정 - [완료]
- **비용 산출 단일화 (`costCalculator.ts`)**: 글로벌 해상도를 기반으로 3대 파트(레퍼런스 T2I, 장면 I2I, 비디오 I2V)의 단가를 산정하고, 개별 모델의 지원 범위가 글로벌 해상도와 불일치(미스매치)하는 경우 자동으로 지원 최고 해상도의 요율로 대체하는 폴백 로직 구현.
- **명세서 레이아웃 고도화 및 Bottom-Up 순서 재배치 (`EstimatedCostCard.tsx`)**: 총액만 표시되던 기존 구조에서 탈피하여 3개 파트별로 사용 모델명, 해상도 단가, 곱해진 수량, 최종 계산 금액을 리스트 형식의 영수증 레이아웃으로 개편. 해상도 강제 대체 발생 시 노란색 경고 문구를 노출하여 유저가 가격 급등 사유를 직관적으로 이해하도록 유도. 폰트 스케일을 키우고 패딩 여백 및 명암비를 상향 보정해 가독성을 끌어올렸으며, 유저의 가격 저항감(Sticker Shock)을 낮추기 위해 **[세부 내역 ➔ 최종 총합계 (Total)]** 순서로 영수증(Bottom-Up) 흐름을 재배치함. 최종 합계 금액 표시 영역의 `$ (달러)` 기호를 숫자에 맞춰 볼드 및 폰트 크기 조절을 통해 스케일업하고, 수직 정렬을 세로 중앙정렬(`items-center`)로 교정하여 가독성 왜곡을 해결함. 또한 모호한 물결표(`~`)를 제거하고 통화 단위인 `USD` 명세를 우측에 컴팩트하게 추가했으며, 가격 자릿수를 **소수점 3자리**로 맞춤. 우상단 설명 툴팁이 부모 카드의 `overflow-hidden` 속성 때문에 잘려 보이지 않던 버그를 고쳤으며, 툴팁 반응 범위를 카드 전체 마우스 오버가 아닌 우상단 아이콘 호버 시에만 뜨도록 좁혀(`group/info`) UX 완성도를 높임.
- **비율 배지 및 레이아웃 가로 락 연동 (`ResultPanel.tsx`)**: 예상 합계 금액 산출 방식을 costCalculator 로직과 동기화하여 버튼 우측 배지 가격과 비용 카드 총액의 일관성 보장. 또한 27인치 대화면에서 우측 영역이 가로로 과도하게 늘어나 텍스트 가독성이 흐트러지는 것을 방지하기 위해 패널 가로 크기를 최대 450px(`max-w-[450px] min-w-[380px]`)로 락하여 정보 집중도와 프로 툴 감성을 유지하도록 개선함. 버튼 가격 배지도 카드에 맞춰 **소수점 3자리**로 일치시켜 수학적 오해를 불식함.

### 2.15 Storyboard 생성/재생성 버튼 버그 및 잔재 크레딧 로직 완전 배제 - [완료]
- **StoryboardSection.tsx 버그 픽스**: 크레딧 제거 리팩토링 과정에서 잔존했던 잘못된 예외 조건(`(sceneDataList.length > 0 || !!videoTitle)`)으로 인해 스토리보드가 생성되면 무조건 "Not Enough Credits" 경고가 뜨며 재생성이 막히던 심각한 오작동 버그를 수정함.
- **클린업**: 불필요한 코인 감액 표시 배지(`-2`) 및 버튼의 빨간색 테두리/에러 스타일을 완전히 제거하고, 정상적으로 스크립트 작성 및 성우 선택 상태에 반응하여 `Generate Storyboard`와 `Regenerate Storyboard`가 작동되도록 교정함.

### 2.16 Render Setup 카드 통합 및 해상도 탑다운 필터링 적용 - [완료]
- **단일 카드 통합 (`CreateFormPanel.tsx`)**: 기존의 분리되어 있던 `BYOKModelSelector` 카드와 `Video Specs` 카드를 하나로 묶어 `Render Setup` 컴포넌트로 개편함. 1층에 Aspect Ratio & Resolution 선택 상자를 배치하고, 2층에 모델 호환 가이드 및 API 키 누락 경고 배너, 3층에 BYOK 모델 셀렉터를 수직 구조로 재배치하여 정보 집중도를 높임.
- **해상도 필터링 오작동 해결 및 탑다운 전환 (`CreateFormPanel.tsx`, `WorkspaceCreatePageClient.tsx`)**: 모델 사양에 역방향으로 종속되어 해상도 옵션이 잠기던 기존 로직(`supportedResolutions` 연산)과 강제 롤백 효과(`useEffect`)를 완전히 걷어냄. 이제 글로벌 해상도는 언제나 자유롭게 선택할 수 있으며, 4K 선택 시 미지원 비디오 모델이 선택되어 있으면 4K 지원 비디오 모델로 자동 스위칭(대체)해 줌. 또한 선택한 해상도를 지원하지 않는 캐릭터/장면 모델들은 1080p 폴백 요율과 함께 ⚠️ `Mismatch` 경고만 띄우고 생성 기능은 정상 동작하도록 교정함.
- **드롭다운 UI 디테일 및 텍스트 룰 교정 (`BYOKModelSelector.tsx`)**: 커스텀 드롭다운 내 폰트 크기가 작아 시인성이 떨어지던 현상을 해결하기 위해 텍스트 스케일을 대대적으로 확장(`text-sm` ➔ `text-base`, 단가 `text-xs` ➔ `text-sm`, 뱃지 `text-[9px]` ➔ `text-xs`)하고, 여백(`py-2` ➔ `py-3`, `p-2.5` ➔ `p-3`)을 충분히 확보하여 cockpit UI 환경에 걸맞게 시원한 가독성을 제공함. 더불어 UI 텍스트에 한글(`대체`)이 섞여 노출되던 룰 위반 사항을 발견해 `fallback`으로 전면 영어 변환하였으며 가격 및 서브 정보들의 명도 대비를 한 단계 톤업하여 다크 테마 시인성을 강화함.
- **종횡비/해상도 드롭다운 디자인 동기화 (`CreateFormPanel.tsx`)**: 이질감이 들던 Aspect Ratio 및 Resolution 네이티브 셀렉트 박스를 `relative` 래퍼로 감싸고, 폰트 크기(`text-base font-semibold`), 패딩(`px-4 py-3`), 배경/보더 및 호버 트랜지션을 모델 드롭다운 토글 버튼과 완벽히 동기화함. 또한 우측에 `ChevronDown` 아이콘을 정렬하여 대칭적인 룩앤필(Symmetry Look & Feel)과 다크 테크 조종석(Cockpit) 감성을 극대화함.

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]

1. **[진행 예정] BYOK 전환 완료를 위한 Credit 시스템 전면 제거 및 안내/에러 핸들링 강화**:
   - **자체 크레딧 관련 연산 및 UI 제거**:
     - `WorkspaceCreatePageClient.tsx` 및 `WorkspaceAutopilotPageClient.tsx` 등에서 `userCreditCount`, `expectedCreditUsage`, `isCreditInsufficient` 계산식과 헤더의 `Credits` 스탯 영역을 완전히 제거.
     - `Insufficient Credit Modal` 및 크레딧 부족 시 생성을 차단하는 클라이언트 사이드 validation 로직 걷어내기.
   - **사전 경고 가이드 UI 배치**
   - **사후 에러 핸들링 고도화**

2. **[진행 예정] 실제 비디오 생성 로직에 유저 API Key 탑재**:
   - 현재 시스템 환경변수에서 가져오는 API Key를, 생성 요청을 보낸 유저의 DB 프로필에서 꺼내 쓰도록 백엔드 생성 엔진 로직 수정 필요.

3. **[계획 수립 완료 / 진행 전] Autopilot 비디오 스펙(해상도, 비율) 설정 UI 통합**:
   - `autopilot_new_field_ui_update.md` 파일에 상세 구현 계획 작성 완료. 
   - `AutopilotConfigPanel` 내에 모델 선택(BYOK)과 분리된 독립적인 "Video Specs" 섹션 추가 및 미지원 해상도 비활성화 처리, 동적 해상도 Fallback 로직 구현 예정.

4. **[진행 예정] Editor 페이지 디자인 리팩토링**

5. **[검토 필요] Replicate 모델 실연동**

6. **[버그 수정] HeroSection 뮤트 버튼 작동 불량**

7. **랜딩 페이지 하단 섹션 (HowItWorks, Pricing, FAQ) 디자인 개편**
