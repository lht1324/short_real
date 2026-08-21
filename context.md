# 작업 진행 상황 (Last Updated: 2026-08-22 05:44)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: ad_generation_batches 스키마 설계 착수 — 임시 초안 (2026-08-22 05:44)
* **변주(다름) 설계**: seed만으로는 10개 변주 불가능하므로 **이산 변주 스펙 벡터**(장면/구성/조명/팔레트/헤드라인/CTA)로 겹침 없이 배분 → Gemini 크리에이티브 디렉터가 생성, DB `concepts`에 저장. 상세: `ad_variation_study.md` (보완의 여지 있음).
* **병렬 처리 구조 결정**: 이미지 단위로 (fal 생성 → Gemini 분석 → DB 기록)을 병렬 실행. 웹훅(fal queue) 또는 자체 큐 고민 중 — DB 부분 갱신 race 문제로 RPC(jsonb 부분 갱신) vs 후보 테이블 부활 결정 필요.
* **배치 스키마 임시 초안**: `lib/api/types/supabase/ad/AdGenerationBatch.ts` — background_mode 제거(background_prompt null 여부로 모드 판별), 이미지 jsonb{path,width,height,note}, concepts[], results[] (design/score), error 없음. ⚠️ **미완** — 사장 확인 대기.
* **파일 경로 규칙**: `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c 인덱스+비율만으로 서명 URL 재구성 → 이미지 목록 DB 저장 불필요.
* 업로드 이미지 서버 반입 경로 현재 없음(blob URL만) — signed upload 등 결정 필요.

### 🎯 이전: CreateForm UX 전면 재설계 완료 — 0스크롤 달성 (2026-08-22)
* **방향 전환**: "개발자/SaaS형" → **"광고 바닥(성장 이커머스) 사용자형"** 으로 재설계. 사장 직관("지금은 개발자/SaaS에 익숙한 사람용") 수용.
* **0스크롤 목표 달성**: 프리뷰 제거 → 폼 전폭 확보 → 5개 설정 + 실행 dock 한 화면(≈790px). "스크롤 자체를 없애고 싶다"는 사장 요구 반영.
* **레이아웃**: `[Background | Subjects]` 2열 / `[Where will it run?(돌담) | How many options?+CTA]` 2열 / 하단 실행 dock.
* **돌담 masonry**: 3열(9:16 | 4:5+2:3 | 16:9+1:1), 열 폭 **99:64:113** = 열 높이 수학적으로 동일 → 빈틈 없는 직사각형. 각 블록은 `aspect-ratio` CSS로 실제 비율.
* **실행 dock**: `mt-auto`로 뷰포트 하단 고정. 요약("4 creatives × 3 formats = 12 assets") + Generate 버튼 + 상태 힌트. `bg-surface`(페이지 canvas와 분리) + `border-t` + 상향 그림자.
* **용어 교체**: Count 라벨 **variations→creatives**, 총 장수 **images→assets**. 결과 화면 헤더도 assets로. (광고 업계 표준: creative=디자인 단위, asset=개별 파일 — Google/Meta 용어 확인 완료)
* `npx tsc --noEmit` 클린.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-5. CreateForm UX 전면 재설계 + 광고 사용자형 전환 (2026-08-22)
* **0스크롤**: 프리뷰(PreviewCanvas) Create 화면에서 제거 → 폼 전폭. 결과는 results 페이지에서 확인. (컴포넌트 파일은 유지)
* **Formats → "Where will it run?"**: 비율 숫자가 아니라 **플레이스먼트**(Story/Reels·TikTok/9:16 등 `AD_ASPECT_RATIO_INFO`의 usage 활용) 중심 표기.
* **돌담 masonry**: 3열 배치 99:64:113, `style={{ aspectRatio }}`로 각 블록 실제 비율. 사장이 그림(제미나이 번역)으로 요구한 "돌담처럼 지그재그로 맞물리는 불규칙 직사각형"을 3열로 구현. (제미나이 제안 2열+하단 풀폭은 9:16 타일 초고층 문제로 기각)
* **Count → "How many options?"**: 1/2/4/10 선택, `count===1` 단수 "creative" 처리.
* **상태 표시**: 스톤 블록 선택 시 `bg-accent/10`+`border-accent`+체크, Count도 `bg-accent/10` — 라이트/다크 모두 뚜렷.
* **모노 키커/라벨 제거**: "CREATE" 등 eyebrow 제거(craft-floor 규칙), "at least one"/"per batch" 등 모노 소문자 → plain 텍스트. ratio 코드(1:1 등)는 데이터라 모노 유지.
* **상하 여백**: `pt-32`(헤더 fixed top-4 고려), 메인 `min-h-[100dvh] flex flex-col` + dock `mt-auto` 하단 앵커. 흰 띠(그라디언트/여분 pt) 제거 — 사장 개발자도구로 검증.

### 2-6. 고정 px → rem 일괄 교체 (2026-08-22)
* 사장 원칙: "사이즈가 정해진 이미지/비디오가 아니면 n px 고정 수치 싫음. rem/vh/vw/%/fr/fr은 비율로 인정."
* **ad/create**: `PreviewCanvas` `h-[min(72vh,700px)]`→`h-[72vh]`(700px cap 제거), `CreateForm` 토글 `w-[52px]`→`[3.25rem]`·`translate-x-[24px]`→`translate-x-6`, `CreatePageClient` `max-w-[1440px]`→`[90rem]`.
* **ad/results**: `max-w-[1600px]`→`[100rem]`, 사이드바 `360px`→`22.5rem`, 그리드 `220px`→`13.75rem`.
* **랜딩**: Hero `min-h-[520/620px]`→`[32.5/38.75rem]`·`max-w-[1440px]`→`[90rem]`, HeroWall 이미지 8개 전부 rem 변환, AppHeader/Footer `max-w-[1400px]`→`[87.5rem]`.
* **workspace**: `h-[calc(100vh-73px)]`→`[4.5625rem]`, `w-[500px] h-[500px]`→`[31.25rem]`·`blur-[120px]`→`[7.5rem]`, `max-w-[1200px]`→`[75rem]`, `PlatformAccountCard h-[56px]`→`h-14`, `maxHeight '600px'`→`'37.5rem'` 등.
* `text-[Npx]`, shadow/blur/rounded 등 장식값, Tailwind 빌트인(rem 기반)은 건드리지 않음. `npx tsc --noEmit` 클린.

### 2-7. UploadZone 개선 (2026-08-22)
* **note 입력 → 접이식**: 기본 "Tell the AI what to change" 버튼, 클릭 시 입력 확장(자동 포커스), note 값 있으면 자동 열림. `aria-expanded` 추가. placeholder는 업계 지시문 형식("e.g. Keep the storefront sign, remove people walking by").
* **help 툴팁 조건**: `help && !file` — 업로드 후에는 도움말 미표시 (사장 지적).
* **업로드 제한 추가**: 허용 포맷 `image/jpeg,image/png,image/webp` + 10MB. `accept` 명시, MIME/size 검증, 에러 표시("Please upload a JPG, PNG, or WebP image." / "File is too large. Keep it under 10 MB.").
* **포맷 표기 통일**: 도움말 "PNG or JPG" → "JPG, PNG or WebP" (CreateForm 3곳 + HowItWorks "Drop:" 배지).

### 2-8. fal.ai I2I 포맷 조사 (2026-08-22)
* `fal-ai/nano-banana/edit`(I2I) 공식 스키마 확인: `image_urls: list<string>` — **URL(base64 가능)만 받고 포맷 강제 없음**. JPG/PNG/WebP 모두 전달 가능.
* 주의: base64는 대용량 시 성능 저하 → **fal.storage.upload 후 URL 전달**이 권장. 투명 PNG의 I2I 동작은 실테스트 필요.
* **기존 파이프라인(imageServerAPI.ts) 확인**: 참조 이미지를 Supabase Storage에 `.jpeg`로 저장 → signed URL(24h) → `image_urls`로 전달. 저장 포맷은 JPEG 고정, fal 스토리지 대신 Supabase signed URL 패턴. → AD도 이 패턴 재사용 예정.

### 2-4. 용어 교체 + CreateForm 레이아웃 조정 (2026-08-21, 이전 세션)
* **attempt → batch 전면 교체**: "per batch", FAQSection("one batch is one quality-gated set of candidates"), PricingSection, FeaturesSection, HowItWorksSection("One batch, one credit" / "1 batch = 1 credit").
* **생성 단위 "images" → "variations"**: Count 버튼 라벨, "Each variation is generated in every format you select.", 푸터 "10 variations × 3 formats = 30 images deducted per batch", formatMeta·running 문구. Generate 버튼은 총 장수 표기 유지.
* **Count/CTA 카드 `md:col-span-2` 확장** — "variations"(10자) 라벨이 4열 절반 폭에서 넘침 → 전체 폭 카드로 해결. `whitespace-nowrap` 추가.
* **CreatePageClient 그리드 실험**: `620px_1fr` → `minmax(0,1fr)×2`(차이 없음) → `minmax(0,3fr)_minmax(0,2fr)` 적용. (이후 이번 세션에서 전면 재설계로 대체)

### 2-1. 데스크탑 UI 최적화 (2026-08-20, 이전 세션)
* body 폰트 Arial→Satoshi 시도했으나 전역 침투로 원복 — ad는 `app/ad/layout.tsx`의 `font-satoshi`로 한정 적용.
* 트랜지션 통일 `cubic-bezier(0.16,1,0.3,1)`, 버튼 active 피드백.
* CTA 토글 `transition-[left]`→`translate-x-[24px]`(GPU-safe), knob `shadow-sm`.
* Background 카드 `min-h-[10em]`, PreviewCanvas 높이 `h-[min(72vh,700px)]`+aspect-ratio (이번 세션에서 cap 제거), Results 그리드·DetailPanel·CandidateCard 호버.

### 2-2. 생성 구조 전환 — "Concept 우선 + 비율 파생" (2026-08-20, 이전 세션)
* 비율 우선(주제 30개) → 개념 우선(주제 10개 × 3비율) 재구성.
* API 계약: `candidateCount`→`conceptCount`, `AdCandidate.conceptIndex` 추가.
* ResultsPageClient: 비율별 그룹 → 이미지별 그룹("Image 01 · best 8.2"), DetailPanel "Image 05 · 1:1".
* mock: 개념 우선 생성. `npx tsc --noEmit` 클린.

### 2-3. 비율 멀티 선택 + 와이드 UI, 생성 위저드/결과 화면 (이전 세션)
* 비율 멀티 선택, `aspectRatios` 배열 계약, 와이드 레이아웃, mock 전역 객체(`window.__adMockTasks`), 상태 머신 폴링.

---

## 3. 향후 작업 (Next Steps)

### 🔴 CreateForm 최종 UI 확인 (2026-08-22, 사장 확인 대기)
1. **화면 확인 대기**: 0스크롤(5개 설정+도크 한 화면), 돌담 masonry 사각형, dock 하단 고정, 카드 흰색/페이지 회색 복원, 선택 상태(핑크) — 확인 후 디테일 조정.
2. **반응형 확인**: lg 이하에서 2열→1열 전환 시 0스크롤 유지되는지. (현재 `min-h-[100dvh]`+`mt-auto`이라 모바일은 스크롤 불가피 — 판단 필요)
3. **라이트/다크 모드 대비 재확인**: 스톤 블록 `bg-accent/10` 선택 상태가 양 모드에서 충분한지.

### 🔴 ad 실 서버 API 연동 (mock 교체)
1. mock 교체 지점 **2곳**: CreatePageClient(mockCreateTask/mockGetTask) → `adClientAPI.postGenerateTask/getTask`, ResultsPageClient(mockGetTask) → `adClientAPI.getTask`.
2. 실 백엔드는 별도 서버(ngrok BASE_URL)에 `/api/ad/*` 라우트 구현 — client-gateway가 프록시하므로 프론트 `app/api/ad/*` 라우트는 도달 불가(죽은 코드, 실 서버 이전 대상).
3. **Concept 우선 파이프라인**: conceptCount × aspectRatios 순회. 개념별 서로 다른 seed, 같은 개념 내 비율 = 같은 seed.
4. **모델 선정 조건**: seed 지정 가능 + 비율별 해상도 지원 (1:1=1024², 4:5=832×1216, 9:16=768×1344 등).
5. **검증 항목**: 같은 개념의 비율 3장이 "같은 배경/상품의 다른 비율 버전"으로 보이는가 (seed 동일 여부는 부수 확인). 실패 시 비율 우선으로 재논의.
6. **배치 스키마 임시 초안 작성됨**(`lib/api/types/supabase/ad/AdGenerationBatch.ts`, ⚠️ 미완) — 변주/병렬 구조는 `ad_variation_study.md` 참고, 사장 확인 대기.
7. **병렬 처리**: 이미지 단위 (생성→분석→기록) 웹훅/큐 구조 검토 필요. RPC(jsonb 부분 갱신) vs 후보 테이블 결정해야 DB race 없음.

### 🔴 Remotion 폴더 구조 정리 (미완료)
1. `components/remotion/client/` 폴더 신설 — 클라이언트 컴포넌트 이전.
2. 기존 ffmpeg 로직 삭제 (`app/api/video/merge/...`, `videoServerAPI.postFinalVideo` 등, 웹훅 3개).
3. 배속 씬 올-인-원 전환 (`render-final-video.ts`의 `postProcessedVideo` 분기 제거).

### 🟡 TODO — 사장 확인/피드백 대기
* **결과 페이지 균일 타일 피드백 대기** — CandidateCard aspect-square 균일 프레임 + 내부 contain 수정("2번, 이따 하자"로 미룸). 여러 비율 선택 시 들쭉날쭉 문제 해결 여부 확인.
* 결과 화면 그룹 내 카드 순서: 현재 비율 순 고정 (1:1→4:5→9:16). 사장 확인 필요.
* 결과 화면 "Image 01" 그룹 헤더 — 이번 용어 교체(creatives/assets)와 일관성 있게 "Creative 01"로 바꿀지 미결정.

### 🟡 TODO — 요금 표시 방식 (미결정)
* 생성 배치 차감 문구를 **실제 달러 표시**로 할지, **잔여 생성 가능 장수** 표시로 할지 미결정.
* 기준: Nano Banana 기본 모델 1회 실행 $0.039 (크레딧은 사용하지 않음).
* 반영 후보 위치: CreateForm/실행 dock 요약("assets credited per batch"), AppHeader 사용량 게이지.

### 🟡 잔여 확인/이슈
* 랜딩 CTA "Start creating"이 `/ad/create` 미연결 (`#pricing` 앵커).
* 액센트 색 불일치: 코드 `#EF2B70`(마젠타) vs 기획서 11-2 `#E25E2C`(burnt orange).
* ESLint 설정 순환참조로 린트 불가 — `tsc --noEmit`으로 대체 확인.
* 대시보드 MVP 1차 범위 — 미결정.
* 결과/확인 화면의 에디터 진입 버튼 (자리만 vs 숨김) — 미결정.

---

## 4. 참고 (Reminders)
* 공용: `getNextBaseResponse()` 사용 (엔드포인트 응답 규격), UI는 영어 표기, 들여쓰기 공백 4칸.
* ad 폰트는 `app/ad/layout.tsx`의 `font-satoshi`로 ad 하위 한정. globals.css `body`는 Arial 유지 (랜딩 폰트와 분리).
* **사장 UI 원칙**: 사이즈가 정해진 이미지/비디오 아니면 **px 하드코딩 금지** — rem/vh/vw/%/fr만 사용. `text-[Npx]`·shadow·rounded는 장식값이라 허용.
* **사장 설계 취향**: 광고 바닥(성장 이커머스, 디자이너 없음)이 "뭘 하는 건지 알아차릴" 언어. 개발자/SaaS 용어 지양. 0스크롤·0~1클릭 선호.
* mock 구조: `window.__adMockTasks: Record<string, AdTask>` — CreatePageClient가 생성·상태 갱신, ResultsPageClient가 조회·후보 생성(개념 우선 flatMap). 실 구현 시 이 전역 객체와 `declare global` 블록 제거.
* **용어 계약 (확정)**: `conceptCount`(creatives) × `aspectRatios`(formats) = 총 장수(assets). 사용자 노출: **creatives**(포맷당 생성 버전 수) / **formats**(비율) / **assets**(총 장수) / **batch**(생성 실행 1회). Google/Meta 용어 기준(creative=디자인 단위, asset=개별 파일).
* 시드 규칙: 개념별 서로 다른 seed / 같은 개념 내 비율 = 같은 seed. I2I 1회 구조. 같은 seed+다른 비율 = 초기 노이즈 shape 상이 (비슷함 미보장, 공통 입력 이미지가 일관성 담당).
* **fal 이미지 파이프라인**: `image_urls`는 URL만 받음(포맷 자유) — Supabase Storage에 .jpeg로 저장 → signed URL(24h) 전달. base64는 대용량 시 성능 저하. 투명 PNG의 I2I 동작은 실테스트 필요.
* client-gateway는 `BASE_URL`(ngrok 백엔드)로 무조건 프록시 — 프론트 `app/api/*` 라우트는 실서버에 구현해야 함.
* **ad DB/파이프라인 설계 노트**: `ad_variation_study.md` — 변주 스펙 벡터, 웹훅 병렬 구조, 임시 스키마. 보완의 여지 있음.
* Remotion 4.0.507 습성: `component` prop 타입 추론 불가, `PlayerProps.onEnded` 없음, `play()` 반환 void.
* 서버 렌더: `<Video>` 대신 **`<OffthreadVideo>`** + `colorSpace: 'bt709'` 필수, 저사양 머신은 `concurrency: 1`.
