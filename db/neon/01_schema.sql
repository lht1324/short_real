-- 01_schema.sql — Neon development 브랜치 SQL Editor에서 전체 실행.
-- Supabase public 스키마 미러. ShortReal DB 이전용 (ShortReal-ad).
-- RLS 없음 — 인가는 API 게이트(service role)에서 처리 (TailoredAd와 동일).
-- jsonb 컬럼은 Supabase와 동일한 nullable/NOT NULL 제약 유지.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- users
-- ============================================================
CREATE TABLE public.users (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    email text NOT NULL,
    name text NOT NULL,
    avatar_url text,
    plan text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    last_subscribed_at timestamp with time zone,
    subscription_id text,
    scheduled_downgrade_at timestamp with time zone,
    downgrade_target_plan_id text,
    preferred_ai_model_config jsonb,
    fal_ai_api_key text,
    replicate_api_key text,
    credit_count integer,
    image_limit integer,
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- ============================================================
-- video_generation_tasks
-- ============================================================
CREATE TABLE public.video_generation_tasks (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    status character varying(50),
    narration_script text NOT NULL,
    scene_breakdown_list jsonb NOT NULL,
    selected_style_id character varying(100),
    selected_voice_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    master_style_negative_prompt text,
    master_style_info jsonb,
    updated_at timestamp with time zone,
    music_data_list jsonb,
    is_user_cancelled_task boolean NOT NULL DEFAULT false,
    is_generation_failed boolean,
    final_video_merge_data jsonb,
    video_title text,
    video_description text,
    entity_manifest_list jsonb,
    export_status text,
    export_platform text,
    series_id uuid,
    resolution text,
    aspect_ratio text,
    ai_model_config jsonb,
    estimated_character_count integer,
    CONSTRAINT video_generation_tasks_pkey PRIMARY KEY (id)
);

-- ============================================================
-- autopilot_data
-- ============================================================
CREATE TABLE public.autopilot_data (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean NOT NULL,
    niche_preset_id text,
    niche_value text NOT NULL,
    voice_id text NOT NULL,
    platforms jsonb NOT NULL,
    schedule_cron text NOT NULL,
    last_run_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    topic_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    style_id text,
    caption_config jsonb,
    user_timezone text NOT NULL,
    current_generating_task_id uuid,
    tiktok_privacy text,
    youtube_token_id uuid,
    tiktok_token_id uuid,
    ai_model_config jsonb,
    youtube_privacy text,
    resolution text,
    aspect_ratio text,
    CONSTRAINT autopilot_data_pkey PRIMARY KEY (id),
    CONSTRAINT autopilot_data_youtube_token_fk FOREIGN KEY (youtube_token_id)
        REFERENCES public.user_youtube_tokens (id),
    CONSTRAINT autopilot_data_tiktok_token_fk FOREIGN KEY (tiktok_token_id)
        REFERENCES public.user_tiktok_tokens (id)
);

-- ============================================================
-- ai_model_data
-- ============================================================
CREATE TABLE public.ai_model_data (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    endpoint_id text NOT NULL,
    provider text NOT NULL,
    display_name text NOT NULL,
    description text,
    category text NOT NULL,
    status text NOT NULL,
    thumbnail_url text,
    model_url text NOT NULL,
    supported_duration_range numeric[],
    ai_model_price_list jsonb NOT NULL DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT ai_model_data_pkey PRIMARY KEY (id)
);

-- ============================================================
-- user_youtube_tokens
-- ============================================================
CREATE TABLE public.user_youtube_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    youtube_channel_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_used_at timestamp with time zone,
    handle_name text,
    display_name text,
    avatar_url text,
    CONSTRAINT user_youtube_tokens_pkey PRIMARY KEY (id)
);

-- ============================================================
-- user_tiktok_tokens
-- ============================================================
CREATE TABLE public.user_tiktok_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    access_token text NOT NULL,
    refresh_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    tiktok_user_id text,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    last_used_at timestamp with time zone NOT NULL,
    refresh_expires_at timestamp with time zone,
    handle_name text,
    display_name text,
    avatar_url text,
    CONSTRAINT user_tiktok_tokens_pkey PRIMARY KEY (id)
);

-- ============================================================
-- user_instagram_tokens
-- ============================================================
CREATE TABLE public.user_instagram_tokens (
    user_id uuid NOT NULL,
    long_lived_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    instagram_user_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    last_used_at timestamp with time zone,
    CONSTRAINT user_instagram_tokens_pkey PRIMARY KEY (user_id)
);

-- ============================================================
-- background_musics
-- ============================================================
CREATE TABLE public.background_musics (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title character varying NOT NULL,
    artist character varying NOT NULL,
    themes text[],
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT background_musics_pkey PRIMARY KEY (id)
);

-- ============================================================
-- roadmap_items
-- ============================================================
CREATE TABLE public.roadmap_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    title text NOT NULL,
    description text NOT NULL,
    status smallint NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT roadmap_items_pkey PRIMARY KEY (id)
);

-- ============================================================
-- subscription_grants  (ShortReal: Polar 과금이지만 구조는 유지 — 필요 시 사용)
-- ============================================================
CREATE TABLE public.subscription_grants (
    id bigint NOT NULL GENERATED BY DEFAULT AS IDENTITY,
    user_id uuid NOT NULL,
    polar_subscription_id text,
    cycle_start timestamp with time zone NOT NULL,
    cycle_end timestamp with time zone NOT NULL,
    granted integer NOT NULL,
    reason text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT subscription_grants_pkey PRIMARY KEY (id),
    CONSTRAINT subscription_grants_sub_cycle_reason_key UNIQUE (polar_subscription_id, cycle_start, reason)
);

CREATE UNIQUE INDEX subscription_grants_user_trial_uidx
    ON public.subscription_grants USING btree (user_id)
    WHERE (reason = 'trial'::text);
