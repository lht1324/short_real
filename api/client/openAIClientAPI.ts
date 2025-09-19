import { ScriptGenerationRequest, ScriptGenerationResponse } from '../types/open-ai/ScriptGeneration';
import { postFetch } from '@/api/client/baseFetch';

export const openAIClientAPI = {
    async postScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse | null> {
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
}