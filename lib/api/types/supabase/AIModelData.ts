export interface AIModelData {
    id: string; // UUID, auto
    endpoint_id: string;
    provider: string;
    display_name: string;
    description: string;
    category: string;
    status: string;
    thumbnail_url: string;
    model_url: string;
    created_at?: string;
    updated_at?: string;
}
