export interface PostCheckoutResponse {
    /** ISO-8601 timestamps */
    created_at: string;
    modified_at: string | null;

    /** Identifiers */
    id: string;
    product_id: string;
    product_price_id: string;
    discount_id: string | null;
    subscription_id: string | null;

    /** Payment/session */
    payment_processor: "stripe" | string;
    status: "open" | "paid" | "closed" | string;
    client_secret: string;
    url: string;
    success_url: string;
    embed_origin: string | null;
    expires_at: string;

    /** Money (cents / lowest currency unit) */
    amount: number;
    subtotal_amount: number;
    discount_amount: number;
    net_amount: number;
    total_amount: number;
    tax_amount: number | null;
    currency: string;

    /** Behaviour flags */
    allow_discount_codes: boolean;
    require_billing_address: boolean;
    is_discount_applicable: boolean;
    is_free_product_price: boolean;
    is_payment_required: boolean;
    is_payment_setup_required: boolean;
    is_payment_form_required: boolean;

    /** Customer data */
    customer_id: string | null;
    is_business_customer: boolean;
    customer_name: string | null;
    customer_email: string | null;
    customer_ip_address: string | null;
    customer_billing_name: string | null;
    customer_billing_address: Address | null;
    customer_tax_id: string | null;

    /** Misc. metadata */
    custom_field_data: Record<string, unknown>;
    metadata: Record<string, unknown>;
    customer_metadata: Record<string, unknown>;
    external_customer_id: string | null;
    customer_external_id: string | null;

    /** Support objects */
    payment_processor_metadata: PaymentProcessorMetadata;
    customer_billing_address_fields: CustomerBillingAddressFields;

    /** Products */
    products: Product[];
    product: Product;          // the primary one
    product_price: Price;      // convenience mirror of the selected price

    /** Extensions */
    discount: unknown | null;
    attached_custom_fields: unknown[];
}

export interface PaymentProcessorMetadata {
    publishable_key: string;
}

export interface CustomerBillingAddressFields {
    country: boolean;
    state: boolean;
    city: boolean;
    postal_code: boolean;
    line1: boolean;
    line2: boolean;
}

export interface Address {
    /** Define only what your app needs. */
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    [key: string]: unknown;
}

/** Product & price definitions */

export interface Product {
    created_at: string;
    modified_at: string;
    id: string;

    name: string;
    description: string;

    recurring_interval: string | null; // e.g. "month"
    is_recurring: boolean;
    is_archived: boolean;

    organization_id: string;

    prices: Price[];
    benefits: unknown[];
    medias: unknown[];
}

export interface Price {
    created_at: string;
    modified_at: string;
    id: string;

    amount_type: "custom" | "fixed" | string;
    type: "one_time" | "recurring" | string;

    product_id: string;
    recurring_interval: string | null; // e.g. "month"
    price_currency: string;

    minimum_amount: number;
    maximum_amount: number | null;
    preset_amount: number;

    is_archived: boolean;
}
