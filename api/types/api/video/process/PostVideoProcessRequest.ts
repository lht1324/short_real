import {Style} from "@/api/types/supabase/Styles";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";

export interface PostVideoProcessRequest {
    userId: string;
    script: string;
    style?: Style;
    voiceId?: string;
    sceneDataList?: SceneData[];
    videoMainSubject?: string;
}