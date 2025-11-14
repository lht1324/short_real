import { ProductData } from "@/api/types/api/polar/products/ProductData";
import { getFetch } from "@/api/client/baseFetch";

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

    async postPolarCheckouts() {

    }
}