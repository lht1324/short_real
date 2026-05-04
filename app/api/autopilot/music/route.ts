import {NextRequest} from "next/server";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {VideoGenerationTask, VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {musicServerAPI} from "@/lib/api/server/musicServerAPI";
import {voiceServerAPI} from "@/lib/api/server/voiceServerAPI";
import Replicate from "replicate";

export async function POST(
    request: NextRequest,
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const supabase = createSupabaseServiceRoleClient();
    const replicate = new Replicate({
        auth: process.env.REPLICATE_API_TOKEN,
    });

    try {
        const searchParams = request.nextUrl.searchParams;
        const taskId = searchParams.get("taskId");
        const seriesId = searchParams.get("seriesId");

        if (!taskId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Task Id is not valid.',
            });
        }

        if (!seriesId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Series Id is not valid.',
            });
        }

        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Fetching video generation task is failed.',
            })
        }

        const { data: autopilotData, error } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (error) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Fetching autopilot data is failed.',
            });
        }

        const {
            scene_breakdown_list: sceneBreakdownList,
            final_video_merge_data: videoMergeData,
            music_data_list: musicDataList,
        }: VideoGenerationTask = videoGenerationTask;

        if (!videoMergeData) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Video merge data not exists.',
            });
        }

        const {
            niche_value: nicheValue,
        }: AutopilotData = autopilotData;

        const firstMusicUrl = await musicServerAPI.getMusicSignedUrl(`${taskId}/${taskId}_0.mp3`, 60 * 60);
        const secondMusicUrl = await musicServerAPI.getMusicSignedUrl(`${taskId}/${taskId}_1.mp3`, 60 * 60);
        const narrationVoiceUrl = await voiceServerAPI.getVoiceSignedUrl(taskId);

        // 음악 2개는 리샘플링(Mono 24kHz 64kbps), 나레이션은 원본 그대로
        const [firstMusicBase64, secondMusicBase64] = await Promise.all([
            musicServerAPI.resampleAudioForLLM(firstMusicUrl, `${taskId}-0`),
            musicServerAPI.resampleAudioForLLM(secondMusicUrl, `${taskId}-1`),
        ]);

        const narrationResponse = await fetch(narrationVoiceUrl);
        if (!narrationResponse.ok) throw new Error(`Failed to fetch narration audio from ${narrationVoiceUrl}`);
        const narrationBuffer = Buffer.from(await narrationResponse.arrayBuffer());
        const narrationBase64 = narrationBuffer.toString('base64');

        const audioBase64List = [firstMusicBase64, secondMusicBase64, narrationBase64];

        const postMusicAnalysisResult = await llmServerAPI.postMusicSelection(
            nicheValue,
            sceneBreakdownList.map((sceneData) => {
                return {
                    sceneNumber: sceneData.sceneNumber,
                    narration: sceneData.narration,
                    sceneDuration: sceneData.sceneDuration,
                }
            }),
            audioBase64List,
            musicDataList || [],
        );

        // [Step 2 & 3] Librosa 기반 하이라이트 추출 및 볼륨 정규화 (Smart Extraction)
        const totalDuration = sceneBreakdownList.reduce((acc, scene) => acc + scene.sceneDuration, 0);

        console.log(`[Music Preprocessor] Calling Replicate model for taskId: ${taskId}, duration: ${totalDuration}`);

        const preprocessorResult = await replicate.run(
            "lht1324/audio-preprocessor:23202b8a079e2bacc0f634035550d8325173010be30aa5209d806ee3db3b0ad9",
            {
                input: {
                    music_audio_url: firstMusicUrl, // musicIndex 0 (사장님 요청사항)
                    voice_audio_url: narrationVoiceUrl,
                    target_duration: totalDuration,
                    candidate_count: 3,
                }
            }
        ) as string[];

        if (!preprocessorResult || preprocessorResult.length === 0) {
            throw new Error("Music preprocessing failed: No output from Replicate");
        }

        // 추출된 후보 클립들을 Supabase Storage에 업로드 (Step 4에서 AI가 선택할 수 있도록 준비)
        const uploadPromises = preprocessorResult.map(async (url, index) => {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch candidate ${index} from ${url}`);

            const arrayBuffer = await response.arrayBuffer();
            const storagePath = `${taskId}/candidate_${index}.mp3`;

            const { error: uploadError } = await supabase.storage
                .from('video_music_temp_storage')
                .upload(storagePath, arrayBuffer, {
                    contentType: 'audio/mpeg',
                    upsert: true
                });

            if (uploadError) throw new Error(`Failed to upload candidate ${index}: ${uploadError.message}`);

            return storagePath;
        });

        const candidatePaths = await Promise.all(uploadPromises);
        console.log(`[Music Preprocessor] Uploaded ${candidatePaths.length} candidates to storage`);

        if (!postMusicAnalysisResult.success || !postMusicAnalysisResult.data) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: `Music analysis failed: ${postMusicAnalysisResult.error}`,
            });
        }

        // // TEST!!
        //
        // return getNextBaseResponse({
        //     success: true,
        //     status: 200,
        //     message: "Autopilot video metadata test: postScript()"
        // });

        const {
            selectedIndex,
            startSec,
            endSec,
            volumePercentage,
        } = postMusicAnalysisResult.data;

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.FINALIZING,
            final_video_merge_data: {
                ...videoMergeData,
                musicIndex: selectedIndex,
                cuttingAreaStartSec: startSec,
                cuttingAreaEndSec: endSec,
                volumePercentage: volumePercentage, // 볼륨은 추후 고도화 예정
            }
        });

        // Fire and Forget으로 최종 병합 호출 (S2S 인증 지원 필요)
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video/merge/final?taskId=${taskId}&userId=${videoGenerationTask.user_id}`,
            {
                method: 'POST',
            },
        )

        // 즉시 응답
        return getNextBaseResponse({
            status: 200,
            success: true,
            message: "Music is analyzed successfully",
        });
    } catch (error) {
        console.error("Error in POST /api/autopilot/music:", error);
        return getNextBaseResponse({
            status: 500,
            success: false,
            message: "Failed to analyze music"
        });
    }
}