import {Style} from "@/lib/api/types/supabase/Styles";

export interface PostVideoRequest {
    userId: string;
    style?: Style;
}