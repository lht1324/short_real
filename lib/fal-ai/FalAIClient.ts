import {FalService, ServiceTypeMap} from "@/lib/api/types/fal-ai/FalAIPublicType";
import {QueueOptions, ResultOptions, StatusOptions, SubscribeOptions} from "@/lib/api/types/fal-ai/FalAIRequest";
import {FalApiResult, QueueSubmitResult} from "@/lib/api/types/fal-ai/FalAIResponse";
import {QueueStatus} from "@fal-ai/client";

export class FalAIClient {
    private readonly apiKey?: string;
    private readonly baseEndpoint = 'fal-ai/ffmpeg-api';

    constructor() {
        this.apiKey = process.env.FAL_AI_API_KEY;

        if (!this.apiKey) {
            console.warn('FAL_AI_API_KEY not found in environment variables');
        }
    }

    /**
     * 서비스 엔드포인트를 생성합니다
     */
    private getEndpoint<T extends FalService>(service: T): string {
        return `${this.baseEndpoint}/${service}`;
    }

    /**
     * 요청을 구독하고 완료될 때까지 기다립니다
     */
    async subscribe<T extends FalService>(
        service: T,
        options: SubscribeOptions<ServiceTypeMap[T]['request']>
    ): Promise<FalApiResult<ServiceTypeMap[T]['response']>> {
        if (!this.apiKey) {
            throw new Error('FAL_AI_API_KEY is required');
        }

        const { fal } = await import('@fal-ai/client');

        // API 키 설정
        fal.config({
            credentials: this.apiKey
        });

        const endpoint = this.getEndpoint(service);

        const result = await fal.subscribe(endpoint, {
            input: options.input,
            logs: options.logs,
            onQueueUpdate: options.onQueueUpdate,
        });

        return result as FalApiResult<ServiceTypeMap[T]['response']>;
    }

    /**
     * 큐에 요청을 제출합니다
     */
    async submitToQueue<T extends FalService>(
        service: T,
        input: ServiceTypeMap[T]['request'],
        options?: QueueOptions
    ): Promise<QueueSubmitResult> {
        if (!this.apiKey) {
            throw new Error('FAL_AI_API_KEY is required');
        }

        const { fal } = await import('@fal-ai/client');

        fal.config({
            credentials: this.apiKey
        });

        const endpoint = this.getEndpoint(service);

        return await fal.queue.submit(endpoint, {
            input,
            webhookUrl: options?.webhookUrl,
        });
    }

    /**
     * 요청 상태를 확인합니다
     */
    async getStatus<T extends FalService>(
        service: T,
        options: StatusOptions
    ): Promise<QueueStatus> {
        if (!this.apiKey) {
            throw new Error('FAL_AI_API_KEY is required');
        }

        const { fal } = await import('@fal-ai/client');

        fal.config({
            credentials: this.apiKey
        });

        const endpoint = this.getEndpoint(service);

        return await fal.queue.status(endpoint, {
            requestId: options.requestId,
            logs: options.logs,
        });
    }

    /**
     * 완료된 요청의 결과를 가져옵니다
     */
    async getResult<T extends FalService>(
        service: T,
        options: ResultOptions
    ): Promise<FalApiResult<ServiceTypeMap[T]['response']>> {
        if (!this.apiKey) {
            throw new Error('FAL_AI_API_KEY is required');
        }

        const { fal } = await import('@fal-ai/client');

        fal.config({
            credentials: this.apiKey
        });

        const endpoint = this.getEndpoint(service);

        const result = await fal.queue.result(endpoint, {
            requestId: options.requestId,
        });

        return result as FalApiResult<ServiceTypeMap[T]['response']>;
    }

    /**
     * 파일을 업로드합니다
     */
    async uploadFile(file: File): Promise<string> {
        if (!this.apiKey) {
            throw new Error('FAL_AI_API_KEY is required');
        }

        const { fal } = await import('@fal-ai/client');

        fal.config({
            credentials: this.apiKey
        });

        return await fal.storage.upload(file);
    }
}