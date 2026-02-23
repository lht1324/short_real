import { Polar } from "@polar-sh/sdk";

export class PolarClient {
    private readonly apiKey?: string;
    private readonly isProd: boolean;
    private readonly client: Polar;

    constructor() {
        this.apiKey = process.env.POLAR_API_KEY;
        this.isProd = process.env.NODE_ENV === 'production'

        if (!this.apiKey) {
            console.warn('POLAR_API_KEY not found in environment variables');
            throw Error('POLAR_API_KEY not found in environment variables');
        }

        this.client = new Polar({
            server: this.isProd ? 'production' : 'sandbox',
            accessToken: this.apiKey,
        });
    }

    getClient() {
        return this.client;
    }
}