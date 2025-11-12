import {BaseSunoAPIResponse, SunoAPIBaseData} from '@/api/types/suno-api/SunoAPIResponses';

export class SunoAPIClient {
    private readonly apiKey?: string;
    private baseUrl: string = 'https://api.sunoapi.org/api/v1';
    private baseUrlFileUpload: string = 'https://api.sunoapi.org/api';

    constructor() {
        this.apiKey = process.env.SUNO_API_API_KEY;
    }

    private getHeaders(): HeadersInit {
        if (!this.apiKey) {
            throw new Error('SUNO_API_API_KEY is not configured');
        }

        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
        };
    }


    // param은 어차피 sunoAPIServerAPI에서 endpoint 넣을 때 넣어주면 된다
    async requestDefault<TRequest = object | undefined, TResponse = SunoAPIBaseData>(
        endpoint: string,
        httpMethod: "POST" | "GET",
        requestData?: TRequest
    ): Promise<BaseSunoAPIResponse<TResponse>> {
        try {
            const response = await fetch(`${this.baseUrl}/${endpoint}`, {
                method: httpMethod,
                headers: this.getHeaders(),
                body: requestData ? JSON.stringify(requestData) : undefined,
            })

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json() as BaseSunoAPIResponse<TResponse>;
        } catch (error) {
            throw new Error(`SunoAPI request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    async requestUploadFile() {

    }
}