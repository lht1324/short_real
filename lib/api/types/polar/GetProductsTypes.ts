export interface GetProductsResponse {
    items: ProductItem[];
    pagination: Pagination;
}

/** /v1/products 응답의 items 요소 */
export interface ProductItem {
    id: string;
    name: string;
    description: string;
    organization_id: string;

    /* 날짜/상태 */
    created_at: string;          // ISO-8601
    modified_at: string;         // ISO-8601
    is_recurring: boolean;
    is_archived: boolean;
    recurring_interval: string | null;

    /* 부가 데이터 */
    metadata: Record<string, unknown>;
    prices: ProductPrice[];
    benefits: unknown[];          // 상세 구조가 없으므로 any 배열
    medias: unknown[];
    attached_custom_fields: unknown[];
}

export interface ProductPrice {
    /** fixed | custom */
    amount_type: 'fixed' | 'custom';
    /** one_time | subscription(예상) */
    type: 'one_time' | 'subscription';
    /** ISO 통화 코드, 예: 'usd' */
    price_currency: string;

    /* 금액 필드 */
    price_amount?: number;     // amount_type: 'fixed' 일 때
    minimum_amount?: number;   // amount_type: 'custom' 일 때
    maximum_amount?: number | null;
    preset_amount?: number | null;

    /* 메타 */
    id: string;
    created_at: string;        // ISO-8601
    modified_at: string;
    product_id: string;
    recurring_interval: string | null;
    is_archived: boolean;
}

export interface Pagination {
    total_count: number,
    max_page: number
}