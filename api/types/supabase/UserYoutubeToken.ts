export interface UserYoutubeToken {
    user_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    youtube_channel_id?: string;
    created_at: string;
    updated_at: string;
    last_used_at?: string;
}