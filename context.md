# 작업 진행 상황 (Last Updated: 2026-09-04 04:10)

## 1. 현재 상황 (Current Status)

### 🎯 현 단계: 폰트·유사성·썸네일·채널·Creative 상태 정리 완료 — 대기 상태 (2026-09-04)
* **직전 구현 (2026-09-03~04, tsc 클린)**
  * **Realtime 채널 수정**: `ProjectDetailPageClient.tsx:54` 세션 없이 구독하던 `Detail`을 `supabase.auth.getUser()` 후 구독 + `Math.random` suffix로 수정, 끊김 대비 4초 폴링 안전망 추가. `ProjectsPageClient.tsx:60`도 `UPDATE` 시 썸네일 최고점 갱신을 위해 `fetchProjects(true)`로 재조회.
  * **폰트 3축 검증·확장**: `FontFamilyList.ts:69` 전체 69개 vs `lib/fonts.ts:205` `fontMap` 25개 불일치 확인 → `fontMap` 34개로 확장(Anton/Archivo Black/Bebas Neue/Staatliches/Teko/Paytone One/Syne/Unbounded/Fredoka 추가). `llmServerAPI.ts:55` `available_fonts`를 `sans:22 | serif:3 | display:9` 그룹 문자열로 교체. `POST_AD_CREATIVE_PROMPT.ts:30` 카테고리 시맨틱 및 `Font Selection Protocol`에 `fontWeight/headlineColor` 규칙 추가, `prompt/route.ts:118` `fontFamily/fontWeight/headlineColor` 3종 fallback(`Inter/400/white`) 추가. 렌더는 `CreativeRow.tsx:34` 헤더·푸터에 `fontFamily/Weight` 인라인 + `FormatTile.tsx:125` `AdOverlay.tsx:32`에 `white/black` 2택 색·`fontFamily/Weight` 전달.
  * **유사성(배경) 통일**: `POST_AD_CREATIVE_PROMPT.ts:109` Sentence Architecture를 2단으로 고정 — `Product anchor(동일 포즈)` + `Background+Lighting(5장 동일 문구)` + `Composition(비율별만 다름)`. `Hard Constraints`에 `Background+Lighting unification` 및 `Product pose identical` 2줄 추가, `constraint`·`Quality Gate`에도 동일성 체크 추가. `seed`는 동일 creative 공통이라 원인 아니고 프롬프트 분절이 원인이었음.
  * **썸네일 v2**: `app/api/ad/ad-generation-batches/route.ts:38` 리스트에서 `score` 최고 1장(`score` 없으면 첫 완료 1장)을 골라 `thumbnailSignedUrls`+`thumbnailRatioKeys` 2맵 발급. `ProjectCard.tsx:60` 커버를 `object-cover` 유지하되 `thumbnailRatio` 세로(9_16/4_5/2_3)는 `object-position: top center`로 제품 보존. `ProjectsPageClient.tsx:27`에서 맵 병합, `UPDATE` 시 재조회로 최고점 갱신 시 커버 교체. 없을 땐 기존 스켈레톤 유지.
  * **Creative 상태 세분화**: `CreativeRow.tsx:50` `designing` 카운트 추가 — `imageFileExtension` 있음 + `score null`이면 `Designing`. `statusLabel`에 `Designing` 분기, `getBatchProgress:104`도 `score != null`만 `completed`로 카운트해 Batch `Designing`과 일치. 이미지는 떴지만 `analysis` 전엔 `Designing`으로 같이 돔.
  * **파이프라인 잔여 정리**: `ad_image_storage` 버킷 생성 확인됨(업로드·signedUrl 정상). `app/ad/create/results/page.tsx` 폴더 삭제(리다이렉트 불필요).
* **이전 세션 (2026-09-01) — 유효**: GLM Vision 이미지 이해, 노트 분류 6줄, 색상 통일 2곳, Bento `fr` 나눔, Where 돌담, How many 1×4, Brand 팔레트, RPC `::text` 캐스팅, 영어 고정, gateway 등은 유지.

---

## 2. 완수된 작업 (Completed Milestones)

### 2-23. 썸네일 v2 + Creative Designing 단계 (2026-09-04)
* 리스트 썸네일: 최고점 1장 커버 + 비율별 `top center` 크롭, 실시간 갱신. Creative `Designing` 추가로 Batch `Designing`과 어긋남 해소, `getBatchProgress`도 `score` 기준으로 통일.

### 2-22. 유사성 배경 고정 + 폰트 렌더 연결 (2026-09-04)
* 배경·조명 5장 동일 문구 강제, 구도만 비율별, 포즈 동일. 폰트 34개·weight·white/black 검증 및 `CreativeRow/FormatTile/AdOverlay/AdLightbox`에 내려온 대로 반영.

### 2-21. 폰트 검증 및 채널 수정 (2026-09-03)
* `fontMap` 34개 확장, `available_fonts` 그룹화, `Font Selection Protocol` 강화, `Detail` 채널 `getUser()` 후 구독 + 4초 폴링.

### 2-20. 폰트/I2I 지시 선행 반영 완료 (2026-09-01)
* `FONT_FAMILY_LIST`/`lib/fonts.ts` 30~40개 및 `fontMap` 등록, `POST_AD_CREATIVE_PROMPT` `available_fonts` 제약, Remotion 프리로드, 원본 컷아웃 2단 래핑.

### 2-19. 이미지 이해(Vision) + 색상 통일 + 노트 분류 프롬프트 수정 (2026-09-01)
* GLM Vision 원본 전달, 노트 분류 6줄, 색상 통일 2곳 추가.

### 2-18. Create Bento 세부 + Brand 일부 + 확대 기능 추가 (2026-08-31, 일부 미완)
* Bento `fr` 나눔, Where 동적 높이, How many 1×4, Pro 배지, Brand 팔레트 시도, 확대 ponytail.

### 2-17. Create Bento 한 화면 + 업로드 팝오버 + Brand 그리드 시도 (2026-08-31, 일부 미해결)
* 한 화면 Bento 확정, 드롭존 동일 높이, Where 돌담, Brand pill→팔레트.

### 2-16. Realtime 채널 전환 + RPC 캐스팅 수정 + 프롬프트 영어 고정 + 로그 (2026-08-29)
* 폴링→Realtime, StrictMode 충돌 수정, RLS publication/정책, RPC `::text`, 영어 고정, raw 로그.

### 2-15. Projects 정석 분리 + 업로드 + 텍스트 pill 한 화면 (2026-08-29)
* `ad-generation-batches` 정석 경로 + ByUserId + gateway FormData + Projects 상황실 + Create 업로드 연동.

### 2-14. 프롬프트 엘리트화 + 전 구간 배선 + fail-soft/팔레트/UI (2026-08-28)
* B안 개명·brand_palette·HARD_BANNED 8개·프롬프트 재작성·prompt/analysis 배선·fail-soft n=1·UI 정리.

### 2-13. generation/webhook/process + LLM 스켈레톤 구현 (2026-08-27)
* AdImageResult 확장자·RPC·imageServerAPI·generation/webhook/process·ReplicateClient.

### 2-12. 서버 파이프라인 설계 확정 + LLM 경계까지 구현 (2026-08-26)
* 용어 확정, 배분 주체=코드, RPC 3종, ReplicateClient, 스캐폴드.

### 이전 마일스톤 요약 (상세는 git 히스토리 참조)
* **2-11 (08-24)**: results 구조 확정 — `AdCreativeResult[]`
* **2-10 (08-24)**: 변주 설계 합의 — Creative 단위, LLM creative당 1회
* **2-9 (08-22)**: 결과 화면 — 실비율 카드, Creative 용어
* **2-5~2-8 (08-22)**: CreateForm 0스크롤 리디자인, px→rem, UploadZone
* **2-1~2-4 (08-20~21)**: 데스크탑 최적화, concept 우선 구조

---

## 3. 향후 작업 (Next Steps)

### 🔴 다음 (UI)
1. **Create 한 화면 미세 조정** — 완료 처리(이미 함).
2. **과금 확정** — 대기 (`success only` 문구 교체 완료, 실제 Polar 차감은 성공 에셋 수 기준으로 이전 필요 — 현재 `totalImages` 선차감).
3. **Projects 리스트 썸네일 고도화** — 완료 (최고점 1장 커버 + `top center` 크롭, 실시간 갱신).

### 🟡 대기
* CreateForm 최종 UI 확인(0스크롤·반응형·라이트/다크) — 사장 확인 대기
* 요금 표시 방식(달러 vs 잔여 장수) 미결정
* Remotion 폴더 구조 정리 (미완료)
* 랜딩 CTA `/ad/create` 미연결, 액센트 색 불일치(#EF2B70 vs #E25E2C), ESLint 순환참조(tsc 대체 운용), 결과 화면 에디터 진입 버튼
* 배치 간 재사용 추적 v1 미구현

---

## 4. 참고 (Reminders)

* 공용: `getNextBaseResponse()` 사용, UI는 영어, 들여쓰기 4칸, 함수명 약어 금지. ESLint 불가 — `npx tsc --noEmit`으로 검증.
* **요청 경로**: 클라이언트 `postFetch('/api/ad/image')` / `postFormFetch('/api/ad/ad-generation-batches/${batchId}/images', fd)` → baseFetch가 `/api/client-gateway?path=...`로 래핑 → gateway가 세션 인증(C2S)+`userId` 주입(멀티파트면 `formData`, 아니면 `json`) → `${BASE_URL}`(ngrok)으로 `x-internal-secret`과 함께 전달 → 내부 라우트는 S2S 가드. 내부 체이닝은 `internalFireAndForgetFetch(BASE_URL + 경로)` (query로 식별자, body로 페이로드, waitUntil로 실행 보장).
* **API 경로 정석**: DB `ad_generation_batches` ↔ 서버 `app/api/ad/ad-generation-batches` + `[batchId]` (kebab-case 복수, ByUserId). 페이지는 UX 별칭 `app/ad/projects` + `[projectId]` 유지. 클라는 `adGenerationBatchClientAPI`가 정석 경로로 호출하고 `adProjectClientAPI`가 `projects/project` 별칭으로 래핑. 내부 타입/변수는 `batch`, 화면 텍스트/URL만 `Project`.
* **Realtime**: `alter publication supabase_realtime add table public.ad_generation_batches;` + RLS `user_id = auth.uid()::text` 4개 정책. 리스트는 `channel('ad-batches-list-${user.id}-${rand}').on('postgres_changes', filter: user_id=eq.userId)` — `UPDATE` 시 `fetchProjects(true)`로 썸네일 갱신, 상세는 `channel('ad-batch-${projectId}-${rand}').on('postgres_changes', filter: id=eq.projectId)` — 세션 확보 후 구독, `supabase.removeChannel`로 정리, StrictMode 랜덤 suffix. 상세는 끊김 대비 4초 폴링 안전망 추가( `isRunning`일 때만).
* **웹훅 관례**: `app/webhook/{provider}/` 위치, 절대 에러 상태로 응답하지 않음(200 유지). Replicate는 terminal 웹훅 실패 시 exponential backoff 재시도(최종 ~1분) + 순서 뒤바뀜 — 핸들러 멱등 필수. `ratioKey`는 query 1순위·없으면 `input.aspect_ratio` fallback, `attempt`는 재시도 횟수 추적.
* **RPC 3종 원리**: 같은 행 jsonb 배열에 병렬 쓰기 → 앱 코드 read-modify-write 금지, RPC 단일 UPDATE+jsonb_set(행 잠금)만 사용. `jsonb_set` 경로는 `text[]`라 `array[p_creative_index::text, '...']`로 캐스팅 필수. RPC#1은 `imagePromptRecord` 단일(B안), RPC#2는 `p_file_extension text default null, p_error jsonb default null` 포함 마커, RPC#3은 `p_image_results` + error도 완료로 카운트. PostgREST 스키마 캐시는 `docker compose restart short-real-server`로 갱신.
* **비율 파생 (확정)**: 기준 1:1 우선(없으면 캐노니컬 첫째) 1장 → 나머지는 기준 이미지 참조 재생성. `n=1` 재시도: 같은 비율 1회 재시도(총 2회) 후 차순위 base로 폴백, ratios도 1회 재시도. base 없으면 원본만 폴백. 원본 업로드 전이면 text-only 폴백.
* **Replicate SDK**: `replicate@^1.4.0` 설치됨. `new Replicate({auth})`, `predictions.create({model: 'owner/name', input, webhook, webhook_events_filter:['completed']})`. output은 string|string[]|FileOutput — `adImageServerAPI.extractFirstOutputUrl`로 정규화. 모델 enum: NANO_BANANA(-PRO/-2/-2_LITE).
* **파일 경로 규칙**: 입력 `{user_id}/{batch_id}/{product|person}_image.{ext}`, 출력 `{user_id}/{batch_id}/ad_generation_result_{c}_{ratio}.{ext}` — c+ratio+imageFileExtension으로 signed URL 재구성. 버킷 `ad_image_storage` (imageServerAPI, private, 생성 확인됨). 업로드 엔드포인트 `POST /api/ad/ad-generation-batches/[batchId]/images` (multipart, upsert:true).
* **AdImageResult**: `design: AdDesignLayout, score: number | null, imageFileExtension: string | null, error?: {code,message}|null` — process가 다운로드 시 `inferFileExtension`으로 확정, 실패 시 `error`로 격리.
* **AdCreativeSpec**: `imagePromptRecord: Partial<Record<AdRatioKey,string>>` (B안), `seed: number` — 프롬프트 단계가 채움. `brand_palette`는 배치 생성 시 3-5 hex or null.
* **AdCopySpec**: `headline: string | null, cta: string | null, fontFamily?: string | null (34개 중 하나), fontWeight?: number | null (해당 폰트 weightList 내), headlineColor?: 'white'|'black' | null` — prompt 단계가 채우고 `fontMap` 미등록 시 `Inter/400/white`로 교정.
* **AdCreativeResult**: `creativeIndex: number, copy: AdCopySpec, imageResults: Partial<Record<AdRatioKey, AdImageResult>>` — Creative 단위 1:1 대응. Creative 상태는 `imageFileExtension`만 있으면 `Designing`, `score`까지 있어야 `Completed`.
* **LLM**: Creative 디렉터 `GLM_5_3_FLASH`(vision, `imagePromptRecord`+`copy`+`reasoning`, 영어 고정, 이미지 우선) + 노트 분류 + 색상 통일(동일 hue) + 배경·조명 통일(5장 동일 문구, 구도만 비율별) + 폰트 34개 그룹화(`sans:22|serif:3|display:9`) 및 `fontWeight/headlineColor` 제약, Vision 분석 `GLM_5_3_FLASH`(멀티모달, 정수% 0-100, `brand_palette` 조건부, 영어 고정) — `llmServerAPI.ts` `postAdCreativePrompt`/`postAdImageAnalysis` + 원문 로그, 프롬프트는 `POST_AD_{CREATIVE,IMAGE_ANALYSIS}_PROMPT.ts` 엘리트 250-320줄, `constraint`에 `ALL output text MUST be English only` 명시.
* **썸네일**: 리스트 `GET /api/ad/ad-generation-batches`에서 `score` 최고 1장(없으면 첫 완료 1장)의 `thumbnailSignedUrls[batchId]` + `thumbnailRatioKeys[batchId]`를 발급, 카드 `4:3`에 `object-cover` + 세로 비율은 `object-position: top center`로 제품 보존. 없을 땐 스켈레톤.
* **용어 계약 (확정)**: creatives × formats = assets, 실행 1회 = batch. 유저 노출은 Project(페이지/URL/텍스트), 서버/DB/내부 코드는 batch.
* **시드 규칙**: creative별 서로 다른 seed / 같은 creative 내 비율 = 같은 seed. 재현은 저장된 specs(DB)가 담당.
* **사장 UI 원칙**: px 하드코딩 금지(rem/vh/vw/%/fr), 광고 바닥 언어, 0스크롤 선호. Bento 12col (`Subjects 8 | How many+CTA 4 / Where 8 | Brand 4`), `Where` 돌담은 `ResizeObserver`로 `H=(W-32)/4.806` 실측 5개 1행·가로 중앙, 섹션 높이는 내용 높이대로. `optional` 배지로 즉시 인지.
* **ad_variation_study.md**: §1·§2·§6 이미 최신(`imagePromptRecord`, `brand_palette`, HARD_BANNED 8개, fail-soft, n=1 재시도) — 색상 통일·배경 통일 추가 갱신 완료.
* **supabase 파일**: `supabase/ad_generation_batches.sql` 삭제 — SQL은 직접 전달. `brand_palette` 컬럼, B안, `p_file_extension`+`p_error`는 사장 직접 실행 완료. 버킷 `ad_image_storage` 생성 확인됨, `app/ad/create/results` 폴더 삭제.
* Remotion 4.0.507: `<OffthreadVideo>` + `colorSpace: 'bt709'`, 저사양 `concurrency: 1`.
