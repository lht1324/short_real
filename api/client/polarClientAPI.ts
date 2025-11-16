import { ProductData } from "@/api/types/api/polar/products/ProductData";
import { getFetch, postFetch } from "@/api/client/baseFetch";

export const polarClientAPI = {
    async getPolarProducts(): Promise<ProductData[] | null> {
        try {
            const response = await getFetch("/api/polar/products");
            const getPolarProductsResult = await response.json();

            if (!getPolarProductsResult.success && !getPolarProductsResult.data?.productList) {
                throw Error(getPolarProductsResult.error ?? "Unknown error occurred while fetching product data.")
            }

            return getPolarProductsResult.data.productList;
        } catch (error) {
            console.error("Error fetching Polar products:", error);
            return null;
        }
    },

    async postPolarCheckouts(
        productId: string,
        userId: string,
        customerEmail?: string,
        customerName?: string,
    ): Promise<string | null> {
        try {
            const response = await postFetch("/api/polar/checkouts", {
                productId: productId,
                userId: userId,
                customerEmail: customerEmail,
                customerName: customerName,
            });
            const result = await response.json();

            if (!result.success || !result.data?.checkoutUrl) {
                throw Error(result.error ?? "Unknown error occurred while creating checkout session.")
            }

            return result.data.checkoutUrl;
        } catch (error) {
            console.error("Error creating Polar checkout:", error);
            return null;
        }
    }
}