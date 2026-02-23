import {NextRequest, NextResponse} from 'next/server';
import {llmServerAPI} from '@/api/server/llmServerAPI';
import {PostOpenAISceneRequest} from '@/api/types/api/open-ai/scene/PostOpenAISceneRequest';
import {PostOpenAISceneResponse} from '@/api/types/api/open-ai/scene/PostOpenAISceneResponse';
import {voiceServerAPI} from "@/api/server/voiceServerAPI";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {
    SceneData, SceneGenerationStatus,
    SubtitleSegment,
    VideoGenerationTask,
    VideoGenerationTaskStatus
} from "@/api/types/supabase/VideoGenerationTasks";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {usersServerAPI} from "@/api/server/usersServerAPI";
import {createSupabaseServer} from "@/lib/supabaseServer";
import {SCENE_SEGMENTATION_STANDARD} from "@/lib/ADDITIONAL_CREDIT_AMOUNT";

export async function POST(request: NextRequest): Promise<NextResponse<PostOpenAISceneResponse>> {
    try {
        const supabase = await createSupabaseServer();
        const {data: {user: authUser}, error: authError} = await supabase.auth.getUser();

        if (authError || !authUser) {
            console.error("/api/open-ai/scene authError: ", authError);
            return getNextBaseResponse({
                success: false,
                status: 401,
                error: 'Unauthorized request.',
            });
        }

        const userId = authUser.id;

        const {
            taskId,
            narrationScript,
            voiceId,
            styleId,
        }: PostOpenAISceneRequest = await request.json();

        // 필수 필드 검증
        if (!userId || !narrationScript || !voiceId) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Missing query field: narrationScript, voiceId',
            });
        }

        const videoGenerationTaskRequest: Partial<VideoGenerationTask> = {
            user_id: userId,
            status: VideoGenerationTaskStatus.GENERATING_VOICE,
            narration_script: narrationScript,
            selected_style_id: styleId,
            selected_voice_id: voiceId,
        }

        const videoGenerationTask: VideoGenerationTask | null = !taskId
            ? await videoGenerationTasksServerAPI.postVideoGenerationTask(videoGenerationTaskRequest)
            : await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, videoGenerationTaskRequest);

        if (!videoGenerationTask || !videoGenerationTask.id) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to insert row into video generation task table.'
            });
        }

        const voiceGenerationResult = await voiceServerAPI.postVoice(
            narrationScript,
            voiceId,
        )

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId ?? videoGenerationTask.id, VideoGenerationTaskStatus.DRAFTING);

        // OpenAI API를 통해 Scene 분리 처리
        const postSceneSegmentationResult = await llmServerAPI.postSceneSegmentation(
            taskId ?? videoGenerationTask.id,
            narrationScript,
            voiceGenerationResult.subtitleSegmentList
        );

        if (!postSceneSegmentationResult) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to generate scene segmentation'
            });
        }

        if (videoGenerationTask.scene_breakdown_list) {
            const user = await usersServerAPI.getUserByUserId(userId);

            if (!user) {
                return getNextBaseResponse({
                    success: false,
                    status: 404,
                    error: 'User not found.'
                });
            }

            if (!user.credit_count || user.credit_count < SCENE_SEGMENTATION_STANDARD) {
                return getNextBaseResponse({
                    success: false,
                    status: 402,
                    error: "Insufficient credits."
                });
            }

            const patchUserCreditCountResult = await usersServerAPI.patchUserCreditCountByUserId(userId, -SCENE_SEGMENTATION_STANDARD);

            if (!patchUserCreditCountResult) {
                return getNextBaseResponse({
                    success: false,
                    status: 500,
                    error: 'Failed to patch user\'s credit count.'
                });
            }
        }

        // 3. 각 Scene의 자막 데이터 분리
        const normalizeWord = (text: string) => {
            return text
                .toLowerCase()          // 소문자 통일
                .replace(/[^\w\s]/g, "") // 알파벳/숫자/공백 외 제거 (콤마, 마침표 등 제거)
                .trim();
        };

        let currentWordIndex = 0;
        const fullSubtitleList = voiceGenerationResult.subtitleSegmentList;
        console.log("fullList: ", fullSubtitleList);

        const sceneDataList: SceneData[] = postSceneSegmentationResult.sceneDataList.map((sceneData) => {
            // 1. Scene의 원본 문장을 정규화된 단어 배열로 만듭니다.
            const sceneNarrationWords = sceneData.narration.split(/\s+/).map(normalizeWord).filter(w => w);
            const segmentsForScene: SubtitleSegment[] = [];

            // 2. Scene의 각 단어(targetWord)를 순회합니다.
            for (const targetWord of sceneNarrationWords) {
                let assembledWord = "";
                const tempSegments: SubtitleSegment[] = [];
                let searchIndex = currentWordIndex;

                // 3. 자막 리스트에서 단어들을 조립하며 targetWord와 일치하는지 찾습니다.
                while (searchIndex < fullSubtitleList.length) {
                    const currentSegment = fullSubtitleList[searchIndex];
                    const normalizedSegmentWord = normalizeWord(currentSegment.word);

                    // 현재 자막 조각을 임시로 추가합니다.
                    tempSegments.push(currentSegment);
                    assembledWord += normalizedSegmentWord;
                    searchIndex++;

                    // 4. 조립된 단어가 목표 단어(targetWord)와 일치하는지 확인합니다.
                    if (assembledWord === targetWord) {
                        // 일치! 임시 저장했던 자막 조각들을 최종 목록에 추가합니다.
                        // segmentsForScene.push(...tempSegments);
                        segmentsForScene.push({
                            word: tempSegments.map(segment => segment.word).join(""),
                            startSec: tempSegments[0].startSec,
                            endSec: tempSegments[tempSegments.length - 1].endSec,
                        })
                        // 전체 자막 리스트의 시작 인덱스를 업데이트합니다.
                        currentWordIndex = searchIndex;
                        break; // 현재 targetWord 찾기 완료, 다음 targetWord로 넘어갑니다.
                    }

                    // 5. 조립된 단어가 목표 단어의 일부와 일치하지 않으면 뭔가 잘못된 것이므로 루프를 중단합니다.
                    if (!targetWord.startsWith(assembledWord)) {
                        console.warn(`Mismatch detected for scene ${sceneData.sceneNumber}. Target: "${targetWord}", Assembled: "${assembledWord}".`);
                        // tempSegments를 추가하지 않고 루프를 중단하여 불일치 조각이 포함되는 것을 방지합니다.
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

        const sceneDataListWithSceneDuration = sceneDataList.map((sceneData, index) => {
            const isLastScene = index === sceneDataList.length - 1;
            const currentSceneSegmentList = sceneData.sceneSubtitleSegments ?? [];
            let actualSceneDuration: number;

            if (isLastScene) {
                actualSceneDuration = currentSceneSegmentList[currentSceneSegmentList.length - 1].endSec - currentSceneSegmentList[0].startSec + 0.75; // 여운
            } else {
                const nextSceneSegmentList = sceneDataList[index + 1].sceneSubtitleSegments ?? [];

                actualSceneDuration = nextSceneSegmentList[0].startSec - currentSceneSegmentList[0].startSec;
            }

            return {
                ...sceneData,
                sceneDuration: actualSceneDuration,
            }
        });

        const patchVideoGenerationTaskRequest: Partial<VideoGenerationTask> = {
            scene_breakdown_list: sceneDataListWithSceneDuration,
            video_title: postSceneSegmentationResult.videoTitle,
            video_description: postSceneSegmentationResult.videoDescription,
        }
        const patchVideoGenerationTaskResult: VideoGenerationTask | null = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId ?? videoGenerationTask.id, patchVideoGenerationTaskRequest);

        if (!patchVideoGenerationTaskResult || !patchVideoGenerationTaskResult.id) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to insert row into video generation task table.'
            });
        }

        // 9. 음성 파일을 Supabase Storage에 저장
        const fileUploadResult = await voiceServerAPI.postNarrationBufferStream(
            voiceGenerationResult.audioBuffer,
            patchVideoGenerationTaskResult.id,
        );

        if (!fileUploadResult.success) {
            throw Error(`Failed to upload audio file to Supabase Storage: ${fileUploadResult.message}`);
        }

        console.log("newSceneDataList: ", JSON.stringify(postSceneSegmentationResult.sceneDataList))

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                taskId: videoGenerationTask.id,
                sceneDataList: sceneDataListWithSceneDuration,
                videoTitle: postSceneSegmentationResult.videoTitle,
                videoDescription: postSceneSegmentationResult.videoDescription,
            }
        });

    } catch (error) {
        console.error('Scene segmentation API error:', error);

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : 'Failed to generate scene segmentation data.'
        });
    }
}