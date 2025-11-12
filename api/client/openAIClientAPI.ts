import { ScriptGenerationRequest, ScriptGenerationResponse } from '../types/open-ai/ScriptGeneration';
import { postFetch } from '@/api/client/baseFetch';
import {PostOpenAISceneRequest} from "@/api/types/api/open-ai/scene/PostOpenAISceneRequest";
import {PostOpenAISceneResponse, StoryboardData} from "@/api/types/api/open-ai/scene/PostOpenAISceneResponse";

export const openAIClientAPI = {
    async postOpenAIScript(request: ScriptGenerationRequest): Promise<ScriptGenerationResponse> {
        const response = await postFetch('/api/open-ai/script', request);
        const result: ScriptGenerationResponse = await response.json();

        if (!result || !result.success || !result.data) {
            throw new Error('Script generation failed');
        }

        return result;
    },

    async postOpenAIScene(request: PostOpenAISceneRequest): Promise<StoryboardData | null> {
        const response = await postFetch('/api/open-ai/scene', request);
        const postOpenAISceneResponse: PostOpenAISceneResponse = await response.json();

        console.log("postOpenAISceneResponse: ", postOpenAISceneResponse);

        if (!postOpenAISceneResponse || !postOpenAISceneResponse.success || !postOpenAISceneResponse.data) {
            throw new Error('SceneDataList generation failed');
        }

        return postOpenAISceneResponse.data;
    }
}