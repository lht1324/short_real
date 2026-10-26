import { sql } from "drizzle-orm";
import {
    bigint,
    boolean,
    integer,
    jsonb,
    numeric,
    pgTable,
    smallint,
    text,
    timestamp,
    unique,
    uniqueIndex,
    uuid,
} from "drizzle-orm/pg-core";
import type { AIModelConfig, ExportPlatform } from "@/lib/api/types/supabase/VideoGenerationTasks";
import type { CaptionConfigState } from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import type { MasterStyleInfo } from "@/lib/api/types/supabase/MasterStyleInfo";
import type { SceneData, MusicData, FinalVideoMergeData } from "@/lib/api/types/supabase/VideoGenerationTasks";
import type { InitialEntityManifestItem } from "@/lib/api/types/open-ai/Entity";
import type { AIModelPrice } from "@/lib/api/types/supabase/AIModelData";

/**
 * Neon 스키마 — `db/neon/01_schema.sql`과 1:1 (DB가 진실, 이 파일은 미러).
 * 스키마 변경은 SQL 파일을 먼저 실행하고 여기를 맞춘다 (drizzle-kit 마이그레이션 안 씀).
 * 키는 DB 컬럼명 그대로(snake_case) — 기존 타입(User·VideoGenerationTask·AutopilotData)과 행 모양 일치용.
 * timestamptz는 mode:'string' — 기존 ISO 문자열 계약 유지 (호출부 수정 없음).
 */

const createdAt = timestamp("created_at", { withTimezone: true, mode: "string" })
    .notNull()
    .defaultNow();

const updatedAt = timestamp("updated_at", { withTimezone: true, mode: "string" });

export const users = pgTable("users", {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    avatar_url: text("avatar_url"),
    plan: text("plan"),
    created_at: createdAt,
    updated_at: updatedAt,
    last_subscribed_at: timestamp("last_subscribed_at", { withTimezone: true, mode: "string" }),
    subscription_id: text("subscription_id"),
    scheduled_downgrade_at: timestamp("scheduled_downgrade_at", { withTimezone: true, mode: "string" }),
    downgrade_target_plan_id: text("downgrade_target_plan_id"),
    preferred_ai_model_config: jsonb("preferred_ai_model_config").$type<AIModelConfig | null>(),
    fal_ai_api_key: text("fal_ai_api_key"),
    replicate_api_key: text("replicate_api_key"),
    credit_count: integer("credit_count"),
    image_limit: integer("image_limit"),
});

export const userYoutubeTokens = pgTable("user_youtube_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    access_token: text("access_token").notNull(),
    refresh_token: text("refresh_token").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    youtube_channel_id: text("youtube_channel_id"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
    last_used_at: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
    handle_name: text("handle_name"),
    display_name: text("display_name"),
    avatar_url: text("avatar_url"),
});

export const userTiktokTokens = pgTable("user_tiktok_tokens", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    access_token: text("access_token").notNull(),
    refresh_token: text("refresh_token").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    tiktok_user_id: text("tiktok_user_id"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }).notNull(),
    last_used_at: timestamp("last_used_at", { withTimezone: true, mode: "string" }).notNull(),
    refresh_expires_at: timestamp("refresh_expires_at", { withTimezone: true, mode: "string" }),
    handle_name: text("handle_name"),
    display_name: text("display_name"),
    avatar_url: text("avatar_url"),
});

export const userInstagramTokens = pgTable("user_instagram_tokens", {
    user_id: uuid("user_id").primaryKey(),
    long_lived_token: text("long_lived_token").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true, mode: "string" }).notNull(),
    instagram_user_id: text("instagram_user_id"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
    last_used_at: timestamp("last_used_at", { withTimezone: true, mode: "string" }),
});

export const videoGenerationTasks = pgTable("video_generation_tasks", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    status: text("status"),
    narration_script: text("narration_script").notNull(),
    scene_breakdown_list: jsonb("scene_breakdown_list").$type<SceneData[]>().notNull(),
    selected_style_id: text("selected_style_id"),
    selected_voice_id: text("selected_voice_id"),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow(),
    master_style_negative_prompt: text("master_style_negative_prompt"),
    master_style_info: jsonb("master_style_info").$type<MasterStyleInfo | null>(),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
    music_data_list: jsonb("music_data_list").$type<MusicData[] | null>(),
    is_user_cancelled_task: boolean("is_user_cancelled_task").notNull().default(false),
    is_generation_failed: boolean("is_generation_failed"),
    final_video_merge_data: jsonb("final_video_merge_data").$type<FinalVideoMergeData | null>(),
    video_title: text("video_title"),
    video_description: text("video_description"),
    entity_manifest_list: jsonb("entity_manifest_list").$type<InitialEntityManifestItem[] | null>(),
    export_status: text("export_status"),
    export_platform: text("export_platform"),
    series_id: uuid("series_id"),
    resolution: text("resolution"),
    aspect_ratio: text("aspect_ratio"),
    ai_model_config: jsonb("ai_model_config").$type<AIModelConfig | null>(),
    estimated_character_count: integer("estimated_character_count"),
});

export const autopilotData = pgTable("autopilot_data", {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").notNull(),
    name: text("name").notNull(),
    is_active: boolean("is_active").notNull(),
    niche_preset_id: text("niche_preset_id"),
    niche_value: text("niche_value").notNull(),
    voice_id: text("voice_id").notNull(),
    platforms: jsonb("platforms").$type<Record<ExportPlatform, boolean | undefined | null>>().notNull(),
    schedule_cron: text("schedule_cron").notNull(),
    last_run_at: timestamp("last_run_at", { withTimezone: true, mode: "string" }),
    created_at: createdAt,
    updated_at: updatedAt,
    topic_history: jsonb("topic_history").$type<string[]>().notNull().$defaultFn(() => []),
    style_id: text("style_id"),
    caption_config: jsonb("caption_config").$type<CaptionConfigState | null>(),
    user_timezone: text("user_timezone").notNull(),
    current_generating_task_id: uuid("current_generating_task_id"),
    tiktok_privacy: text("tiktok_privacy"),
    youtube_token_id: uuid("youtube_token_id").references(() => userYoutubeTokens.id),
    tiktok_token_id: uuid("tiktok_token_id").references(() => userTiktokTokens.id),
    ai_model_config: jsonb("ai_model_config").$type<AIModelConfig | null>(),
    youtube_privacy: text("youtube_privacy"),
    resolution: text("resolution"),
    aspect_ratio: text("aspect_ratio"),
});

export const aiModelData = pgTable("ai_model_data", {
    id: uuid("id").primaryKey().defaultRandom(),
    endpoint_id: text("endpoint_id").notNull(),
    provider: text("provider").notNull(),
    display_name: text("display_name").notNull(),
    description: text("description"),
    category: text("category").notNull(),
    status: text("status").notNull(),
    thumbnail_url: text("thumbnail_url"),
    model_url: text("model_url").notNull(),
    supported_duration_range: numeric("supported_duration_range", { mode: "number" }).array(),
    ai_model_price_list: jsonb("ai_model_price_list").$type<AIModelPrice[]>().notNull().$defaultFn(() => []),
    created_at: createdAt,
    updated_at: updatedAt,
});

export const backgroundMusics = pgTable("background_musics", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    artist: text("artist").notNull(),
    themes: text("themes").array(),
    created_at: timestamp("created_at", { withTimezone: true, mode: "string" }),
    updated_at: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

export const roadmapItems = pgTable("roadmap_items", {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    status: smallint("status").notNull(),
    created_at: createdAt,
    updated_at: updatedAt,
});

export const subscriptionGrants = pgTable(
    "subscription_grants",
    {
        id: bigint("id", { mode: "number" }).primaryKey().generatedByDefaultAsIdentity(),
        user_id: uuid("user_id").notNull(),
        polar_subscription_id: text("polar_subscription_id"),
        cycle_start: timestamp("cycle_start", { withTimezone: true, mode: "string" }).notNull(),
        cycle_end: timestamp("cycle_end", { withTimezone: true, mode: "string" }).notNull(),
        granted: integer("granted").notNull(),
        reason: text("reason").notNull(),
        created_at: createdAt,
    },
    (table) => [
        unique("subscription_grants_sub_cycle_reason_key").on(
            table.polar_subscription_id,
            table.cycle_start,
            table.reason,
        ),
        uniqueIndex("subscription_grants_user_trial_uidx")
            .on(table.user_id)
            .where(sql`reason = 'trial'`),
    ],
);
