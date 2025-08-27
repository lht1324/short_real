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
    },

    // POST /videos/scenes - Scene별 영상 생성 요청
    async postScenesVideo(params: {
        videoPrompt: string;
        sceneBreakdown: Array<{
            sceneNumber: number;
            narration: string;
            startSec: number;
            endSec: number;
        }>;
    }) {
        interface SceneVideoRequest {
            sceneNumber: number;
            requestId: string;
            startSec: number;
            endSec: number;
            duration: number;
            narration: string;
        }
        
        // Scene별 비동기 요청 생성
        const scenePromises = params.sceneBreakdown.map(async (scene) => {
            const sceneDuration = scene.endSec - scene.startSec;
            
            // 각 Scene에 대한 상세한 프롬프트 생성
            const scenePrompt = `${params.videoPrompt}

Scene ${scene.sceneNumber} (${scene.startSec}s-${scene.endSec}s):
Narration: "${scene.narration}"
Duration: ${sceneDuration} seconds

Focus on visual elements that match this specific narration segment while maintaining overall video coherence.`;

            const result = await client.submitRequest({
                prompt: scenePrompt,
                aspect_ratio: '9:16', // 숏폼 비디오용
                resolution: '720p',
                duration: sceneDuration
            });
            
            return {
                sceneNumber: scene.sceneNumber,
                requestId: result.request_id,
                startSec: scene.startSec,
                endSec: scene.endSec,
                duration: sceneDuration,
                narration: scene.narration
            };
        });
        
        // 모든 Scene 요청 완료 대기
        const sceneRequestResults = await Promise.all(scenePromises);
        
        // Scene 번호 순서대로 정렬
        sceneRequestResults.sort((a, b) => a.sceneNumber - b.sceneNumber);

        return sceneRequestResults;
    }
}