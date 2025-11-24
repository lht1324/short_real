/**
 * Polar API - POST /v1/checkouts/ 응답 타입
 * checkouts:write 권한 필요
 */

// 청구 주소 타입
interface BillingAddress {
    line1?: string;
    line2?: string;
    postalCode?: string;
    city?: string;
    state?: string;
    country: string;
}

// 청구 주소 필드 요구사항 타입
interface BillingAddressFields {
    country: 'required' | 'optional' | 'disabled';
    state: 'required' | 'optional' | 'disabled';
    city: 'required' | 'optional' | 'disabled';
    postalCode: 'required' | 'optional' | 'disabled';
    line1: 'required' | 'optional' | 'disabled';
    line2: 'required' | 'optional' | 'disabled';
}

// Product Price 타입
interface CheckoutProductPrice {
    id: string;
    createdAt: string;
    modifiedAt: string | null;
    amountType: 'fixed' | 'custom' | 'free' | 'seat_based' | 'metered_unit';
    isArchived: boolean;
    productId: string;
    type: 'one_time' | 'recurring';
    recurringInterval?: 'day' | 'week' | 'month' | 'year';
    priceCurrency?: string;
    priceAmount?: number;
    minimumAmount?: number;
    maximumAmount?: number;
    presetAmount?: number;
}

// Product 타입
interface CheckoutProduct {
    id: string;
    createdAt: string;
    modifiedAt: string | null;
    name: string;
    description: string;
    isRecurring: boolean;
    isArchived: boolean;
    organizationId: string;
    recurringInterval?: 'day' | 'week' | 'month' | 'year';
    trialInterval?: 'day' | 'week' | 'month' | 'year' | null;
    trialIntervalCount?: number | null;
    prices: CheckoutProductPrice[];
    benefits: Array<{
        id: string;
        type: string;
        description: string;
        createdAt: string;
        modifiedAt: string | null;
        deletable: boolean;
        selectable: boolean;
        organizationId: string;
    }>;
    medias: Array<{
        id: string;
        organizationId: string;
        name: string;
        path: string;
        mimeType: string;
        size: number;
        publicUrl: string;
    }>;
}

// Discount 타입
interface CheckoutDiscount {
    id: string;
    name: string;
    code: string;
    duration: 'once' | 'repeating' | 'forever';
    durationInMonths?: number;
    type: 'fixed' | 'percentage';
    amount?: number;
    currency?: string;
    basisPoints?: number;
}

// Checkout 객체
interface Checkout {
    id: string;
    createdAt: string;
    modifiedAt: string;
    paymentProcessor: 'stripe';
    status: 'open' | 'confirmed' | 'failed' | 'expired';
    clientSecret: string;
    url: string;
    expiresAt: string;
    successUrl: string;
    returnUrl?: string;
    embedOrigin?: string | null;

    // 금액 관련
    amount: number;
    discountAmount: number;
    netAmount: number;
    taxAmount: number;
    totalAmount: number;
    currency: string;

    // 체크아웃 설정
    productId: string;
    productPriceId: string;
    discountId?: string;
    allowDiscountCodes: boolean;
    requireBillingAddress: boolean;
    isDiscountApplicable: boolean;
    isFreeProductPrice: boolean;
    isPaymentRequired: boolean;
    isPaymentSetupRequired: boolean;
    isPaymentFormRequired: boolean;

    // 고객 정보
    customerId?: string;
    isBusinessCustomer: boolean;
    customerName?: string;
    customerEmail?: string;
    customerIpAddress?: string;
    customerBillingName?: string;
    customerBillingAddress?: BillingAddress | null;
    customerTaxId?: string;
    customerExternalId?: string;
    externalCustomerId?: string;

    // 메타데이터
    paymentProcessorMetadata: Record<string, unknown>;
    billingAddressFields: BillingAddressFields;
    metadata: Record<string, unknown>;
    customerMetadata?: Record<string, unknown>;

    // Trial 관련
    activeTrialInterval?: 'day' | 'week' | 'month' | 'year';
    activeTrialIntervalCount?: number;
    trialEnd?: string | null;
    trialInterval?: 'day' | 'week' | 'month' | 'year' | null;
    trialIntervalCount?: number;

    // 제품 및 할인 정보
    products: CheckoutProduct[];
    product: CheckoutProduct;
    productPrice: CheckoutProductPrice;
    discount?: CheckoutDiscount | null;
    subscriptionId?: string | null;
    attachedCustomFields?: Array<{
        customFieldId: string;
        customField: {
            id: string;
            type: string;
            slug: string;
            name: string;
            organizationId: string;
            properties: Record<string, unknown>;
        };
        order: number;
        required: boolean;
    }>;
}

export interface PostPolarCheckoutsResponse extends Checkout {}