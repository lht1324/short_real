/* GetCheckoutsResponse.ts
 * Polar “Get Checkouts” API 응답 모델
 * ------------------------------------------------------------ */

export interface GetCheckoutsResponse {
    created_at: string;
    modified_at: string;
    id: string;
    custom_field_data: Record<string, unknown>;
    payment_processor: "stripe" | string;
    status: "open" | "paid" | "expired" | "cancelled" | string;
    client_secret: string;
    url: string;
    expires_at: string;
    success_url: string;
    embed_origin: string;

    /* 금액 관련 */
    amount: number;
    discount_amount: number;
    net_amount: number;
    tax_amount: number;
    total_amount: number;
    currency: string;

    /* 연관 ID */
    product_id: string;
    product_price_id: string;
    discount_id: string;

    /* 플래그 */
    allow_discount_codes: boolean;
    require_billing_address: boolean;
    is_discount_applicable: boolean;
    is_free_product_price: boolean;
    is_payment_required: boolean;
    is_payment_setup_required: boolean;
    is_payment_form_required: boolean;

    /* 고객 */
    customer_id: string;
    is_business_customer: boolean;
    customer_name: string;
    customer_email: string;
    customer_ip_address: string;
    customer_billing_name: string;
    customer_billing_address: CustomerBillingAddress;
    customer_tax_id: string;

    /* 메타데이터·설정 */
    payment_processor_metadata: Record<string, unknown>;
    billing_address_fields: BillingAddressFields;
    metadata: Record<string, unknown>;
    external_customer_id: string;
    customer_external_id: string;

    /* 주요 객체 */
    products: Product[];
    product: Product;            // 단일 product 상세
    product_price: ProductPrice;
    discount: Discount | null;
    subscription_id: string | null;
    attached_custom_fields: AttachedCustomField[];
    customer_metadata: Record<string, unknown>;
}

/* ------------------------------------------------------------ */
/* 하위 타입들                                                    */
/* ------------------------------------------------------------ */

export interface CustomerBillingAddress {
    line1: string;
    line2: string;
    postal_code: string;
    city: string;
    state: string;
    country: string;   // ISO-3166 alpha-2
}

export interface BillingAddressFields {
    country: AddressFieldMode;
    state: AddressFieldMode;
    city: AddressFieldMode;
    postal_code: AddressFieldMode;
    line1: AddressFieldMode;
    line2: AddressFieldMode;
}
export type AddressFieldMode = "required" | "optional" | "hidden";

export interface Product {
    created_at: string;
    modified_at: string;
    id: string;
    name: string;
    description: string;
    recurring_interval: "day" | "week" | "month" | "year" | null;
    is_recurring: boolean;
    is_archived: boolean;
    organization_id: string;

    prices: ProductPrice[];
    benefits: Benefit[];
    medias: Media[];
}

export interface ProductPrice {
    created_at: string;
    modified_at: string;
    id: string;
    amount_type: string;          // e.g. "fixed"
    is_archived: boolean;
    product_id: string;
    type: string;                 // e.g. "one_time" | "recurring"
    recurring_interval: "day" | "week" | "month" | "year" | null;
    price_currency: string;       // ISO-4217
    price_amount: number;         // 정수(최소 통화단위)
    legacy: boolean;
}

export interface Benefit {
    id: string;
    created_at: string;
    modified_at: string;
    type: "custom" | string;
    description: string;
    selectable: boolean;
    deletable: boolean;
    organization_id: string;
}

export interface Media {
    id: string;
    organization_id: string;
    name: string;
    path: string;
    mime_type: string;
    size: number;
    storage_version: string | null;
    checksum_etag: string | null;
    checksum_sha256_base64: string | null;
    checksum_sha256_hex: string | null;
    last_modified_at: string;
    version: string | null;
    service: string;          // e.g. "s3"
    is_uploaded: boolean;
    created_at: string;

    /* 편의 필드 */
    size_readable: string;    // "12 MB" 같은 휴먼리더블
    public_url: string | null;
}

export interface Discount {
    duration: "once" | "repeating" | "forever" | string;
    type: "fixed" | "percentage" | string;
    amount: number;           // 최소 통화단위
    currency: string;         // ISO-4217
    id: string;
    name: string;
    code: string;
}

export interface AttachedCustomField {
    custom_field_id: string;
    custom_field: CustomField;
    order: number;
    required: boolean;
}

export interface CustomField {
    created_at: string;
    modified_at: string;
    id: string;
    metadata: Record<string, unknown>;
    type: string;
    slug: string;
    name: string;
    organization_id: string;
    properties: CustomFieldProperties;
}

export interface CustomFieldProperties {
    form_label: string;
    form_help_text: string;
    form_placeholder: string;
    textarea: boolean;
    min_length: number | null;
    max_length: number | null;
}
