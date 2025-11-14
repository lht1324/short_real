/**
 * Pricing 페이지에서 사용할 제품 데이터
 * Polar API 응답을 클라이언트 친화적으로 매핑한 타입
 */

// 제품 데이터
export interface ProductData {
    id: string;
    name: string;
    price: number;
    currency: string;
    interval: "month" | "year";
    description: string;
    benefits: string[];
    isPopular: boolean;
    videosPerDay: number;
}