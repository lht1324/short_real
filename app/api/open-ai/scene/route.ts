import { NextRequest, NextResponse } from 'next/server';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { PostOpenAISceneRequest } from '@/api/types/api/open-ai/scene/PostOpenAISceneRequest';
import { PostOpenAISceneResponse } from '@/api/types/api/open-ai/scene/PostOpenAISceneResponse';
import {voiceServerAPI} from "@/api/server/voiceServerAPI";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {randomUUID} from "crypto";
import {VideoGenerationTask} from "@/api/types/supabase/VideoGenerationTasks";

export async function POST(request: NextRequest): Promise<NextResponse<PostOpenAISceneResponse>> {
    try {
        const {
            taskId,
            narrationScript,
            voiceId,
            styleId,
        }: PostOpenAISceneRequest = await request.json();

        // 필수 필드 검증
        if (!narrationScript || !voiceId) {
            return NextResponse.json({
                success: false,
                error: {
                    message: 'narrationScript and voiceId is required.',
                    code: 'MISSING_REQUIRED_FIELDS'
                }
            }, { status: 400 });
        }

        const voiceGenerationResult = await voiceServerAPI.postVoice(
            narrationScript,
            voiceId,
        )

            // OpenAI API를 통해 Scene 분리 처리
        const sceneSegmentationResult = await openAIServerAPI.postSceneSegmentation(
            narrationScript,
            voiceGenerationResult.subtitleSegmentList
        );

        if (!sceneSegmentationResult.success || !sceneSegmentationResult.sceneDataList || !sceneSegmentationResult.videoMainSubject) {
            return NextResponse.json({
                success: false,
                error: {
                    message: sceneSegmentationResult.error?.message || 'Failed to generate scene segmentation',
                    code: sceneSegmentationResult.error?.code || 'SCENE_SEGMENTATION_FAILED'
                }
            }, { status: 500 });
        }

        const testUserId = randomUUID(); // OAuth 없이 테스트용 UUID 생성

        const videoGenerationTaskRequest: Partial<VideoGenerationTask> = {
            user_id: testUserId,
            narration_script: narrationScript,
            scene_breakdown_list: sceneSegmentationResult.sceneDataList,
            subtitle_segment_list: voiceGenerationResult.subtitleSegmentList,
            selected_style_id: styleId,
            selected_voice_id: voiceId,
            video_main_subject: sceneSegmentationResult.videoMainSubject,
        }
        const videoGenerationTask: VideoGenerationTask | null = !taskId
            ? await videoGenerationTasksServerAPI.postVideoGenerationTask(videoGenerationTaskRequest)
            : await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, videoGenerationTaskRequest);

        if (!videoGenerationTask || !videoGenerationTask.id) {
            return NextResponse.json({
                success: false,
                error: {
                    message: sceneSegmentationResult.error?.message || 'Failed to insert row into video generation task table.',
                    code: sceneSegmentationResult.error?.code || 'SCENE_SEGMENTATION_FAILED'
                }
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            data: {
                taskId: videoGenerationTask.id,
                sceneDataList: sceneSegmentationResult.sceneDataList || [],
                videoMainSubject: sceneSegmentationResult.videoMainSubject || ''
            }
        });

    } catch (error) {
        console.error('Scene segmentation API error:', error);

        return NextResponse.json({
            success: false,
            error: {
                message: 'An error occurred during scene segmentation processing.',
                code: 'INTERNAL_SERVER_ERROR'
            }
        }, { status: 500 });
    }
}