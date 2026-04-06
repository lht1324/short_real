import {NextRequest} from "next/server";
import {getIsValidRequestS2S} from "@/lib/utils/getIsValidRequest";
import {getNextBaseResponse} from "@/lib/utils/getNextBaseResponse";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {llmServerAPI} from "@/lib/api/server/llmServerAPI";
import {voiceServerAPI} from "@/lib/api/server/voiceServerAPI";
import {internalFireAndForgetFetch} from "@/lib/utils/internalFetch";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";
import {
    SceneData,
    SceneGenerationStatus,
    SubtitleSegment,
    VideoGenerationTask,
    VideoGenerationTaskStatus
} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {NICHE_DATA_LIST} from "@/lib/niches";

export async function POST(
    request: NextRequest
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const searchParams = request.nextUrl.searchParams;
        const seriesId = searchParams.get("seriesId");

        if (!seriesId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Missing seriesId in query parameters.',
            });
        }

        const { data: autopilotData, error: fetchError } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (fetchError || !autopilotData) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Fetching autopilot data is failed.',
            });
        }

        const {
            user_id: userId,
            niche_preset_id: nichePresetId,
            niche_value: nicheValue,
            voice_id: voiceId,
            style_id: styleId,
            caption_config: captionConfig,
            topic_history: topicHistory = [],
        }: AutopilotData = autopilotData;

        // 1. 주제 발굴 (Topic Discovery)
        const nicheData = nichePresetId
            ? NICHE_DATA_LIST.find(n => n.uiMetadata.id === nichePresetId)
            : null;

        const instructionContext = nicheData
            ? `
[Niche Category]: ${nicheData.uiMetadata.label}
[Persona/Style]: ${nicheData.generationParams.systemRole}
[Discovery Goal]: ${nicheData.generationParams.topicDiscoveryPrompt}
`.trim()
            : nicheValue;

        const newTopic = await llmServerAPI.postAutopilotNicheTopic(
            instructionContext,
            topicHistory
        );

        // 2. 히스토리 업데이트 및 DB 저장
        const finalTopic = newTopic || nicheValue;
        const updatedHistory = [finalTopic, ...topicHistory].slice(0, 180);

        await supabase
            .from('autopilot_data')
            .update({
                topic_history: updatedHistory,
                last_run_at: new Date().toISOString()
            })
            .eq('id', seriesId);

        // 3. 프롬프트 구성 (Preset / Custom 모드)
        const userPrompt = nicheData
            ? `
<input_data>
  <topic>${finalTopic}</topic>
  <style_guidelines>
    <system_role>${nicheData.generationParams.systemRole}</system_role>
    <instruction>${nicheData.generationParams.scriptInstruction}</instruction>
    <negative_constraints>${nicheData.generationParams.negativeConstraints}</negative_constraints>
  </style_guidelines>
</input_data>
`
            : `
<input_data>
  <topic>${finalTopic}</topic>
</input_data>
`;

            // 2. 스크립트 생성
        const postScriptResult = await llmServerAPI.postScript(userPrompt);

        if (!postScriptResult?.data) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Script generation failed.',
            });
        }

        const {
            script: narrationScript,
        } = postScriptResult.data;

        // 3. 음성 생성 및 자막 타임라인 획득
        const voiceGenerationResult = await voiceServerAPI.postVoice(narrationScript, voiceId);

        // 4. 비디오 생성 태스크 초기 레코드 생성
        const videoGenerationTask = await videoGenerationTasksServerAPI.postVideoGenerationTask({
            user_id: userId,
            status: VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT,
            narration_script: narrationScript,
            selected_voice_id: voiceId,
            selected_style_id: styleId,
            series_id: seriesId,
            // Autopilot에서는 기본적으로 9:16 등의 설정을 어디서 가져올지 고민 필요하나, 
            // 현재는 씬 분할 단계로 넘어가기 위한 최소 정보만 저장
        });

        const taskId = videoGenerationTask.id;

        // [New] Update autopilot_data with the current generating taskId
        await supabase
            .from('autopilot_data')
            .update({
                current_generating_task_id: taskId
            })
            .eq('id', seriesId);

        // 5. OpenAI를 통해 씬 분할 (Scene Segmentation)
        const postSceneSegmentationResult = await llmServerAPI.postSceneSegmentation(
            taskId,
            narrationScript,
            voiceGenerationResult.subtitleSegmentList
        );

        if (!postSceneSegmentationResult) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Scene segmentation failed.',
            });
        }

        // 6. 자막 정규화 및 매핑 로직 (@app/api/open-ai/scene/route.ts 이식)
        const normalizeWord = (text: string) => {
            return text
                .toLowerCase()
                .replace(/[^\w\s]/g, "")
                .trim();
        };

        let currentWordIndex = 0;
        const fullSubtitleList = voiceGenerationResult.subtitleSegmentList;

        const mappedSceneDataList: SceneData[] = postSceneSegmentationResult.sceneDataList.map((sceneData) => {
            const sceneNarrationWords = sceneData.narration.split(/\s+/).map(normalizeWord).filter(w => w);
            const segmentsForScene: SubtitleSegment[] = [];

            for (const targetWord of sceneNarrationWords) {
                let assembledWord = "";
                const tempSegments: SubtitleSegment[] = [];
                let searchIndex = currentWordIndex;

                while (searchIndex < fullSubtitleList.length) {
                    const currentSegment = fullSubtitleList[searchIndex];
                    const normalizedSegmentWord = normalizeWord(currentSegment.word);

                    tempSegments.push(currentSegment);
                    assembledWord += normalizedSegmentWord;
                    searchIndex++;

                    if (assembledWord === targetWord) {
                        segmentsForScene.push({
                            word: tempSegments.map(segment => segment.word).join(""),
                            startSec: tempSegments[0].startSec,
                            endSec: tempSegments[tempSegments.length - 1].endSec,
                        });
                        currentWordIndex = searchIndex;
                        break;
                    }

                    if (!targetWord.startsWith(assembledWord)) {
                        break;
                    }
                }
            }

            return {
                ...sceneData,
                sceneSubtitleSegments: segmentsForScene,
                status: SceneGenerationStatus.IN_PROGRESS,
            };
        });

        // 7. 정교한 씬 재생 시간(Duration) 계산
        const finalSceneDataList = mappedSceneDataList.map((sceneData, index) => {
            const isLastScene = index === mappedSceneDataList.length - 1;
            const currentSceneSegmentList = sceneData.sceneSubtitleSegments ?? [];
            let actualSceneDuration: number;

            if (currentSceneSegmentList.length === 0) {
                actualSceneDuration = sceneData.sceneDuration; // Fallback
            } else if (isLastScene) {
                actualSceneDuration = currentSceneSegmentList[currentSceneSegmentList.length - 1].endSec - currentSceneSegmentList[0].startSec + 0.75;
            } else {
                const nextSceneSegmentList = mappedSceneDataList[index + 1].sceneSubtitleSegments ?? [];
                if (nextSceneSegmentList.length > 0) {
                    actualSceneDuration = nextSceneSegmentList[0].startSec - currentSceneSegmentList[0].startSec;
                } else {
                    actualSceneDuration = sceneData.sceneDuration; // Fallback
                }
            }

            return {
                ...sceneData,
                sceneDuration: actualSceneDuration,
            };
        });

        // 8. 음성 파일을 Supabase Storage에 저장
        await voiceServerAPI.postNarrationBufferStream(
            voiceGenerationResult.audioBuffer,
            taskId,
        );

        // 9. 최종 데이터로 태스크 업데이트
        const patchVideoGenerationTaskRequest: Partial<VideoGenerationTask> = {
            scene_breakdown_list: finalSceneDataList,
            video_title: postSceneSegmentationResult.videoTitle,
            video_description: postSceneSegmentationResult.videoDescription,
            final_video_merge_data: {
                isCaptionEnabled: true,
                captionConfigState: captionConfig,
                captionDataList: finalSceneDataList.map((sceneData) => {
                    const currentSceneSegmentList = sceneData.sceneSubtitleSegments ?? [];

                    return {
                        sceneNumber: sceneData.sceneNumber,
                        script: sceneData.narration,
                        startSec: sceneData.sceneSubtitleSegments?.[0]?.startSec ?? 0,
                        endSec: sceneData.sceneSubtitleSegments?.[currentSceneSegmentList.length - 1]?.endSec ?? 0,
                        subtitleSegmentationList: sceneData.sceneSubtitleSegments ?? [],
                    }
                }),
                // 숏폼 기본 해상도 및 자막 위치 설정 (1080x1920 기준)
                videoWidth: 1080,
                videoHeight: 1920,
                captionAreaTop: Math.round((captionConfig.captionPosition / 100) * (1920 - ((captionConfig.fontSize * 2) + 84))),
                captionAreaVerticalPadding: 40,
                captionOneLineHeight: captionConfig.fontSize,

                // 음악 관련 초기값 (autopilot/music/route.ts에서 업데이트 예정)
                musicIndex: -1,
                cuttingAreaStartSec: 0,
                cuttingAreaEndSec: 0,
                volumePercentage: 0,
            }
        };

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, patchVideoGenerationTaskRequest);

        // 10. 비디오 생성 엔드포인트 호출 (Fire and Forget)
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video?taskId=${taskId}&userId=${userId}&selectedStyleId=${styleId}`,
            {
                method: 'POST',
            },
        );

        return getNextBaseResponse({
            status: 200,
            success: true,
            data: {
                taskId,
                videoTitle: postSceneSegmentationResult.videoTitle,
                videoDescription: postSceneSegmentationResult.videoDescription,
            },
        });
    } catch (error) {
        console.error("Error in POST /api/autopilot/video-metadata:", error);

        return getNextBaseResponse({
            status: 500,
            success: false,
            message: "Failed to generate video metadata."
        });
    }
}
