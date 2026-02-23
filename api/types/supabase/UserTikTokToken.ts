export interface UserTikTokToken {
    user_id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    tiktok_user_id?: string;
    created_at: string;
    updated_at: string;
    last_used_at?: string;
    refresh_expires_at: string;
}