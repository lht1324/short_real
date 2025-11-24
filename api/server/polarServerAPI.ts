import {Polar} from "@polar-sh/sdk";
import {processProducts} from "@/utils/polarUtils";

const isProd = process.env.NODE_ENV === 'production';
const polar = new Polar({
    server: isProd ? 'production' : 'sandbox',
    accessToken: isProd
        ? process.env.POLAR_API_KEY
        : process.env.POLAR_DEV_API_KEY,
});

export const polarServerAPI = {
    async getPolarProducts() {
        const result = await polar.products.list({
            isArchived: false,
            isRecurring: true,
        });

        return processProducts(result.result.items)
    },
}