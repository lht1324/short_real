2026-06-04 18:20

# 프로젝트 컨텍스트: 오토파일럿 고도화 및 전방위적 Anti-Slop 디자인 개편 (BYOK 전환 가속화)

## 1. 개요
기존의 크레딧 기반 과금 체계를 완전히 탈피하고, 유저가 자신의 API 키를 직접 사용하는 **BYOK(Bring Your Own Key)** 모델로의 전환을 본격화함. 이에 따라 워크스페이스(Create, Autopilot), 프로필, 로그인 페이지에 이르기까지 전방위적인 UI/UX 개편을 단행하여 'AI Slop'을 제거하고 전문적인 **'조종석(Cockpit)'** 컨셉의 다크 테크 디자인을 완성함.

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
- **선호 모델 기본값 연동**: `Users` 테이블의 `preferred_ai_model_config`를 1순위로 참조하도록 하여, 유저가 매번 모델을 고르지 않아도 되는 자동화 흐름 구축. (DB jsonb Default Value 설정 완료)
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

## 3. 향후 작업 (Next Steps) - [Priority: HIGH]

1. **[진행 예정] 실제 비디오 생성 로직에 유저 API Key 탑재**:
   - 현재 시스템 환경변수에서 가져오는 API Key를, 생성 요청을 보낸 유저의 DB 프로필(`fal_ai_api_key` 등)에서 꺼내 쓰도록 백엔드 생성 엔진 로직 수정 필요.

2. **[계획 수립 완료 / 진행 전] Autopilot 비디오 스펙(해상도, 비율) 설정 UI 통합**:
   - `autopilot_new_field_ui_update.md` 파일에 상세 구현 계획 작성 완료. 
   - `AutopilotConfigPanel` 내에 모델 선택(BYOK)과 분리된 독립적인 "Video Specs" 섹션 추가 및 미지원 해상도 비활성화 처리, 동적 해상도 Fallback 로직 구현 예정. (아직 코드 작업 시작 전이므로 이 파일부터 확인할 것)

3. **[진행 예정] Editor 페이지 디자인 리팩토링**:
   - `@components/page/workspace/editor/WorkspaceEditorPageClient.tsx`를 'Dark Tech' 프로 툴 감성으로 리팩토링.

4. **[검토 필요] Replicate 모델 실연동**:
   - fal.ai 외에 Replicate 엔진을 실제 비디오 생성 옵션으로 활성화하고 키 연동 기능 정식 오픈.

5. **[버그 수정] HeroSection 뮤트 버튼 작동 불량**:
   - 현재 Hero 영역의 비디오 카드에서 뮤트 토글 버튼이 정상적으로 동작하지 않는 이슈 해결 필요.

6. **랜딩 페이지 하단 섹션 (HowItWorks, Pricing, FAQ) 디자인 개편**:
   - AI 슬롭을 제거하고 현재의 Zinc 테마와 비대칭 레이아웃으로 일치시킴.

