import { ScriptGenerationRequest, ScriptGenerationResponse } from '../types/open-ai/ScriptGeneration';
import { postFetch } from '@/api/client/baseFetch';
import {PostSceneRequest} from "@/app/api/open-ai/scene/PostSceneRequest";
import {PostSceneResponse} from "@/app/api/open-ai/scene/PostSceneResponse";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";

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

    async postOpenAIScene(request: PostSceneRequest): Promise<{
        sceneDataList: SceneData[],
        videoMainSubject: string
    } | null> {
        try {
            const response = await postFetch('/api/open-ai/scene', request);
            const result: PostSceneResponse = await response.json();

            if (!result || !result.success || !result.data) {
                throw new Error('SceneDataList generation failed');
            }

            return result.data;
        } catch (error) {
            console.error('Error generating SceneDataList:', error);
            return null;
        }
    }
}