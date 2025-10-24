import {Style} from "@/api/types/supabase/Styles";

export interface PostVideoRequest {
    userId: string;
    taskId: string;
    style?: Style;
}