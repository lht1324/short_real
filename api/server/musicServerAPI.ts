import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {MusicData} from "@/api/types/supabase/VideoGenerationTasks";
import Replicate from "replicate";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";

export const musicServerAPI = {
    async postMusic(
        generationTaskId: string,
        musicFileList: (File | Blob | ArrayBuffer)[],
        musicDataList: MusicData[],
    ): Promise<{ success: boolean, error?: string }> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            let uploadSuccessCount = 0;

            for (let index = 0; index < musicFileList.length; index++) {
                const musicFile = musicFileList[index];
                const musicData = musicDataList[index];

                // 1. mp3 파일 업로드
                const audioFilePath = `${generationTaskId}/${generationTaskId}_${index}.mp3`;

                const { error: audioError } = await supabase.storage
                    .from('video_music_temp_storage')
                    .upload(audioFilePath, musicFile, {
                        contentType: 'audio/mpeg',
                        upsert: true
                    });

                if (audioError) {
                    console.error('Error uploading music file to storage:', audioError);
                    throw new Error(audioError.message);
                }

                // 2. 이미지 다운로드 및 업로드
                if (musicData.imageUrl) {
                    try {
                        const imageResponse = await fetch(musicData.imageUrl);
                        if (imageResponse.ok) {
                            const imageBlob = await imageResponse.blob();
                            const imageFilePath = `${generationTaskId}/${generationTaskId}_${index}.jpeg`;

                            const { error: imageError } = await supabase.storage
                                .from('video_music_temp_storage')
                                .upload(imageFilePath, imageBlob, {
                                    contentType: 'image/jpeg',
                                    upsert: true
                                });

                            if (imageError) {
                                console.error(`Error uploading image ${index}:`, imageError);
                                // 이미지 업로드 실패는 치명적이지 않으므로 계속 진행
                            }
                        } else {
                            console.error(`Failed to download image from ${musicData.imageUrl}`);
                        }
                    } catch (imageError) {
                        console.error(`Error processing image ${index}:`, imageError);
                        // 이미지 처리 실패는 치명적이지 않으므로 계속 진행
                    }
                }

                uploadSuccessCount++;
            }

            // 3. DB에 music_data_list 저장
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(
                generationTaskId,
                { music_data_list: musicDataList }
            );

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
    },

    async getMusicData(taskId: string): Promise<MusicData[]> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            // 1. video_generation_tasks 테이블에서 music_data_list 가져오기
            const { data: taskData, error: taskError } = await supabase
                .from('video_generation_tasks')
                .select('*')
                .eq('id', taskId)
                .single();

            if (taskError) {
                console.error('Error fetching music_data_list:', taskError);
                throw taskError;
            }

            if (!taskData?.music_data_list || taskData.music_data_list.length === 0) {
                return [];
            }

            const musicDataList = taskData.music_data_list as MusicData[];

            // 2. video_music_temp_storage에서 파일 리스트 확인
            const { data: fileList, error: listError } = await supabase
                .storage
                .from('video_music_temp_storage')
                .list(taskId);

            if (listError) {
                console.error('Error listing music files:', listError);
                throw listError;
            }

            if (!fileList || fileList.length === 0) {
                return musicDataList;
            }

            // 3. 파일 개수 / 2로 music 개수 파악
            const musicCount = Math.floor(fileList.length / 2);

            // 4. 각 index에 대해 signedUrl 생성
            const pathList: string[] = [];
            for (let index = 0; index < musicCount; index++) {
                pathList.push(`${taskId}/${taskId}_${index}.mp3`);
                pathList.push(`${taskId}/${taskId}_${index}.jpeg`);
            }

            const { data: signedUrlDataList, error: urlError } = await supabase
                .storage
                .from('video_music_temp_storage')
                .createSignedUrls(pathList, 86400);

            if (urlError) {
                console.error('Error creating signed URLs:', urlError);
                throw urlError;
            }

            // 5. music_data_list와 signedUrl 결합
            const completeMusicDataList: MusicData[] = musicDataList.map((musicData, index) => {
                const audioSignedData = signedUrlDataList?.find(
                    item => item.path === `${taskId}/${taskId}_${index}.mp3`
                );
                const imageSignedData = signedUrlDataList?.find(
                    item => item.path === `${taskId}/${taskId}_${index}.jpeg`
                );

                return {
                    ...musicData,
                    audioUrl: audioSignedData?.signedUrl || musicData.audioUrl,
                    imageUrl: imageSignedData?.signedUrl || musicData.imageUrl,
                };
            });

            return completeMusicDataList;
        } catch (error) {
            console.error('Unexpected error in getMusicDatas:', error);
            return [];
        }
    },

    async postMusicModifying(
        audioUrl: string,
        cuttingAreaStartSec: number,
        cuttingAreaEndSec: number,
        volumePercentage: number,
        videoGenerationTaskId: string
    ) {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        // 웹훅 URL 생성
        const baseUrl = process.env.BASE_URL;
        if (!baseUrl) {
            throw new Error('BASE_URL is not set');
        }

        const webhookUrl = `${baseUrl}/webhook/replicate/music/modifying?videoGenerationTaskId=${videoGenerationTaskId}`;

        try {
            const prediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-audio-modifier:8706bda5af3fa52e103a0d441e3d6cb981d1aef7a23f22248ff1de6f557a0763",
                input: {
                    audio_url: audioUrl,
                    cutting_area_start_sec: cuttingAreaStartSec,
                    cutting_area_end_sec: cuttingAreaEndSec,
                    volume_percentage: volumePercentage,
                },
                webhook: webhookUrl,
                webhook_events_filter: ["completed"],
            });

            if (prediction.error || prediction.status === "failed") {
                throw new Error(`Subtitle burn-in failed: ${prediction.error}`);
            }

            console.log(`[Subtitle Burn-in] Prediction ID: ${prediction.id}`);
            return prediction.id;

        } catch (error) {
            console.error("[Subtitle Burn-in] Error:", error);
            throw error;
        }
    }
}