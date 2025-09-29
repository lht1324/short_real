import { SceneData } from "@/api/types/supabase/VideoGenerationTasks";

export interface PostSceneResponse {
    success: boolean;
    data?: StoryboardData;
    error?: {
        message: string;
        code: string;
    };
}

export interface StoryboardData {
    sceneDataList: SceneData[];
    videoMainSubject: string;
}