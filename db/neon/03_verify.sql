-- 03_verify.sql — 01, 02 실행 후 development 브랜치에서 실행. 결과 복사해서 전달.
-- 테이블 존재 + 함수 존재 확인용. 건수는 데이터 이전 후 대조.

SELECT 'users' AS tbl, count(*) AS cnt FROM public.users
UNION ALL SELECT 'video_generation_tasks', count(*) FROM public.video_generation_tasks
UNION ALL SELECT 'autopilot_data', count(*) FROM public.autopilot_data
UNION ALL SELECT 'ai_model_data', count(*) FROM public.ai_model_data
UNION ALL SELECT 'user_youtube_tokens', count(*) FROM public.user_youtube_tokens
UNION ALL SELECT 'user_tiktok_tokens', count(*) FROM public.user_tiktok_tokens
UNION ALL SELECT 'user_instagram_tokens', count(*) FROM public.user_instagram_tokens
UNION ALL SELECT 'background_musics', count(*) FROM public.background_musics
UNION ALL SELECT 'roadmap_items', count(*) FROM public.roadmap_items
UNION ALL SELECT 'subscription_grants', count(*) FROM public.subscription_grants;

SELECT proname, pg_get_function_identity_arguments(oid) AS args
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN (
      'increment_user_credit',
      'update_scene_request_id'
  )
ORDER BY proname;
