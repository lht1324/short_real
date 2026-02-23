export interface PostPolarSubscriptionsChangeRequest {
    userId: string;
    subscriptionId: string;
    prevProductId: string;
    newProductId: string;
}