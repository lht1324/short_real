import { ScriptGenerationRequest, ScriptGenerationResponse } from '../types/open-ai/ScriptGeneration';
import { VideoDataGenerationRequest, VideoDataGenerationResponse } from '../types/open-ai/VideoDataGeneration';
import { postFetch } from '@/api/client/baseFetch';

export const openAIClientAPI = {
    async postOpenAIScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse | null> {
        try {
            const response = await postFetch('/api/open-ai/script', request);
            const result: ScriptGenerationResponse = await response.json();

            if (!result) {
                throw new Error('Script generation failed');
            }

            return result;
        } catch (error) {
            console.error('Error generating script:', error);
            return null;
        }
    },

    async postOpenAIVideoData(request: VideoDataGenerationRequest): Promise<VideoDataGenerationResponse | null> {
        try {
            const response = await postFetch('/api/open-ai/video-data', request);
            const result: VideoDataGenerationResponse = await response.json();

            if (!result) {
                throw new Error('Video data generation failed');
            }

            return result;
        } catch (error) {
            console.error('Error generating video data:', error);
            return null;
        }
    }
}