# 작업 진행 상황 (Last Updated: 2026-07-17 17:31)

## 1. 최근 세션 작업 내용 (Current Session Changes)
* **에러 핸들링 체계 및 엔드포인트 전수 점검 완수**:
    * **[app/api/autopilot/music/route.ts](file:///home/jaeho/Projects/short_real/app/api/autopilot/music/route.ts)**:
        * `try` 블록 내부의 `const taskId` 선언을 외부 스코프로 이관하여 `catch` 스코프 내 `patchVideoGenerationTaskFailed(taskId)`가 ReferenceError 없이 안전하게 호출되도록 수정했습니다.
        * `try` 내부 비즈니스 로직(500) 실패 조건을 `throw new Error` 구조로 변경하여 중앙 집중형 예외 처리 흐름을 완성했습니다.
    * **[app/api/music/upload/route.ts](file:///home/jaeho/Projects/short_real/app/api/music/upload/route.ts)**:
        * 실물 데이터 Body parsing은 `try` 블록 내에 유지하되, 내부의 에러 삼킴(swallowing) 현상을 걷어내고 에러 발생 시 `throw`를 던지게 해 `catch` 블록에서 `patchVideoGenerationTaskFailed(taskId)`가 올바르게 작동하도록 복구했습니다.
    * **[app/api/video/process/image/route.ts](file:///home/jaeho/Projects/short_real/app/api/video/process/image/route.ts)**, **[app/webhook/replicate/music/modifying/route.ts](file:///home/jaeho/Projects/short_real/app/webhook/replicate/music/modifying/route.ts)**, **[app/webhook/replicate/video/merge/music/route.ts](file:///home/jaeho/Projects/short_real/app/webhook/replicate/video/merge/music/route.ts)**:
        * `catch` 블록 혹은 실패 처리 분기 내에서 태스크 실패 처리(`patchVideoGenerationTaskFailed`)가 누락되어 시스템이 무한 로딩 대기 상태에 빠질 수 있던 리스크들을 일괄 색출하고 보완했습니다.
* **신규 Fal-AI 모델 매핑 뼈대(Skeleton) 구축**:
    * **[lib/falAIInputMapper.ts](file:///home/jaeho/Projects/short_real/lib/falAIInputMapper.ts)**:
        * `ai_model_data_rows.csv`에 등록된 24개의 신규 활성 이미지/비디오 모델들을 `FalAIEndpointID` enum에 모두 정의했습니다.
        * 사장님이 직접 세부적인 파라미터 매핑을 하실 수 있도록, `buildImageInput`과 `buildVideoInput` 스위치 문 내에 줄바꿈이 적용된 빈 객체 리턴 케이스(`: return { \n\n };`) 형태의 뼈대(와꾸)를 순서대로 완벽하게 구성해 두었습니다.
* **Supabase Storage 용량 문제 원인 진단**:
    * 비디오 최종 머지 시 `The object exceeded the maximum allowed size` 에러는 Supabase Storage의 `processed_video_storage` 버킷 용량 제한(Max file size) 설정이 원인임을 파악하여, Supabase Dashboard 상에서 설정 값을 늘려 해결하는 가이드를 제공했습니다.

## 2. 향후 작업 (Next Steps) - [Priority: HIGH]
1. **[검증] 요금제 개편 후 결제 완료 및 오토파일럿 설정 플로우 최종 실기기 테스트**:
    * 갱신된 Polar 상품 결제 완료 다이얼로그 디자인이 실기기 모바일 및 좁은 화면에서 예쁘게 연출되는지 사장님 컨펌 하에 최종 확인.
2. **[기능] BYOK 공급처에 Replicate 추가 연동**:
    * 현재 fal.ai 위주로 연동되어 있는 BYOK 시스템에 사용자 본인의 Replicate API Key를 연동하고, Replicate 호스팅 모델들을 영상 생성 파이프라인에서 직접 선택 및 원가 과금으로 구동할 수 있도록 기능 설계 및 UI 반영.
