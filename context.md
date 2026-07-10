# 작업 진행 상황 (Last Updated: 2026-07-11 02:30)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **메타데이터 및 SEO 최적화 통합 개편 완료**:
    - **핵심 브랜드 키워드 정비**: 기존 `AI Faceless Shorts/Shortform`에서 최종 의사결정된 `Harnessed AI Video Studio` 및 `identical characters`, `in minutes` 등의 가치를 담은 문구로 사이트 전반의 메타데이터 통합 개편.
    - **공통 레이아웃 (`layout.tsx`) 최적화**: 파이프 기호(`|`) 적용하여 `ShortReal AI | Harnessed AI Video Studio` 형식의 탭 타이틀 템플릿 구현. 소셜(OG/Twitter) 카드 썸네일 이미지 및 설명글 통일 반영.
    - **메인 랜딩 (`page.tsx`) 캐노니컬 추가 및 스키마 고도화**: 중복 도메인 불이익 방지를 위해 대표 URL(`canonical: https://shortreal.ai`)을 명시하고, JSON-LD 스키마 마크업의 브라우저 요구사양, 소프트웨어 버전 추가 및 Action명 개편(`Create Harnessed AI Video`).
    - **로그인 (`sign-in/page.tsx`) 설명글 완만화**: 기존 딱딱한 `Provide an idea...` 구문을 레이아웃 톤에 호응하도록 `Bring your ideas...`로 부드럽게 개선.
    - **법적 페이지 (`privacy/terms`) 및 회원 전용 워크스페이스 (`dashboard/create/autopilot`) 일괄 정비**: 잘못 들어간 "Sign In" 주석을 각각 페이지에 맞게 갱신하고, 내부 대시보드 및 도구들도 `Shortform/Shorts` ➡️ `Video`로 일괄 치환하여 톤앤매너 일원화.

* **추가 SEO 고도화 및 보완**:
    - **`robots.ts` 파일 신규 추가**: 공개 페이지 3개 외 내부 서비스 경로(`/workspace/`, `/profile/`, `/admin/`, `/api/`, `/callback`)의 크롤러 진입 차단을 위해 동적 `robots.ts` 구현.
    - **`sign-in` 메타데이터 수정**: 로그인 화면이 검색 결과창에 노출되지 않도록 `noindex, nofollow` 처리 완료.
    - **AI 검색엔진(GEO) 대응**: AI 크롤러에 대응하기 위한 서비스 소개 및 핵심 링크 요약 파일 `public/llms.txt` 생성 완료.
    - **`sitemap.ts` 날짜 최신화**: 검색엔진 갱신 유도를 위해 최종 수정일을 작업일인 `2026-07-10`로 최신화.

* **BYOK(자체 API 키 지참) 전환에 따른 법률 고지 개정**:
    - **차후 도입 대상 제거**: 아직 실제로 데이터를 위탁하지 않는 Replicate 관련 항목을 이용약관 및 개인정보처리방침에서 선제적으로 제거하여 법적 안정성 및 사용자 혼선 방지.
    - **Fal.ai BYOK 요금 책임 명시**: 사용자가 입력한 Fal.ai API 키로 인해 발생하는 요금 책임 및 Billing 분쟁은 전적으로 사용자에게 귀속됨을 명시하는 약관 추가.
    - **개인정보처리방침 개편**: 수집하는 개인정보 항목에 '사용자 제공 API 키(BYOK)'를 명시하고, 플랫폼 제공 인프라인 `OpenRouter` (Platform-provided)와 사용자 연동 인프라인 `fal.ai` (User-directed / BYOK)를 엄격히 분리 서술하여 정보 전달의 투명성 확보.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[기획/장기] ProfilePage 내 소셜 계정 보관함 (Account Pool) UI 화면 추가**:
    - 백엔드 코어 구조는 1:N 공용 풀로 다 전환되었으므로, 마이페이지(ProfilePage) 상의 "보관함 관리 인터페이스 UI" 개발 진행 예정.
2. **[기획/장기] Replicate 모델 실연동 검토**:
    - Replicate 모델의 실 서비스 연동 및 기획 단계 진행 예정.
