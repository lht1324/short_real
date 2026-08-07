# ShortReal AI - 모바일 전용 랜딩페이지 기획 및 아키텍처 분석서

* **작성 일시**: 2026-08-03 17:40 (UTC+9)
* **작성 목적**: 데스크톱 랜딩페이지와 모바일 랜딩페이지의 구조적 분리 및 모바일 앱-네이티브(App-Native) 전용 화면 구축을 위한 현재 현황 분석 및 기획 설계서.

---

## 1. 현재 랜딩페이지 구조 현황 (Current Architecture Overview)

### 1.1 컴포넌트 호출 체계
```
LandingPageServer.tsx (Server Component)
└── LandingPageClient.tsx (Client Component)
    ├── Header.tsx (Global Top Header)
    ├── HeroSection.tsx (Main Headline & 9:16 Video Showcase)
    ├── FeaturesSection.tsx (Engine Capabilities & 4 Video Cards)
    ├── ComparisonSection.tsx (Slideshow vs True Motion Synchronized Video)
    ├── HowItWorksSection.tsx (3-Step Guide)
    ├── CostStructureSection.tsx (AI Generation Cost Calculator)
    ├── PricingSection.tsx (Pricing Plans & Benefit List)
    ├── FAQSection.tsx (Collapsible FAQ Accordion)
    ├── Footer.tsx (Global Bottom Footer)
    └── FloatingRoadmap.tsx (Floating Pill Widget & Popup)
```

---

## 2. 섹션별 현재 배치 및 디자인 분석 (Detailed Section Analysis)

### 2.1 Header (`components/public/header/Header.tsx`)
* **데스크톱 디자인**: 
    * 왼쪽: 40px 로고 아이콘 + `Short`(White) `Real`(`#FF3B30`) `AI`(`text-zinc-300`) 텍스트.
    * 중앙: `LandingPageNavigation` (Features, The Gap, How It Works, Cost Calc, Pricing, FAQ).
    * 오른쪽: Get Started 버튼 또는 유저 프로필 드롭다운.
* **모바일 한계점**:
    * 모바일 햄버거 버튼만 배치되어 있으나 클릭 시 팝업되는 모바일 네비게이션 드로어가 미구현(Placeholder) 상태.
    * 모바일 뷰포트에서는 상단 헤더에 탐색 메뉴가 은폐되어 사용자 이동성이 낮아짐.

### 2.2 HeroSection (`components/page/landing/hero-section/HeroSection.tsx`)
* **데스크톱 디자인**:
    * 왼쪽: `F*ck AI SLIDESHOWS` (Crimson Blade 사선 취소선) + Sub Copy + `Create Real Video` CTA.
    * 오른쪽: 3개의 9:16 비디오 카드 (중앙 메인 비디오 1개 + 양쪽 뒤에 깔린 2개의 서브 비디오 카드의 입체 배치).
* **모바일 한계점**:
    * 모바일 뷰포트에서는 비디오 카드가 `overflow-x-auto snap-x` 스와이퍼로 작동하지만, 상단 헤드라인 `F*ck` (64px) 텍스트가 모바일 화면의 절반 이상을 점유하여 시각적 답답함 유발.
    * CTA 버튼이 스크롤 하단으로 쉽게 묻혀 모바일 전환율(Conversion Rate) 확보가 어려움.

### 2.3 FeaturesSection (`components/page/landing/features-section/FeaturesSection.tsx`)
* **데스크톱 디자인**:
    * 4개의 핵심 기능 (Physics, Framing, Camera, Atmosphere).
    * `grid-cols-1 lg:grid-cols-4` 스태거드(Staggered - 높낮이가 위아래로 엇갈리는) 9:16 비디오 카드 배치.
* **모바일 한계점**:
    * 1열(Single Column) 모바일 스크롤로 전환 시, 4개의 9:16 세로 비디오 카드가 일렬로 빽빽하게 이어져 모바일 스크롤 길이가 지나치게 길어짐.
    * 유저가 2번째 카드 이후 이탈(Bounce)할 가능성이 높음.

### 2.4 ComparisonSection (`components/page/landing/comparison-section/ComparisonSection.tsx`)
* **데스크톱 디자인**:
    * 왼쪽: 대본 자막 싱크 텍스트 (A masterpiece carved not from stone...) + Sound On/Off 버튼 + 프로그레스 바.
    * 오른쪽: Slideshow(Bad Example) vs True Motion(Good Example) 9:16 동영상 2개 병렬 배치 및 동기화 재생.
* **모바일 한계점**:
    * 모바일 뷰포트에서 `grid-cols-2`로 비디오 2개가 양쪽으로 쪼개져 9:16 영상 크기가 지나치게 작아짐.
    * 대본 텍스트가 비디오 아래로 밀려나 자막과 비디오를 동시에 시청하기 어려움.

### 2.5 PricingSection (`components/page/landing/pricing-section/PricingSection.tsx`)
* **데스크톱 디자인**:
    * 구독 플랜 카드 (Popular 강조 카드 포함, 마우스 hover 시 `Unlock Engine` ➔ `Sign in to Unlock` 슬라이딩 애니메이션).
* **모바일 한계점**:
    * 모바일에서는 마우스 호버가 없어 버튼 클릭 시 애니메이션 멈춤(Double Tap Problem) 현상 발생.
    * 모바일 1열 스크롤 시 각 카드의 길이가 길어 플랜 간 비교(Comparison)가 한눈에 되지 않음.

### 2.6 FloatingRoadmap (`components/page/landing/FloatingRoadmap.tsx`)
* **데스크톱 디자인**: 우측 하단 알약 형태의 고정 버튼 + 마우스 클릭 시 상단 패널 팝업.
* **모바일 한계점**:
    * 닫기 X 버튼이 24px로 작아 터치 미스 발생.
    * 모바일 뷰포트 너비320px 고정 패널이 화면 측면에 밀착되어 가독성 저하.

---

## 3. 모바일 전용 랜딩페이지 분리 설계 전략 (Mobile-Dedicated Strategy)

### 3.1 분리 아키텍처 (Separation Architecture)
기존 데스크톱 코드를 무리하게 반응형 CSS(`sm:`, `md:`)로 덕지덕지 수정하지 않고, **모바일 전용 최상급 UI/UX 컴포넌트**를 새로 작성하여 깔끔하게 분기 처리합니다.

```
components/page/landing/
├── LandingPageServer.tsx                     # User-Agent / 뷰포트 기반 모바일/데스크톱 라우터
├── landing-page-mobile-plan.md               # [본 문서] 기획 및 분석서
├── desktop/
│   └── LandingPageClient.tsx          # 기존 데스크톱 전용 랜딩페이지
└── mobile/
    ├── LandingPageClient.tsx           # 모바일 전용 메인 클라이언트
    ├── MobileHeader.tsx                      # 모바일 앱 스타일 헤더 & 풀스크린 드로어
    ├── MobileHeroSection.tsx                 # 앱-네이티브 풀터치 히어로 & 스와이프 비디오
    ├── MobileFeaturesSection.tsx             # 탭/카드 터치 슬라이더 (모바일 스크롤 압축)
    ├── MobileComparisonSection.tsx           # 탭 전환형 (Slideshow ↔ True Motion) 비디오 비교
    ├── MobilePricingSection.tsx              # 모바일 가로 카드 스와이프 또는 컴팩트 1열 플랜
    ├── MobileDockingCTA.tsx                  # 화면 하단 고정 닥킹 Quick CTA 버튼
    └── MobileFloatingRoadmap.tsx             # 44px+ 터치 타겟 보장 로드맵 알약
```

---

## 4. 모바일 전용 컴포넌트 세부 설계안 (Mobile Component Specs)

### 4.1 `MobileHeader.tsx`
* **디자인**: 44px 높이의 슬림 앱-네이티브 헤더.
* **기능**: 
    * 좌측: 로고 (`ShortReal AI`).
    * 우측: `44px` 터치 타겟 햄버거 버튼 ➔ 클릭 시 **풀스크린 네비게이션 드로어(Full-screen Drawer)** 팝업.
    * 드로어 내부: 메뉴 이동 버튼 + `Get Started` / `Sign in` 대형 CTA 버튼.

### 4.2 `MobileHeroSection.tsx`
* **디자인**: 모바일 퍼스트 뷰포트 최적화 (`h-[85vh]` 내 핵심 메세지 배치).
* **개선점**:
    * 텍스트 폰트 반응형 `clamp()` 적용으로 소형 화면에서도 여백 확보.
    * 비디오 쇼케이스: 3개 카드를 스와이프 가능한 **Touch Carousel (터치 카루셀)** 형태로 재구성하여 한 번에 하나의 영상에 몰입하도록 유도.

### 4.3 `MobileFeaturesSection.tsx` (모바일 피처 슬라이더)
* **디자인**: 4개 세로 카드를 길게 늘어놓지 않고, **상단 4개 탭 (Physics | Framing | Camera | Atmosphere)** 버튼으로 스위칭하거나 가로 터치 스와이프로 구성.
* **효과**: 모바일 스크롤 길이를 70% 이상 단축하여 유저 이탈 방지.

### 4.4 `MobileComparisonSection.tsx` (모바일 비디오 비교)
* **디자인**: 좁은 모바일 화면에서 2개 비디오를 반으로 쪼개지 않고, **[Before: Slideshow] vs [After: True Motion] 탭 전환 버튼** 또는 **중앙 터치 슬라이더(Before/After Slider)**로 구성.
* **효과**: 모바일에서도 9:16 비디오를 큼직하고 시원시원하게 감상 가능.

### 4.5 `MobileDockingCTA.tsx` (하단 고정 CTA)
* **디자인**: 화면 하단에 고정(Fixed Bottom)되는 Glassmorphism 닥킹 바.
* **기능**: `Create Real Video ➔` 또는 `Get Started` 버튼을 터치하기 쉬운 엄지손가락 영역(Thumb Zone)에 배치하여 모바일 전환율 극대화.

---

## 5. 작업 진행 단계 (Execution Roadmap)

1. **[1단계 - 문서화 완료]**: 현재 구조 기록 및 모바일 전용 설계서 작성 (`landing-page-mobile-plan.md`).
2. **[2단계 - 아키텍처 분기]**: 
    * `LandingPageClient.tsx` 생성 및 기존 데스크톱 코드 이전.
    * `LandingPageServer.tsx`에서 클라이언트 뷰포트에 따른 분기 준비.
3. **[3단계 - 모바일 컴포넌트 연쇄 개발]**:
    * `MobileHeader`, `MobileHero`, `MobileFeatures`, `MobileComparison`, `MobilePricing`, `MobileDockingCTA` 순차 제작.
4. **[4단계 - 스킬 검증 및 모바일 테스트]**:
    * `design-taste-frontend` 및 `imagegen-frontend-mobile` 기준(터치 44px+, 가로 스크롤 0%, 뷰포트 줌 방지)에 맞추어 검수 및 튜닝.

---

## 6. 스킬 가이드라인 적용 매핑 (Skill Reference Mapping)

본 모바일 기획 및 설계서 작성 시 새로 설치된 **`design-taste-frontend`** 및 **`imagegen-frontend-mobile`** 스킬의 구체적 조항을 다음과 같이 직접 적용 및 매핑하였습니다.

### 6.1 `design-taste-frontend` 스킬 핵심 조항 매핑
* **Rule 3.E (Viewport Stability & Responsiveness)**:
    * iOS Safari 주소창 변동 시 레이아웃 튐 방지를 위해 `h-screen` 대신 **`min-h-[100dvh]`** 전면 적용.
    * 모바일 뷰포트 1열 붕괴(`grid-cols-1`) 및 가로 스크롤(Horizontal Overflow) **0% 검증**.
* **Rule 4.5 (Interactive UI States & Touch Target)**:
    * 모든 버튼 및 터치 요소의 터치 영역을 **최소 44px~48px**로 확장 (`FloatingRoadmap` 닫기 버튼 24px ➔ 44px 개선).
    * 모바일 마우스 호버(`group-hover`) 의존성을 제거하고 터치 피드백(`active:scale-[0.98]`)으로 전환하여 더블 터치 현상 방지.
* **Rule 4.7 (Layout Discipline & Hero Cap)**:
    * 모바일 히어로 상단 여백 캡(`pt-24` 이하 제한) 및 텍스트 폰트 `clamp()` 적용으로 첫 화면 시각적 억눌림 해소.
    * 모바일 스크롤 지루함 방지를 위한 **Layout Family Repetition Ban** (단순 1열 나열 지양 ➔ 탭/스와이퍼 카루셀로 템포 다변화).

### 6.2 `imagegen-frontend-mobile` 스킬 전용 수칙 매핑 (Detailed Rules)
* **Rule 1 (Active Baseline Configuration)**:
    * `PLATFORM_AWARENESS: 9` (generic phone UI가 아닌 **app-native premium** 인터페이스 구축).
    * `TEXT_READABILITY_PRIORITY: 10` & `MIN_TEXT_SIZE_DISCIPLINE: 10` (모바일 뷰포트에서 본문/자막 크기가 소형화되지 않도록 하한선 강제).
* **Rule 2 (Platform Mode Rule - iOS / Cross-Platform Neutral)**:
    * 상단 Safe-Area와 하단 Home Indicator 영역을 침범하지 않는 단단한 레이아웃 프레임 구조.
* **Rule 12 (First Screen Cleanliness Rule)**:
    * 첫 화면(First Viewport)의 억눌림 해소: 헤드라인 1~3줄 이내 제한, 단 하나의 명확한 Focal Point(중심점) 및 메인 CTA 배치.
* **Rule 13 (Safe Area and System Region Rule)**:
    * 스마트폰 상단 Notch/Status Bar 및 하단 Gesture Zone 영역에 주요 클릭 버튼이 겹치지 않도록 **Safe Area Padding** 준수.
* **Rule 15 (Clean Layout Rule - No Box-in-Box Clutter)**:
    * 모바일에서 3단계 이상 중첩된 카드(Box-in-Box-in-Box) 구조 배제. 1단 풀 카드시트 또는 여백(Whitespace) 기반의 시원시원한 분리.
* **Rule 18 (Image-Behind-Text Rule)**:
    * 9:16 비디오 및 배경 이미지 위에 텍스트가 배치될 때 가독성을 위한 **Bottom-to-Top Gradient Fade (어두운 그래디언트 페이드/스크림)** 필수 적용.
* **Rule 21 (Mobile Anti-AI-Tells Rule - AI 티 나는 흔한 패턴 금지)**:
    * 뻔한 보라-파랑 AI 그라데이션, 무의미하게 떠다니는 유리 위젯(Floating Glass Clutter), 무의미한 차트 덤프 **전면 금지**.


