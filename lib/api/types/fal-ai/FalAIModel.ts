export interface RawFalAIModel {
    endpoint_id: string;
    metadata?: FalAIMetadata;
    openapi?: OpenAPIObject;
}

export interface FalAIMetadata {
    display_name?: string;
    description?: string;
    category?: string;
    status?: string;
    thumbnail_url?: string;
    model_url?: string;
    license_type?: string;
    date?: string;
    [key: string]: unknown; // 추가적인 메타데이터 허용
}

export interface FlattenedFalAIModel extends FalAIMetadata {
    endpoint_id: string;
    openapi?: OpenAPIObject;
}

export interface OpenAPIObject {
    components?: {
        schemas?: Record<string, OpenAPISchema>;
    }
}

export interface OpenAPISchema {
    properties?: Record<string, OpenAPIProperty | unknown>;
    'x-fal-order-properties'?: string[];
    [key: string]: unknown;
}

export interface OpenAPIProperty {
    enum?: string[];
    description?: string;
    title?: string;
    type?: string;
    anyOf?: unknown[];
    [key: string]: unknown;
}