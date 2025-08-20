export enum ProductName {
    Single = "Single",
    BestValue = "BestValue",
    PowerUser = "PowerUser",
}

export interface CreditProduct {
    id: string;
    priceId: string;
    name: string; // "Single", "Best Value", "Power User"
    credits: number; // 1, 5, 15
    price: number; // cents: 290, 1190, 2990
    displayPrice: string; // "$2.9", "$11.9", "$29.9"
    isPopular: boolean;
    isHighest: boolean;
    discountPercent?: number; // 18, 31
    pricePerCredit: string; // "$2.90", "$2.38", "$1.99"
    features: {
        title: string;
        description: string;
    }[];
}