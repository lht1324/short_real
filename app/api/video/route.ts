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
import {MasterNegativePrompts} from "@/lib/MasterNegativePrompts";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

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
        // const normalizeWord = (text: string) => {
        //     return text
        //         .replace(/—/g, '--') // Em dash를 일반 하이픈 두 개로
        //         .replace(/[’‘]/g, "'")   // 스마트 따옴표를 일반 아포스트로피로
        //         .replace(/[“”]/g, '"')   // 스마트 큰따옴표를 일반 큰따옴표로
        //         .replace(/[-.,!?']/g, "") // 기존 문장 부호 제거
        //         .toLowerCase(); // ★★★ 소문자로 통일하여 비교 정확도 향상 ★★★
        // };
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
            // const sceneNarrationWords = sceneData.narration.replace(/[-.,!?']/g, "").split(/\s+/);
            const sceneNarrationWords = sceneData.narration.split(/\s+/).map(normalizeWord).filter(w => w);
            const segmentsForScene: SubtitleSegment[] = [];

            // 전체 자막 리스트에서 현재 Scene의 단어들과 일치하는 부분을 찾음
            sceneNarrationWords.forEach((word) => {
                let found = false;

                for (let wordIndex = currentWordIndex; wordIndex < fullSubtitleList.length; wordIndex++) {
                    // const cleanSegmentWord = fullSubtitleList[wordIndex].word.replace(/[-.,!?']/g, "");
                    const cleanSegmentWord = normalizeWord(fullSubtitleList[wordIndex].word);

                    if (cleanSegmentWord === word) {
                        segmentsForScene.push(fullSubtitleList[wordIndex]);
                        currentWordIndex = wordIndex + 1;
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    // 예외 처리: 단어를 찾지 못한 경우
                    console.warn(`Could not find the word "${word}" for scene ${sceneData.sceneNumber}`);
                }
            })

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
            const combinedMasterNegativeKeywords = `${masterStyleNegativePrompt}, ${MasterNegativePrompts.Common}`.split(/\s*,\s*/);
            const uniqueMasterNegativeKeywordSet = new Set(combinedMasterNegativeKeywords);
            const uniqueMasterNegativePrompt = Array.from(uniqueMasterNegativeKeywordSet).join(", ");

            const postImageResult = await imageServerAPI.postImage(
                sceneData.imageGenPrompt as string,
                postVideoGenerationTaskResult.id as string,
                sceneData.sceneNumber,
                uniqueMasterNegativePrompt,
                // `${masterStyleNegativePrompt}, ${MasterNegativePrompts.Common}`,
            );

            if (!postImageResult.success) {
                return NextResponse.json(
                    { error: 'Failed to generate image with Imagen 4.' },
                    { status: 500 }
                );
            }
        }

        const sceneDataWithVideoGenPromptPromiseList: Promise<SceneData>[] = sceneDataWithImageGenPromptList.map(async (sceneData) => {
            // const { data, error } = await supabase.storage
            //     .from('scene_image_temp_storage')
            //     .createSignedUrl(`${postVideoGenerationTaskResult.id}/${sceneData.sceneNumber}.jpeg`, 3600);
            //
            // if (error || !data?.signedUrl) {
            //     throw new Error(error?.message || `Scene ${sceneData.sceneNumber}: 이미지 데이터가 없습니다.`);
            // }
            //
            // const imageUrl = data.signedUrl;

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

            const postVideoGenPromptResult = await openAIServerAPI.postVideoGenPrompt(
                sceneData.imageGenPrompt as string,
                sceneData.narration,
                imageBase64,
            );

            // if (!(postVideoGenPromptResult.success) || !(postVideoGenPromptResult.videoGenPrompt)) {
            //     throw new Error("Failed to generate video gen prompt");
            // }

            if (!postVideoGenPromptResult.success || !postVideoGenPromptResult.videoGenPositivePrompt || !postVideoGenPromptResult.videoGenNegativePrompt) {
                throw new Error("Failed to generate video gen prompt");
            }

            return {
                ...sceneData,
                // videoGenPrompt: postVideoGenPromptResult.videoGenPrompt,
                videoGenPrompt: postVideoGenPromptResult.videoGenPositivePrompt,
                videoGenNegativePrompt: postVideoGenPromptResult.videoGenNegativePrompt,
            }
        });
        const sceneDataWithVideoGenPromptList = await Promise.all(sceneDataWithVideoGenPromptPromiseList);

        // let sceneDataWithGenPromptList: SceneData[];
        // try {
        //     sceneDataWithGenPromptList = await Promise.all(
        //         sceneDataList.map(async (sceneData) => {
        //             const postImageGenPromptResult = await openAIServerAPI.postImageGenPrompt(sceneData.imageGenPromptDirective, masterStylePrompt);
        //
        //             if (!(postImageGenPromptResult.success) || !(postImageGenPromptResult.imageGenPrompt)) {
        //                 return sceneData;
        //             }
        //
        //             const imageGenPrompt = postImageGenPromptResult.imageGenPrompt;
        //
        //             // 분리 예정 -> 이미지 생성용 프롬프트로 이미지 생성하고 영상 생성용 프롬프트 생성할 때 이미지도 넣어주기
        //             const postVideoGenPromptResult = await openAIServerAPI.postVideoGenPrompt(imageGenPrompt, sceneData.narration);
        //
        //             if (!(postVideoGenPromptResult.success) || !(postVideoGenPromptResult.videoGenPrompt)) {
        //                 return sceneData;
        //             }
        //
        //             const videoGenPrompt = postVideoGenPromptResult.videoGenPrompt;
        //
        //             return {
        //                 ...sceneData,
        //                 imageGenPrompt: imageGenPrompt,
        //                 videoGenPrompt: videoGenPrompt,
        //             }
        //         })
        //     )
        // } catch (error) {
        //     console.log("1st Promise.all() error: ", error);
        //     return NextResponse.json(
        //         { error: 'An unexpected error occurred during prompt generation.' },
        //         { status: 500 }
        //     );
        // }
        //
        // const isFailedPostGenPrompt = sceneDataWithGenPromptList.some((sceneData) => {
        //     return !(sceneData.imageGenPrompt) || !(sceneData.videoGenPrompt);
        // });
        //
        // if (isFailedPostGenPrompt) {
        //     return NextResponse.json(
        //         { error: 'Failed to generate image gen prompt' },
        //         { status: 500 }
        //     );
        // }
        //
        // // 5. geminiServerAPI로 Scene별 이미지 생성 요청 (imageBase64)
        // const sceneDataWithImageList: SceneData[] = await Promise.all(
        //     sceneDataWithGenPromptList.map(async (sceneData) => {
        //         const postImageResult = await imageServerAPI.postImage(
        //             sceneData.imageGenPrompt as string,
        //             postVideoGenerationTaskResult.id as string,
        //             sceneData.sceneNumber,
        //             MasterNegativePrompts.Anime,
        //         );
        //
        //         return {
        //             ...sceneData,
        //             imageBase64: postImageResult.success
        //                 ? postImageResult.imageBase64
        //                 : undefined,
        //         }
        //     })
        // );
        //
        // if (sceneDataWithImageList.some((sceneData) => !(sceneData.imageBase64))) {
        //     return NextResponse.json(
        //         { error: 'Failed to generate image with Imagen 4' },
        //         { status: 500 }
        //     );
        // }
        //
        // console.log(`이미지 생성 완료. 성공: `, sceneDataWithImageList.map((sceneData) => {
        //     return {
        //         ...sceneData,
        //         imageBase64: undefined,
        //         isImageGenerated: !!sceneData.imageBase64,
        //     }
        // }));

        console.log(`최종 Scene 데이터 준비 완료. Scene 수: ${sceneDataWithVideoGenPromptList.length}`);

        // 7. videoServerAPI로 Scene별 영상 동시 생성 요청 (이미지 + 자막 데이터 포함)
        const finalSceneDataList: SceneData[] = await Promise.all(
            sceneDataWithVideoGenPromptList.map(async (sceneData): Promise<SceneData> => {
                const requestId = await videoServerAPI.postVideo(
                    sceneData,
                    // MasterNegativePrompts.Anime,
                    `${MasterNegativePrompts.Common} ${sceneData.videoGenNegativePrompt}`,
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
        // const testUserId = userId || randomUUID(); // OAuth 없이 테스트용 UUID 생성
        const updatedVideoGenerationTask = await videoGenerationTasksServerAPI.patchVideoGenerationTask({
            id: postVideoGenerationTaskResult.id,
            scene_breakdown_list: finalSceneDataList,
            subtitle_segment_list: voiceGenerationResult.subtitleSegmentList,
            master_style_negative_prompt: masterStyleNegativePrompt,
        })
        // const createdTask = await videoGenerationTasksServerAPI.postVideoGenerationTask(taskData);

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