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
            video_title: videoTitle,
            video_description: videoDescription,
            master_style_info: masterStyleInfo,
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

        // [Step 1] 예술적 곡 선택 (Artistic Song Selection) Prep
        const firstMusicUrl = await musicServerAPI.getMusicSignedUrl(`${taskId}/${taskId}_0.mp3`, 60 * 60);
        const secondMusicUrl = await musicServerAPI.getMusicSignedUrl(`${taskId}/${taskId}_1.mp3`, 60 * 60);
        const narrationVoiceUrl = await voiceServerAPI.getVoiceSignedUrl(taskId);

        // 오디오 리샘플링 (LLM 분석용: Mono 24kHz 64kbps)
        console.log(`[Music Selection] Resampling audio for Step 1 analysis...`);
        const [firstMusicBase64, secondMusicBase64, narrationBase64] = await Promise.all([
            musicServerAPI.resampleAudioForLLM(firstMusicUrl, `${taskId}-0`),
            musicServerAPI.resampleAudioForLLM(secondMusicUrl, `${taskId}-1`),
            musicServerAPI.resampleAudioForLLM(narrationVoiceUrl, `${taskId}-narration`),
        ]);

        // 스타일 컨텍스트 추출
        const styleContext = {
            era: masterStyleInfo?.globalEnvironment.era || "Modern",
            location: masterStyleInfo?.globalEnvironment.locationArchetype || "Cinematic Space",
            tonality: masterStyleInfo?.colorAndLight.tonality || "Balanced",
            vibe: `${masterStyleInfo?.colorAndLight.lightingSetup || ""} ${masterStyleInfo?.fidelity.grainLevel || ""}`.trim() || "Professional Vibe",
        };

        // [Step 1] 예술적 곡 선택 (Artistic Song Selection) 실행
        const musicSelectionResult = await llmServerAPI.postMusicSelection(
            videoTitle || "Viral Content",
            videoDescription || "A high-impact short-form video",
            nicheValue,
            styleContext,
            sceneBreakdownList.map((sceneData) => ({
                sceneNumber: sceneData.sceneNumber,
                narration: sceneData.narration,
            })),
            [firstMusicBase64, secondMusicBase64, narrationBase64], // [음악0, 음악1, 나레이션] 순서 준수
            musicDataList || [],
        );

        if (!musicSelectionResult.success || !musicSelectionResult.data) {
            throw new Error(`Music selection failed: ${musicSelectionResult.error}`);
        }

        const selectedMusicIndex = musicSelectionResult.data.selectedIndex;
        const selectedMusicUrl = selectedMusicIndex === 0 ? firstMusicUrl : secondMusicUrl;
        console.log(`[Music Selection] AI selected music index: ${selectedMusicIndex} (Reasoning: ${musicSelectionResult.data.reasoning})`);

        // [Step 2 & 3] Librosa 기반 하이라이트 추출 및 볼륨 정규화 (Smart Extraction)
        const totalDuration = sceneBreakdownList.reduce((acc, scene) => acc + scene.sceneDuration, 0);

        console.log(`[Music Preprocessor] Calling Librosa model for selected index: ${selectedMusicIndex}, duration: ${totalDuration}`);

        // Processed audio files' path list
        const preprocessorResult = await replicate.run(
            "lht1324/audio-preprocessor:23202b8a079e2bacc0f634035550d8325173010be30aa5209d806ee3db3b0ad9",
            {
                input: {
                    music_audio_url: selectedMusicUrl,
                    voice_audio_url: narrationVoiceUrl,
                    target_duration: totalDuration,
                    candidate_count: 3,
                }
            }
        ) as string[];

        if (!preprocessorResult || preprocessorResult.length === 0) {
            throw new Error("Music preprocessing failed: No output from Replicate");
        }

        // 추출된 후보 클립들을 Supabase Storage에 업로드
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

        // [Step 4] AI 최종 매칭 및 가중치 결정 (Final Matching)
        console.log(`[Music Finalist] Resampling candidates for final selection...`);
        const candidateBase64List = await Promise.all(candidatePaths.map(async (path, index) => {
            const signedUrl = await musicServerAPI.getMusicSignedUrl(path, 600);
            return await musicServerAPI.resampleAudioForLLM(signedUrl, `${taskId}-candidate-${index}`);
        }));

        const finalMatchingResult = await llmServerAPI.postMusicHighlightSelection(
            nicheValue,
            videoTitle || "Viral Content",
            videoDescription || "A high-impact short-form video",
            styleContext,
            sceneBreakdownList.map((sceneData) => ({
                sceneNumber: sceneData.sceneNumber,
                narration: sceneData.narration,
                sceneDuration: sceneData.sceneDuration,
            })),
            narrationBase64,
            candidateBase64List // [후보0, 후보1, 후보2]
        );

        if (!finalMatchingResult.success || !finalMatchingResult.data) {
            throw new Error(`Final music matching failed: ${finalMatchingResult.error}`);
        }

        const { selectedIndex: finalCandidateIndex, scriptIntensity } = finalMatchingResult.data;
        console.log(`[Music Finalist] AI selected candidate index: ${finalCandidateIndex}, scriptIntensity: ${scriptIntensity}`);

        // [신규] Intensity 기반 LUFS 오프셋 계산 (dB)
        // Offset = 15.0 - (Intensity - 1) * (10.0 / 9.0)
        // Intensity 1 -> -15.0dB, Intensity 10 -> -5.0dB
        const intensityOffset = 15.0 - (scriptIntensity - 1) * (10.0 / 9.0);
        const mixingGainDb = parseFloat((-intensityOffset).toFixed(2));

        console.log(`[Music Mixing] Calculated mixingGainDb: ${mixingGainDb}dB (Intensity: ${scriptIntensity})`);

        // [Step 3.5] 최종 선택된 파일을 autopilot_cut_music.mp3로 고정 (사장님 요청사항)
        const selectedCandidatePath = `${taskId}/candidate_${finalCandidateIndex}.mp3`;
        const finalCutMusicPath = `${taskId}/autopilot_cut_music.mp3`;

        const { error: copyError } = await supabase.storage
            .from('video_music_temp_storage')
            .copy(selectedCandidatePath, finalCutMusicPath);

        if (copyError) throw new Error(`Failed to copy selected candidate to final path: ${copyError.message}`);

        // DB 업데이트: 최종 선택된 정보와 가공 완료 플래그 저장
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.FINALIZING,
            final_video_merge_data: {
                ...videoMergeData,
                musicIndex: selectedMusicIndex,
                mixingGainDb: mixingGainDb, // 신규 게인값 저장
                volumePercentage: 100, // dB를 사용하므로 %는 100으로 고정하거나 무시됨
                isMusicPreProcessed: true,
            }
        });

        // Fire and Forget으로 최종 병합 호출
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
            message: "Music hybrid pipeline (Step 1-3) completed successfully",
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