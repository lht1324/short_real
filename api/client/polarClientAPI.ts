import { ProductData } from "@/api/types/api/polar/products/ProductData";
import { getFetch, postFetch } from "@/api/client/baseFetch";
import {OrderData} from "@/api/types/api/polar/orders/GetPolarOrdersResponse";
import {SubscriptionData} from "@/api/types/api/polar/subscriptions/SubscriptionData";

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
    },

    async getPolarOrders(userEmail: string): Promise<OrderData[] | null> {
        try {
            const response = await getFetch(`/api/polar/orders?email=${userEmail}`);
            const getPolarOrdersResult = await response.json();

            if (!getPolarOrdersResult.success && !getPolarOrdersResult.data?.orderList) {
                throw Error(getPolarOrdersResult.error ?? "Unknown error occurred while fetching order data.");
            }

            return getPolarOrdersResult.data.orderList;
        } catch (error) {
            console.error("Error fetching Polar orders:", error);
            return null;
        }
    },

    async getPolarSubscriptionByEmail(userEmail: string): Promise<SubscriptionData | null> {
        try {
            const response = await getFetch(`/api/polar/subscriptions?email=${userEmail}`);
            const getPolarSubscriptionsResult = await response.json();

            if (!getPolarSubscriptionsResult.success && !getPolarSubscriptionsResult.data?.subscriptionData) {
                throw Error(getPolarSubscriptionsResult.error ?? "Unknown error occurred while fetching subscription data.");
            }

            return getPolarSubscriptionsResult.data.subscriptionData;
        } catch (error) {
            console.error("Error fetching Polar subscription:", error);
            return null;
        }
    },

    async postPolarSubscriptionsChange(
        userId: string,
        subscriptionId: string,
        prevProductId: string,
        newProductId: string,
    ) {
        try {
            const response = await postFetch(`/api/polar/subscriptions/change`, {
                userId,
                subscriptionId,
                prevProductId,
                newProductId,
            });
            const postPolarSubscriptionsChangeResult = await response.json();

            if (!postPolarSubscriptionsChangeResult.success) {
                throw Error(postPolarSubscriptionsChangeResult.error ?? "Unknown error occurred while changing subscription plan.");
            }

            return true;
        } catch (error) {
            console.error("Error requesting Polar subscription change:", error);
            return false;
        }
    }
}