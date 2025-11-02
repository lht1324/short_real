import { SceneData } from "@/api/types/supabase/VideoGenerationTasks";
import {BaseResponse} from "@/api/types/api/BaseResponse";

export interface PostOpenAISceneResponse extends BaseResponse {
    data?: StoryboardData;
}

export interface StoryboardData {
    taskId: string;
    sceneDataList: SceneData[];
    videoMainSubject: string;
}