export interface UserTikTokToken {
    id: string;
    user_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    tiktok_user_id?: string;
    handle_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    series_id?: string | null;
    created_at: string;
    updated_at: string;
    last_used_at?: string | null;
    refresh_expires_at: string;
}