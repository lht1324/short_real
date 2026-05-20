export interface AIModelData {
    id?: string; // UUID, auto
    endpoint_id: string;
    provider: string;
    display_name: string;
    description: string;
    category: string;
    status: string;
    thumbnail_url: string;
    model_url: string;
    supported_duration_range?: number[];
    price_per_sec: PriceByResolution[]; // compute second처럼 초당 가격으로 환산 불가능할 경우 빈 배열
    is_valuable: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PriceByResolution {
    resolution: '720p' | '1080p';
    price_per_sec: number; // USD
}