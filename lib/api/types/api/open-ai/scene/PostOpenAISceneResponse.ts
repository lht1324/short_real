import { SceneData } from "@/lib/api/types/supabase/VideoGenerationTasks";
import {BaseResponse} from "@/lib/api/types/api/BaseResponse";

export interface PostOpenAISceneResponse extends BaseResponse {
    data?: StoryboardData;
}

export interface StoryboardData {
    taskId: string;
    sceneDataList: SceneData[];
    videoTitle: string;
    videoDescription: string;
}