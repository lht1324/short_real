import { createSupabaseServer } from "@/lib/supabaseServer";
import { BackgroundMusic } from "@/api/types/supabase/BackgroundMusics";
import { PostgrestResponse } from "@supabase/supabase-js";

export const musicServerAPI = {
    async getBackgroundMusics(): Promise<BackgroundMusic[]> {
        const supabase = await createSupabaseServer();

        try {
            const { data, error }: PostgrestResponse<BackgroundMusic> = await supabase
                .from('background_musics')
                .select('*');

            if (error) {
                console.error('Error fetching background musics:', error);
                throw error;
            }

            return data || [];
        } catch (error) {
            console.error('Unexpected error in getBackgroundMusics:', error);
            return [];
        }
    },

    async getBackgroundMusicSignedUrls(backgroundMusicNameList: string[]): Promise<{ path: string | null; signedUrl: string }[]> {
        const supabase = await createSupabaseServer();

        try {
            const { data: signedUrlDataList, error } = await supabase
                .storage
                .from('background_music_storage')
                .createSignedUrls(backgroundMusicNameList, 3600);

            if (error) {
                console.error('Error creating signed URLs:', error);
                throw error;
            }

            return signedUrlDataList.map(({ path, signedUrl }) => {
                return {
                    path,
                    signedUrl,
                }
            }) || [];
        } catch (error) {
            console.error('Unexpected error in getBackgroundMusicSignedUrls:', error);
            return [];
        }
    }
}