export interface UserYoutubeToken {
    id: string;
    user_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    youtube_channel_id?: string;
    handle_name?: string | null;
    display_name?: string | null;
    avatar_url?: string | null;
    created_at: string;
    updated_at: string;
    last_used_at?: string | null;
}