import {
    fal,
    InQueueQueueStatus,
    InProgressQueueStatus,
    CompletedQueueStatus,
    QueueStatus,
    RequestLog
} from '@fal-ai/client';

export interface FalAiTextToVideoRequest {
    prompt: string;
    seed?: number;
    negative_prompt?: string;
    aspect_ratio?: '16:9' | '9:16' | '1:1';
    resolution?: '720p' | '1080p';
    duration?: number;
}

export interface FalAiTextToVideoResponse {
    video: {
        url: string;
        width: number;
        height: number;
        content_type: string;
        file_name: string;
        file_size: number;
    };
    timings: {
        inference: number;
    };
    seed: number;
    has_nsfw_concepts: boolean;
    prompt: string;
}

export interface FalAiQueueUpdate {
    status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
    logs?: RequestLog[];
    queue_position?: number;
}

export class FalAIClient {
    constructor() {
        // fal 클라이언트에 API 키 설정
        fal.config({
            credentials: process.env.FAL_AI_KEY!
        });
    }

    async generateTextToVideo(
        params: FalAiTextToVideoRequest,
        options?: {
            onQueueUpdate?: (update: FalAiQueueUpdate) => void;
            enableLogs?: boolean;
        }
    ): Promise<FalAiTextToVideoResponse> {
        try {
            const input = {
                prompt: params.prompt,
                ...(params.seed !== undefined && { seed: params.seed }),
                ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
                aspect_ratio: params.aspect_ratio || '9:16',
                resolution: params.resolution || '720p',
                duration: params.duration || 5,
            };

            const result = await fal.subscribe('fal-ai/pika/v2.2/text-to-video', {
                input,
                logs: options?.enableLogs || false,
                onQueueUpdate: options?.onQueueUpdate ? (update: QueueStatus) => {
                    const queueUpdate: FalAiQueueUpdate = {
                        status: update.status as FalAiQueueUpdate['status'],
                        logs: (update as InProgressQueueStatus | CompletedQueueStatus).logs,
                        queue_position: (update as InQueueQueueStatus).queue_position
                    };
                    options.onQueueUpdate!(queueUpdate);
                } : undefined,
            });

            return result.data as FalAiTextToVideoResponse;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to generate video: ${error.message}`);
            }
            throw new Error('Failed to generate video: Unknown error');
        }
    }

    async submitRequest(params: FalAiTextToVideoRequest): Promise<{ request_id: string }> {
        try {
            const input = {
                prompt: params.prompt,
                ...(params.seed !== undefined && { seed: params.seed }),
                ...(params.negative_prompt && { negative_prompt: params.negative_prompt }),
                aspect_ratio: params.aspect_ratio || '16:9',
                resolution: params.resolution || '720p',
                duration: params.duration || 5,
            };

            const result = await fal.queue.submit('fal-ai/pika/v2.2/text-to-video', {
                input
            });

            return { request_id: result.request_id };
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to submit request: ${error.message}`);
            }
            throw new Error('Failed to submit request: Unknown error');
        }
    }

    async getResult(requestId: string): Promise<FalAiTextToVideoResponse> {
        try {
            const result = await fal.queue.result('fal-ai/pika/v2.2/text-to-video', {
                requestId
            });

            return result.data as FalAiTextToVideoResponse;
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to get result: ${error.message}`);
            }
            throw new Error('Failed to get result: Unknown error');
        }
    }

    async checkStatus(requestId: string): Promise<{ status: string; logs?: RequestLog[] }> {
        try {
            return await fal.queue.status('fal-ai/pika/v2.2/text-to-video', {
                requestId
            });
        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to check status: ${error.message}`);
            }
            throw new Error('Failed to check status: Unknown error');
        }
    }
}

export const createFalAiClient = () => {
    return new FalAIClient();
};