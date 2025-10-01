import { SceneData } from "@/api/types/supabase/VideoGenerationTasks";

export interface PostOpenAISceneResponse {
    success: boolean;
    data?: StoryboardData;
    error?: {
        message: string;
        code: string;
    };
}

export interface StoryboardData {
    taskId: string;
    sceneDataList: SceneData[];
    videoMainSubject: string;
}