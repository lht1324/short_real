import {NextRequest, NextResponse} from 'next/server';
import {openAIServerAPI} from '@/api/server/openAIServerAPI';
import {videoServerAPI} from '@/api/server/videoServerAPI';
import {videoGenerationTasksServerAPI} from '@/api/server/videoGenerationTasksServerAPI';
import {SceneData, VideoGenerationTaskStatus,} from "@/api/types/supabase/VideoGenerationTasks";
import {imageServerAPI} from "@/api/server/imageServerAPI";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {findOptimalVideoParameters} from "@/utils/videoUtils";
import {MasterStyleInfo} from "@/api/server/MasterStyleInfo";
import {PostVideoRequest} from "@/api/types/api/video/PostVideoRequest";
import {taskCheckAndCleanupIfCancelled} from "@/app/api/video/process/taskCheckAndCleaupIfCancelled";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();
    
    try {
        const body = await request.json();
        const {
            userId,
            taskId,
            style,
        }: PostVideoRequest = body;

        // 필수 필드 검증
        if (!userId || !taskId || !style) {
            return NextResponse.json(
                { error: 'narrationScript, styleId, voiceId, and userId are required.' },
                { status: 400 }
            );
        }

        // 1. 기존 저장된 TaskData 가져오기
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask || !videoGenerationTask.narration_script || !videoGenerationTask.scene_breakdown_list || !videoGenerationTask.video_main_subject) {
            return NextResponse.json(
                { error: 'Failed to get task data.' },
                { status: 500 }
            );
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkResultInitialResult) {
            return checkResultInitialResult;
        }

        const sceneDataList = videoGenerationTask.scene_breakdown_list;
        const videoMainSubject = videoGenerationTask.video_main_subject;

        const patchVideoGenerationTaskStatusMasterStylePromptResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT);

        const checkResultGeneratingMasterStylePromptResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusMasterStylePromptResult);

        if (checkResultGeneratingMasterStylePromptResult) {
            return checkResultGeneratingMasterStylePromptResult;
        }

        // 2. openAIServerAPI로 비디오 Scene 분리 데이터, 마스터 스타일 프롬프트 생성 요청
        const postMasterStylePromptResult = await openAIServerAPI.postMasterStylePrompt(style)

        if (!postMasterStylePromptResult.success || !postMasterStylePromptResult.masterStylePositivePromptInfo || !postMasterStylePromptResult.masterStyleNegativePrompt) {
            return NextResponse.json(
                { error: postMasterStylePromptResult?.error?.message || 'Failed to generate master style with OpenAI' },
                { status: 500 }
            );
        }

        const masterStylePositivePromptInfo: MasterStyleInfo = postMasterStylePromptResult.masterStylePositivePromptInfo;
        const masterStyleNegativePrompt = postMasterStylePromptResult.masterStyleNegativePrompt;

        const patchVideoGenerationTaskStatusImagePromptResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT,
            master_style_positive_prompt: masterStylePositivePromptInfo,
            master_style_negative_prompt: masterStyleNegativePrompt,
        });

        const checkResultGeneratingImagePromptResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusImagePromptResult);

        if (checkResultGeneratingImagePromptResult) {
            return checkResultGeneratingImagePromptResult;
        }

        // 4. openAIServerAPI로 이미지 생성용, 영상 생성용 프롬프트 생성 요청
        const sceneDataWithImageGenPromptPromiseList: Promise<SceneData>[] = sceneDataList.map(async (sceneData) => {
            const postImageGenPromptResult = await openAIServerAPI.postImageGenPrompt(
                sceneData.imageGenPromptDirective,
                // masterStylePositivePrompt,
                masterStylePositivePromptInfo,
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
                taskId,
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

        const patchVideoGenerationTaskStatusVideoPromptResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT);

        const checkResultGeneratingVideoPromptResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusVideoPromptResult);

        if (checkResultGeneratingVideoPromptResult) {
            return checkResultGeneratingVideoPromptResult;
        }

        const sceneDataWithVideoGenPromptPromiseList: Promise<SceneData>[] = sceneDataWithImageGenPromptList.map(async (sceneData) => {
            const { data: imageData, error: imageError } = await supabase.storage
                .from("scene_image_temp_storage")
                .download(`${taskId}/${sceneData.sceneNumber}.jpeg`)

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
        const patchVideoGenerationTaskStatusVideoResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.GENERATING_VIDEO);

        const checkResultGeneratingVideoResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusVideoResult);

        if (checkResultGeneratingVideoResult) {
            return checkResultGeneratingVideoResult;
        }

        const finalSceneDataList: SceneData[] = await Promise.all(
            sceneDataWithVideoGenPromptList.map(async (sceneData): Promise<SceneData> => {
                const requestId = await videoServerAPI.postVideo(
                    sceneData,
                    taskId,
                );
                
                return {
                    ...sceneData,
                    requestId: requestId,
                }
            })
        );

        console.log(`requestIdList = ${finalSceneDataList.map(sceneData => sceneData.requestId).join(', ')}`);
        
        // 8. DB 업데이트
        const updatedVideoGenerationTask = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            scene_breakdown_list: finalSceneDataList,
        });

        if (!updatedVideoGenerationTask.id || !updatedVideoGenerationTask.created_at) {
            throw Error('Failed to update video generation task');
        }

        const checkResultFinal = await taskCheckAndCleanupIfCancelled(updatedVideoGenerationTask);

        if (checkResultFinal) {
            return checkResultFinal;
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