import { NextRequest, NextResponse } from 'next/server';
import { voiceServerAPI } from '@/api/server/voiceServerAPI';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { videoServerAPI } from '@/api/server/videoServerAPI';
import { videoGenerationTasksServerAPI } from '@/api/server/videoGenerationTasksServerAPI';
import {
    SceneData,
    SceneGenerationStatus,
    SubtitleSegment,
    VideoGenerationRequest
} from "@/api/types/supabase/VideoGenerationTasks";
import { randomUUID } from 'crypto';
import {imageServerAPI} from "@/api/server/imageServerAPI";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {findOptimalVideoParameters} from "@/utils/videoUtils";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();
    try {
        const body = await request.json();
        const {
            userId,
            narrationScript,
            duration,
            style,
            voice,
            music,
        }: VideoGenerationRequest = body;

        // 필수 필드 검증
        // if (!narrationScript || !userId || !style || !voice) {
        if (!narrationScript || !duration || !style || !voice) {
            return NextResponse.json(
                { error: 'narrationScript, duration, voiceId, and userId are required.' },
                { status: 400 }
            );
        }

        // 1. voiceServerAPI로 음성 생성 및 Base64 인코딩
        const voiceGenerationResult = await voiceServerAPI.postVoice(
            narrationScript,
            voice.id
        );

        // 2. openAIServerAPI로 비디오 Scene 분리 데이터, 마스터 스타일 프롬프트 생성 요청
        const [postSceneSegmentationResult, postMasterStylePromptResult] = await Promise.all([
            await openAIServerAPI.postSceneSegmentation(
                narrationScript,
                voiceGenerationResult.subtitleSegmentList,
            ),
            await openAIServerAPI.postMasterStylePrompt(style)
        ])

        if (!postSceneSegmentationResult.success || !postSceneSegmentationResult.sceneDataList || !postSceneSegmentationResult.videoMainSubject) {
            return NextResponse.json(
                { error: postSceneSegmentationResult?.error?.message || 'Failed to separate scenes with OpenAI' },
                { status: 500 }
            );
        }
        console.log("sceneDataList", postSceneSegmentationResult.sceneDataList);
        console.log("videoMainSubject", postSceneSegmentationResult.videoMainSubject);

        if (!postMasterStylePromptResult.success || !postMasterStylePromptResult.masterStylePositivePrompt || !postMasterStylePromptResult.masterStyleNegativePrompt) {
            return NextResponse.json(
                { error: postMasterStylePromptResult?.error?.message || 'Failed to generate master style with OpenAI' },
                { status: 500 }
            );
        }

        // 3. 각 Scene의 자막 데이터 분리
        const normalizeWord = (text: string) => {
            return text
                .replace(/\W/g, "")            // 알파벳과 숫자만 남기고 모든 구두점/공백 제거
                .toLowerCase()
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
        const videoMainSubject = postSceneSegmentationResult.videoMainSubject;
        const masterStylePositivePrompt = postMasterStylePromptResult.masterStylePositivePrompt;
        const masterStyleNegativePrompt = postMasterStylePromptResult.masterStyleNegativePrompt;

        // 6. VideoGenerationTaskResult row 생성
        const testUserId = userId || randomUUID(); // OAuth 없이 테스트용 UUID 생성
        const postVideoGenerationTaskResult = await videoGenerationTasksServerAPI.postVideoGenerationTask({
            user_id: testUserId,
            narration_script: narrationScript,
            scene_breakdown_list: [],
            subtitle_segment_list: [],
            selected_style_id: style.id,
            selected_voice_id: voice.id,
            selected_music_id: music?.id,
        });

        if (!postVideoGenerationTaskResult || !postVideoGenerationTaskResult.id) {
            return NextResponse.json(
                { error: 'Failed to insert generation task row.' },
                { status: 500 }
            );
        }

        // 4. openAIServerAPI로 이미지 생성용, 영상 생성용 프롬프트 생성 요청
        const sceneDataWithImageGenPromptPromiseList: Promise<SceneData>[] = sceneDataList.map(async (sceneData) => {
            const postImageGenPromptResult = await openAIServerAPI.postImageGenPrompt(
                sceneData.imageGenPromptDirective,
                masterStylePositivePrompt,
                sceneData.narration,
                videoMainSubject,
            );

            if (!postImageGenPromptResult.success || !postImageGenPromptResult.imageGenPrompt) {
                throw new Error("Failed to generate image gen prompt");
            }

            return {
                ...sceneData,
                imageGenPrompt: postImageGenPromptResult.imageGenPrompt,
            };
        });
        const sceneDataWithImageGenPromptList = await Promise.all(sceneDataWithImageGenPromptPromiseList);

        for (let index = 0; index < sceneDataWithImageGenPromptList.length; index++) {
            const sceneData = sceneDataWithImageGenPromptList[index];
            const combinedMasterNegativeKeywords = `${masterStyleNegativePrompt}`.split(/\s*,\s*/);
            const uniqueMasterNegativeKeywordSet = new Set(combinedMasterNegativeKeywords);
            const uniqueMasterNegativePrompt = Array.from(uniqueMasterNegativeKeywordSet).join(", ");

            const postImageResult = await imageServerAPI.postImage(
                sceneData.imageGenPrompt as string,
                postVideoGenerationTaskResult.id as string,
                sceneData.sceneNumber,
                uniqueMasterNegativePrompt,
            );

            if (!postImageResult.success) {
                return NextResponse.json(
                    { error: 'Failed to generate image with Imagen 4.' },
                    { status: 500 }
                );
            }
        }

        const sceneDataWithVideoGenPromptPromiseList: Promise<SceneData>[] = sceneDataWithImageGenPromptList.map(async (sceneData) => {
            const { data: imageData, error: imageError } = await supabase.storage
                .from("scene_image_temp_storage")
                .download(`${postVideoGenerationTaskResult.id}/${sceneData.sceneNumber}.jpeg`)

            if (imageError) {
                throw new Error(`Supabase download error: ${imageError.message}`);
            }

            if (!imageData) {
                throw new Error('No data received from Supabase');
            }

            // Blob을 ArrayBuffer로 변환
            const imageArrayBuffer = await imageData.arrayBuffer();

            // ArrayBuffer를 Base64로 인코딩
            const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');

            const {
                num_frames: numFrames,
                frames_per_second: framesPerSeconds,
                resulting_duration: videoActualDuration,
            } = findOptimalVideoParameters(sceneData.sceneDuration);

            const postVideoGenPromptResult = await openAIServerAPI.postVideoGenPrompt(
                sceneData.imageGenPrompt as string,
                sceneData.narration,
                imageBase64,
                numFrames,
                framesPerSeconds,
                videoActualDuration,
                sceneData.sceneDuration,
            );
1
            if (!postVideoGenPromptResult.success || !postVideoGenPromptResult.videoGenPrompt) {
                throw new Error("Failed to generate video gen prompt");
            }

            return {
                ...sceneData,
                videoGenPrompt: postVideoGenPromptResult.videoGenPrompt,
            }
        });
        const sceneDataWithVideoGenPromptList = await Promise.all(sceneDataWithVideoGenPromptPromiseList);

        console.log(`최종 Scene 데이터 준비 완료. Scene 수: ${sceneDataWithVideoGenPromptList.length}`);

        // 7. videoServerAPI로 Scene별 영상 동시 생성 요청 (이미지 + 자막 데이터 포함)
        const finalSceneDataList: SceneData[] = await Promise.all(
            sceneDataWithVideoGenPromptList.map(async (sceneData): Promise<SceneData> => {
                const requestId = await videoServerAPI.postVideo(
                    sceneData,
                    postVideoGenerationTaskResult.id as string,
                );
                
                return {
                    ...sceneData,
                    requestId: requestId,
                }
            })
        );

        console.log(`requestIdList = ${finalSceneDataList.map(sceneData => sceneData.requestId).join(', ')}`);
        
        // 8. DB 업데이트
        const updatedVideoGenerationTask = await videoGenerationTasksServerAPI.patchVideoGenerationTask({
            id: postVideoGenerationTaskResult.id,
            scene_breakdown_list: finalSceneDataList,
            subtitle_segment_list: voiceGenerationResult.subtitleSegmentList,
            master_style_positive_prompt: masterStylePositivePrompt,
            master_style_negative_prompt: masterStyleNegativePrompt,
            video_main_subject: videoMainSubject,
        })

        if (!updatedVideoGenerationTask.id || !updatedVideoGenerationTask.created_at) {
            throw Error('Failed to update video generation task');
        }

        // 9. 음성 파일을 Supabase Storage에 저장
        const fileUploadResult = await voiceServerAPI.postNarrationBufferStream(
            voiceGenerationResult.audioBuffer,
            updatedVideoGenerationTask.id,
        );

        if (!fileUploadResult.success) {
            throw Error(`Failed to upload audio file to Supabase Storage: ${fileUploadResult.message}`);
        }

        return NextResponse.json({
            success: true,
            data: {
                taskId: updatedVideoGenerationTask.id,
            },
            message: `Voice generation, video data analysis, and ${finalSceneDataList.length} scene video generation requests completed. Task ID: ${updatedVideoGenerationTask.id}`
        });

    } catch (error) {
        console.error('Video data generation error:', error);
        return NextResponse.json(
            {
                error: 'An error occurred during video data generation.',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}