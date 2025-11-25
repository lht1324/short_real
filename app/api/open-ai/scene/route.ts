import {NextRequest, NextResponse} from 'next/server';
import {openAIServerAPI} from '@/api/server/openAIServerAPI';
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

export async function POST(request: NextRequest): Promise<NextResponse<PostOpenAISceneResponse>> {
    try {
        const {
            userId,
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
        const postSceneSegmentationResult = await openAIServerAPI.postSceneSegmentation(
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
            const patchUserCreditCountResult = await usersServerAPI.patchUserCreditCountByUserId(userId, -1);

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
            const sceneNarrationWords = sceneData.narration
                // 1. 단어를 분리해야 하는 특수문자들을 '공백'으로 치환
                .replace(/[—–]/g, " ")       // Dash류 (Em Dash, En Dash, Hyphen) -> 공백
                .replace(/\//g, " ")          // 슬래시 (and/or -> and or) -> 공백
                .replace(/…/g, " ")           // 말줄임표 (Wait…what -> Wait what) -> 공백

                // 2. 소유격('s)이나 줄임말('ll, 've) 처리는 선택 사항
                // 보통 STT는 "It's"를 "It's" 한 단어로 인식하므로, 여기서는 그대로 두는 게 낫습니다.
                // 만약 STT가 "It"와 "is"로 쪼갠다면 여기서도 쪼개야 하지만, ElevenLabs/Whisper는 보통 뭉쳐서 줍니다.

                // 3. 그 외 특수문자 제거 (콤마, 마침표, 따옴표 등)
                .replace(/[^\w\s']/g, "")     // 알파벳, 숫자, 공백, 작은따옴표(') 제외하고 제거

                // 4. 공백 기준 분리
                .split(/\s+/)

                // 5. 정규화 (소문자 + 작은따옴표 제거 등)
                .map(w => w.toLowerCase().replace(/^'|'$/g, "")) // 앞뒤 따옴표만 제거 ('word' -> word)
                .filter(w => w.length > 0);   // 빈 문자열 제거
            const segmentsForScene: SubtitleSegment[] = [];

            for (let i = 0; i < sceneNarrationWords.length; i++) {
                const targetWord = sceneNarrationWords[i];

                // STT 리스트가 끝났으면 루프 종료 (안전장치)
                if (currentWordIndex >= fullSubtitleList.length) break;

                const currentSttSegment = fullSubtitleList[currentWordIndex];
                const normalizedSttWord = normalizeWord(currentSttSegment.word);

                // 1. 정확히 일치하는 경우 (Happy Path)
                if (normalizedSttWord === normalizeWord(targetWord)) {
                    segmentsForScene.push({
                        word: currentSttSegment.word, // or targetWord (상관없음)
                        startSec: currentSttSegment.startSec,
                        endSec: currentSttSegment.endSec,
                    });
                    currentWordIndex++;
                }
                // 2. 불일치 발생 -> "시간은 STT 거 쓰고, 단어는 대본 거 쓰자"
                else {
                    console.warn(`Mismatch: Target "${targetWord}" vs STT "${currentSttSegment.word}". Using Target word with STT time.`);

                    // ★ 핵심: 시간은 그대로, 단어만 교체
                    segmentsForScene.push({
                        word: targetWord, // 대본의 올바른 단어 강제 주입
                        startSec: currentSttSegment.startSec,
                        endSec: currentSttSegment.endSec,
                    });

                    // 다음 단어로 진행
                    currentWordIndex++;
                }
            }

            return {
                ...sceneData,
                sceneSubtitleSegments: segmentsForScene,
                status: SceneGenerationStatus.IN_PROGRESS,
            };
        });

        const patchVideoGenerationTaskRequest: Partial<VideoGenerationTask> = {
            scene_breakdown_list: sceneDataList,
            subtitle_segment_list: voiceGenerationResult.subtitleSegmentList,
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

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                taskId: videoGenerationTask.id,
                sceneDataList: postSceneSegmentationResult.sceneDataList || [],
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