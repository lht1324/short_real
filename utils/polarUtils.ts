import {Product} from "@polar-sh/sdk/dist/commonjs/models/components/product";
import {ProductData} from "@/api/types/api/polar/products/ProductData";
import {SubscriptionPlan} from "@/api/types/supabase/Users";

export function processProducts(items: Product[]): ProductData[] {
    return items.filter((product: Product) => {
        return product.recurringInterval === "month" || product.recurringInterval === "year";
    }).map((product: Product) => {
        const firstPrice = product.prices[0];
        let price = 0;
        let currency = "USD";

        if (firstPrice) {
            if ('priceAmount' in firstPrice) {
                price = firstPrice.priceAmount;
            }
            if ('priceCurrency' in firstPrice) {
                currency = firstPrice.priceCurrency;
            }
        }

        const benefits: string[] = JSON.parse(product.metadata.benefits.toString());
        const planData: { creditCount: number, planId: SubscriptionPlan } = JSON.parse(product.metadata.planData.toString());
        const isPopular = product.metadata?.isPopular === true || product.metadata?.isPopular === "true";
        const videosPerDay = typeof product.metadata?.videosPerDay === "number"
            ? product.metadata.videosPerDay
            : parseInt(product.metadata?.videosPerDay as string) || 0;

        return {
            id: product.id,
            name: product.name,
            price: price,
            currency: currency,
            interval: product.recurringInterval as "month" | "year",
            description: product.description ?? "",
            benefits: benefits,
            planData: planData,
            isPopular: isPopular,
            videosPerDay: videosPerDay,
        } satisfies ProductData;
    });
}