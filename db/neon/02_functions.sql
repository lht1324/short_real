-- 02_functions.sql — 01_schema.sql 실행 후 development/production 브랜치에서 실행.
-- RPC 3종 (Supabase에서 pg_get_functiondef로 추출).

CREATE OR REPLACE FUNCTION public.increment_user_credit(user_id uuid, credit_delta integer)
 RETURNS TABLE(id uuid, email text, name text, avatar_url text, credit_count integer, plan text, created_at timestamp with time zone, updated_at timestamp with time zone, subscription_id text, last_subscribed_at timestamp with time zone, scheduled_downgrade_at timestamp with time zone, downgrade_target_plan_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
  BEGIN
      RETURN QUERY
      UPDATE users
      SET
          credit_count = COALESCE(users.credit_count, 0) + credit_delta,
          updated_at = NOW()
      WHERE users.id = user_id
      RETURNING
          users.id,
          users.email,
          users.name,
          users.avatar_url,
          users.credit_count,
          users.plan,
          users.created_at,
          users.updated_at,
          users.subscription_id,
          users.last_subscribed_at,
          users.scheduled_downgrade_at,
          users.downgrade_target_plan_id;
  END;
  $function$;

CREATE OR REPLACE FUNCTION public.update_scene_request_id(target_task_id uuid, target_scene_number integer, new_request_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  arr_index INT;
BEGIN
  SELECT (idx - 1) INTO arr_index
  FROM video_generation_tasks,
       jsonb_array_elements(scene_breakdown_list) WITH ORDINALITY AS t(elem, idx)
  WHERE id = target_task_id AND (elem->>'sceneNumber')::int = target_scene_number;

  IF arr_index IS NOT NULL THEN
    UPDATE video_generation_tasks
    SET scene_breakdown_list = jsonb_set(
      scene_breakdown_list,
      ARRAY[arr_index::text],
      (scene_breakdown_list->arr_index) || jsonb_build_object('requestId', new_request_id, 'status', 'IN_PROGRESS')
    )
    WHERE id = target_task_id;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.increment_and_get_scene_count(task_id uuid, target_request_id text, new_status text DEFAULT 'completed'::text)
 RETURNS json
 LANGUAGE plpgsql
AS $function$DECLARE
    updated_list JSONB;
    p_count INT;
    t_count INT;
BEGIN
    -- 1. 씬 breakdown list 내 해당 requestId 씬의 status를 new_status('completed')로 업데이트
    UPDATE public.video_generation_tasks
    SET
        scene_breakdown_list = (
            SELECT jsonb_agg(
                CASE
                    WHEN (elem->>'requestId') = target_request_id THEN elem || jsonb_build_object('status', new_status)
                    ELSE elem
                END
            )
            FROM jsonb_array_elements(scene_breakdown_list) AS elem
        )
    WHERE id = task_id
    RETURNING scene_breakdown_list INTO updated_list;

    -- 2. 실제 리스트 내 'completed' 상태인 씬 개수 및 전체 씬 개수 정밀 계산 (재시도 시 카운트 꼬임 0%)
    SELECT
        (SELECT count(*)::int FROM jsonb_array_elements(updated_list) WHERE LOWER(value->>'status') = LOWER(new_status)),
        (SELECT jsonb_array_length(updated_list))
    INTO p_count, t_count;

    -- 3. 기존 리턴 형식 유지
    RETURN json_build_object('processed_count', p_count, 'total_count', t_count);
END;$function$;
