import {Style} from "@/api/types/supabase/Styles";

export interface PostVideoRequest {
    userId: string;
    style?: Style;
}