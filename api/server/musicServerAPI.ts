import { createSupabaseServer } from "@/lib/supabaseServer";
import { BackgroundMusic } from "@/api/types/supabase/BackgroundMusics";
import { PostgrestResponse } from "@supabase/supabase-js";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

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
    },

    async postMusic(generationTaskId: string, musicFileList: (File | Blob | ArrayBuffer)[]): Promise<{ success: boolean, error?: string }> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            let uploadSuccessCount = 0;

            for (let index = 0; index < musicFileList.length; index++) {
                const musicFile = musicFileList[index];

                const filePath = `${generationTaskId}/${generationTaskId}_${index}.mp3`;

                const { error } = await supabase.storage
                    .from('video_music_temp_storage')
                    .upload(filePath, musicFile, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                if (error) {
                    console.error('Error uploading music file to storage:', error);

                    throw new Error(error.message);
                }

                uploadSuccessCount++;
            }

            return {
                success: uploadSuccessCount === musicFileList.length,
            };
        } catch (error) {
            console.error('Unexpected error in postMusic:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : "Unexpected error in postMusic"
            };
        }
    }
}