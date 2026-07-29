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
    ai_model_price_list: AIModelPrice[]; // compute second처럼 초당 가격으로 환산 불가능할 경우 빈 배열
    created_at?: string;
    updated_at?: string;
}

export interface PriceByResolution {
    resolution: '720p' | '1080p' | '2160p';
    price_per_sec: number; // USD
}

export interface AIModelPrice {
    unit: AIModelPriceUnit;
    price_per_unit: number; // USD
}

export enum AIModelPriceUnit {
    VIDEO_720P = 'video_720p',
    VIDEO_1080P = 'video_1080p',
    VIDEO_2160P = 'video_2160p',
    IMAGE_720P = 'image_720p',
    IMAGE_1080P = 'image_1080p',
    IMAGE_2160P = 'image_2160p',
    INPUT_IMAGE = 'input_image',
    INPUT_IMAGE_ABOVE_1 = 'input_image_above_1',
}