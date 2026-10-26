import {MusicData} from "@/lib/api/types/supabase/VideoGenerationTasks";
import Replicate from "replicate";
import {eq} from "drizzle-orm";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {getNeonDb} from "@/lib/db/neon";
import {videoGenerationTasks} from "@/lib/db/schema";
import {r2ServerAPI} from "@/lib/r2";

// R2 키 접두 — 구 Supabase 버킷명을 폴더로 사용
const MUSIC_PREFIX = 'video_music_temp_storage';

export const musicServerAPI = {
    async postMusic(
        taskId: string,
        userId: string,
        musicFileList: (File | Blob | ArrayBuffer)[],
        musicDataList: MusicData[],
    ): Promise<{ success: boolean, error?: string }> {
        try {
            let uploadSuccessCount = 0;

            for (let index = 0; index < musicFileList.length; index++) {
                const musicFile = musicFileList[index];
                const musicData = musicDataList[index];

                // 1. mp3 파일 업로드 — putObject는 upsert 고정
                const audioFilePath = `${userId}/${taskId}/${taskId}_${index}.mp3`;

                try {
                    await r2ServerAPI.putObject(`${MUSIC_PREFIX}/${audioFilePath}`, musicFile, 'audio/mpeg');
                } catch (audioError) {
                    console.error('Error uploading music file to storage:', audioError);
                    throw audioError;
                }

                // 2. 이미지 다운로드 및 업로드
                if (musicData.imageUrl) {
                    try {
                        const imageResponse = await fetch(musicData.imageUrl);
                        if (imageResponse.ok) {
                            const imageBlob = await imageResponse.blob();
                            const imageFilePath = `${userId}/${taskId}/${taskId}_${index}.jpeg`;

                            try {
                                await r2ServerAPI.putObject(`${MUSIC_PREFIX}/${imageFilePath}`, imageBlob, 'image/jpeg');
                            } catch (imageError) {
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
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                music_data_list: musicDataList
            });

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

    async getMusicData(taskId: string, userId: string): Promise<MusicData[]> {
        const db = getNeonDb();

        try {
            // 1. video_generation_tasks 테이블에서 music_data_list 가져오기 (Supabase .single() 계약)
            const taskRows = await db
                .select()
                .from(videoGenerationTasks)
                .where(eq(videoGenerationTasks.id, taskId))
                .limit(1);

            if (!taskRows[0]) {
                throw new Error(`Task not found for music data: ${taskId}`);
            }

            const musicDataList = taskRows[0].music_data_list;
            if (!musicDataList || musicDataList.length === 0) {
                return [];
            }

            // 2. video_music_temp_storage 폴더에서 파일 존재 확인
            const storageFolderPath = `${userId}/${taskId}`;
            const fileList = await r2ServerAPI.listKeys(`${MUSIC_PREFIX}/${storageFolderPath}/`).catch((listError) => {
                console.error('Error listing music files:', listError);
                return [] as string[];
            });

            if (fileList.length === 0) {
                return musicDataList;
            }

            // 3. 각 index에 대해 signedUrl 생성 (Supabase createSignedUrls 계약 → Map으로 결합)
            const pathList: string[] = [];
            for (let index = 0; index < musicDataList.length; index++) {
                pathList.push(`${userId}/${taskId}/${taskId}_${index}.mp3`);
                pathList.push(`${userId}/${taskId}/${taskId}_${index}.jpeg`);
            }

            const signedUrlMap = new Map<string, string>();
            try {
                await Promise.all(pathList.map(async (path) => {
                    signedUrlMap.set(path, await r2ServerAPI.presignGet(`${MUSIC_PREFIX}/${path}`, 86400));
                }));
            } catch (urlError) {
                console.error('Error creating signed URLs:', urlError);
                return musicDataList;
            }

            // 4. music_data_list와 signedUrl 결합 후 return
            return musicDataList.map((musicData, index) => {
                const targetAudioPath = `${userId}/${taskId}/${taskId}_${index}.mp3`;
                const targetImagePath = `${userId}/${taskId}/${taskId}_${index}.jpeg`;

                return {
                    ...musicData,
                    audioUrl: signedUrlMap.get(targetAudioPath) || musicData.audioUrl,
                    imageUrl: signedUrlMap.get(targetImagePath) || musicData.imageUrl,
                };
            });
        } catch (error) {
            console.error('Unexpected error in getMusicDatas:', error);
            return [];
        }
    },

    async getMusicSignedUrl(filePath: string, expiresIn: number = 60 * 60 * 24) {
        return r2ServerAPI.presignGet(`${MUSIC_PREFIX}/${filePath}`, expiresIn);
    },

    async resampleAudioForLLM(
        audioUrl: string,
        tempIdentifier: string
    ): Promise<string> {
        const replicate = new Replicate({
            auth: process.env.REPLICATE_API_TOKEN,
        });

        try {
            // 1. 오디오 다운로드
            const response = await fetch(audioUrl);
            if (!response.ok) throw new Error(`Failed to fetch audio from ${audioUrl}`);
            const audioBuffer = Buffer.from(await response.arrayBuffer());

            // 2. 임시 업로드 (Replicate 호출용)
            const tempFileName = `temp/resample-llm-${tempIdentifier}.mp3`;
            await r2ServerAPI.putObject(`${MUSIC_PREFIX}/${tempFileName}`, audioBuffer, 'audio/mpeg');

            const tempSignedUrl = await r2ServerAPI.presignGet(`${MUSIC_PREFIX}/${tempFileName}`, 300);

            // 3. Replicate FFmpeg Sandbox 호출 (Mono, 24kHz, 64kbps)
            const ffmpegArgs = `-ar 24000 -ac 1 -b:a 64k`;

            const prediction = await replicate.predictions.create({
                version: "lht1324/ffmpeg-sandbox-2:06262bdc243f9afe6d1b9a8d338ab536044d0604ce4c420c9cde7ee7fe781339",
                input: {
                    video_urls: JSON.stringify([tempSignedUrl]),
                    ffmpeg_args: ffmpegArgs,
                }
            });
            const completedPrediction = await replicate.wait(prediction);
            const processedAudioUrl = completedPrediction.output;

            if (!processedAudioUrl) throw new Error("Replicate audio resampling failed.");

            // 4. 결과 다운로드
            const processedResponse = await fetch(processedAudioUrl.toString());
            if (!processedResponse.ok) throw new Error("Failed to download resampled audio.");

            const resampledBuffer = Buffer.from(await processedResponse.arrayBuffer());

            // 5. 임시 파일 삭제 (비동기로 진행하여 응답 속도 확보)
            r2ServerAPI.deleteKeys([`${MUSIC_PREFIX}/${tempFileName}`]).catch(console.error);

            return resampledBuffer.toString('base64');
        } catch (error) {
            console.error("[resampleAudioForLLM] Error:", error);
            throw error;
        }
    }
}
