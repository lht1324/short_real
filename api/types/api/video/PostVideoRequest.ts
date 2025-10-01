import {Style} from "@/api/types/supabase/Styles";
import {SceneData} from "@/api/types/supabase/VideoGenerationTasks";

export interface PostVideoRequest {
    userId: string;
    narrationScript: string;
    style?: Style;
    voiceId?: string;
    sceneDataList?: SceneData[];
    videoMainSubject?: string;
}