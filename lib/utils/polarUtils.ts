import {Product} from "@polar-sh/sdk/models/components/product";
import {ProductData} from "@/lib/api/types/api/polar/products/ProductData";
import {SubscriptionPlan} from "@/lib/api/types/supabase/Users";

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

        console.log(`product[${product.name}]`)

        const planId: string = product.metadata.planId.toString();
        const isPopular = product.metadata?.isPopular === true || product.metadata?.isPopular === "true";

        return {
            id: product.id,
            name: product.name,
            price: price,
            currency: currency,
            interval: product.recurringInterval as "month" | "year",
            description: product.description ?? "",
            planId: planId,
            isPopular: isPopular,
        } satisfies ProductData;
    });
}