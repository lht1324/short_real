# 작업 진행 상황 (Last Updated: 2026-08-03 03:10)

## 1. 현재 상황 (Current Status)
* **Hellyeah Google Ads 캠페인 런칭 완료**:
    * 'WILL YOU WATCH THAT?' 우주비행사 소재 기반 Performance Max ($100/7일) 광고 런칭 및 구글 심사 대기 중 (`PENDING`).
    * Hellyeah X-Ray 트래커 수신 대기 및 실서버 배포 완료.
* **접근 제어 미들웨어 및 Auth UI / 로고 레이아웃 정제 완료**:
    * `proxy.ts` 미구독자/비로그인 유저 `/workspace` 접근 차단 및 `/profile` 리다이렉트 구현.
    * 구글 & 깃허브 공식 브랜딩 가이드라인 준수 1:1 통일 소셜 로그인 버튼 리팩토링.
    * 헤더 로고 40px 쌍둥이 컨테이너 수직 중앙 정렬 (`Header.tsx`) 구현.

---

## 2. 세션 진행 작업 (Work Accomplished in Current Session)
1. **Hellyeah Google Ads 캠페인 런칭 가이드 및 세팅 검수**:
    * Performance Max (영미권 1티어 6개국, 18-54세, 우주비행사 'WILL YOU WATCH THAT?' 이미지 소재, $100/7일) 최종 검수 및 런칭.
2. **`proxy.ts` 미들웨어 접근 제어 강화**:
    * `/workspace/:path*` 매처 추가. 비로그인 유저 `/sign-in` 이동, 미구독 유저 (`!plan` 또는 `plan === 'none'`) `/profile` 이동.
3. **구글 & 깃허브 로그인 버튼 가이드라인 통일 및 UI 튜닝**:
    * `GoogleSignInButton.tsx` & `DefaultSignInButton.tsx`: `text-sm/20` 높이 찌그러짐 버그 수정, 44px (`h-11`), `rounded-xl`, `#F2F2F2` (hover `#E3E3E3`) 통일.
    * 광학 텍스트 중앙 정렬: 아이콘 `absolute left-4`, 텍스트 수학적 정중앙 배치.
4. **헤더 로고 수직 정렬 정제 (`Header.tsx`)**:
    * `<Link href="/">` 구조 전환.
    * 40px 로고 상자 + 40px 텍스트 상자 쌍둥이 컨테이너 (`h-10 flex items-center`) 래핑으로 로고 이미지와 `ShortReal AI` 텍스트 수직 중앙 정렬 일치.

---

## 3. 향후 작업 (Next Steps)

### Task 4: [백엔드/파이프라인] 정규 생성 실패 건 선택적 재생성 (Selective Retry) 및 상태 동기화 체계 구축
1. **배경 및 필요성**:
    * 외부 AI API(Fal AI 등)의 일시적 서버 오류, 네트워크 타임아웃 등으로 인해 전체 10개 씬 중 특정 1~2개 씬만 생성 실패(`status: FAILED`)하는 경우 발생.
    * 전체 재요청 없이 실패한 씬만 선택적으로 재요청(Selective Retry)하는 파이프라인 필터링 및 대시보드 연동 필요.
2. **구체적 구현 내용**:
    * **[에디터 UI]**: `status === FAILED`인 씬 카드에 **[Retry Scene / 씬 재시도]** 전용 버튼 및 실패 원인 툴팁 표시.
    * **[백엔드 파이프라인]**: 실패한 씬 번호 목록(예: `failedSceneNumbers: [3, 5]`)만 전달받아 해당 씬들만 핀포인트로 백그라운드 재요청을 수행하고 성공한 기존 씬은 유지하며 DB `scene_breakdown_list`에 병합 패치.