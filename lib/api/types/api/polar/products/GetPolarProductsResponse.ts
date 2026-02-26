/**
 * Polar API - GET /v1/products/ 응답 타입
 * products:read 권한 필요
 */

// Product의 가격 타입
interface ProductPrice {
    id: string;
    createdAt: string;
    modifiedAt: string | null;
    isArchived: boolean;
    productId: string;
    priceCurrency: string;
    priceAmount: number;
    type: 'one_time' | 'recurring';
    recurringInterval?: 'month' | 'year';
    amountType: 'fixed' | 'custom' | 'free';
}

// Product의 혜택 타입
interface ProductBenefit {
    id: string;
    type: string;
    description: string;
    createdAt: string;
    modifiedAt: string | null;
    deletable: boolean;
    selectable: boolean;
    organizationId: string;
}

// Product의 미디어 타입
interface ProductMedia {
    id: string;
    organizationId: string;
    name: string;
    path: string;
    mimeType: string;
    size: number;
    storageVersion: string | null;
    checksumEtag: string | null;
    checksumSha256Base64: string | null;
    checksumSha256Hex: string | null;
    lastModifiedAt: string;
    version: string | null;
    service: string;
    isUploaded: boolean;
    createdAt: string;
    sizeReadable: string;
    publicUrl: string;
}

// Product 타입
interface Product {
    id: string;
    createdAt: string;
    modifiedAt: string | null;
    name: string;
    description: string;
    isRecurring: boolean;
    isArchived: boolean;
    organizationId: string;
    prices: ProductPrice[];
    benefits: ProductBenefit[];
    medias: ProductMedia[];
    metadata?: Record<string, unknown>;
}

// Pagination 타입
interface Pagination {
    totalCount: number;
    maxPage: number;
}

export interface GetPolarProductsResponse {
    items: Product[];
    pagination: Pagination;
}