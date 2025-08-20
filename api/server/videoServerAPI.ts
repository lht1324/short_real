import { createFalAiClient, type FalAiTextToVideoRequest, type FalAiQueueUpdate } from '@/lib/FalAIClient';

const client = createFalAiClient();

export const videoServerAPI = {
    // POST /videos - 비디오 생성 요청 제출
    async postVideo(params: FalAiTextToVideoRequest) {
        return await client.submitRequest(params);
    },

    // GET /videos/:requestId - 특정 비디오 결과 가져오기
    async getVideo(requestId: string) {
        return await client.getResult(requestId);
    },

    // GET /videos/:requestId/status - 비디오 생성 상태 확인
    async getVideoStatus(requestId: string) {
        return await client.checkStatus(requestId);
    },

    // POST /videos/generate - 즉시 비디오 생성 (완료까지 대기)
    async postGenerateVideo(
        params: FalAiTextToVideoRequest,
        options?: {
            onQueueUpdate?: (update: FalAiQueueUpdate) => void;
            enableLogs?: boolean;
        }
    ) {
        return await client.generateTextToVideo(params, options);
    }
}