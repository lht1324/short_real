import { VideoGenerationRequest, VideoGenerationResponse } from '@/api/types/supabase/VideoGenerationTasks';
import { postFetch } from '@/api/client/baseFetch';

export const videoClientAPI = {
    /**
     * 영상 생성 요청을 서버에 전송합니다.
     * 음성 생성 → OpenAI 분석 → Scene별 영상 생성 → DB 저장의 전체 플로우를 실행합니다.
     */
    async postVideoGeneration(request: VideoGenerationRequest): Promise<VideoGenerationResponse | null> {
        try {
            const response = await postFetch('/api/video', request);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Video generation API call failed:', error);
            return null;
        }
    }
}