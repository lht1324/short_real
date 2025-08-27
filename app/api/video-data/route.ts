import { NextRequest, NextResponse } from 'next/server';
import { voiceServerAPI } from '@/api/server/voiceServerAPI';
import { openAIServerAPI } from '@/api/server/openAIServerAPI';
import { videoServerAPI } from '@/api/server/videoServerAPI';
import { videoGenerationTasksServerAPI } from '@/api/server/videoGenerationTasksServerAPI';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const {
            narrationScript,
            voiceId,
            voiceSettings,
            modelId,
            outputFormat,
            userId,
            title
        } = body;

        // 필수 필드 검증
        if (!narrationScript || !voiceId || !userId) {
            return NextResponse.json(
                { error: 'narrationScript, voiceId, and userId are required.' },
                { status: 400 }
            );
        }

        // 1. voiceServerAPI로 음성 생성 및 Base64 인코딩
        const audioResult = await voiceServerAPI.postNarrationWithBase64({
            text: narrationScript,
            voice_id: voiceId,
            model_id: modelId,
            voice_settings: voiceSettings,
            output_format: outputFormat
        });

        // 2. openAIServerAPI로 음성+텍스트 분석
        const videoDataResult = await openAIServerAPI.postOpenAIAudioVideoData({
            narrationScript,
            audioBase64: audioResult.audioBase64
        });

        if (!videoDataResult.success || !videoDataResult.data) {
            return NextResponse.json(
                { error: videoDataResult.error?.message || 'Failed to generate video data with OpenAI' },
                { status: 500 }
            );
        }

        // 3. videoServerAPI로 Scene별 영상 생성 요청
        const sceneVideoRequests = await videoServerAPI.postScenesVideo({
            videoPrompt: videoDataResult.data.videoPrompt,
            sceneBreakdown: videoDataResult.data.sceneBreakdown
        });

        // 4. DB에 저장 (video_generation_tasks 테이블)
        const taskData = {
            user_id: userId,
            title,
            status: 'pending' as const,
            video_prompt: videoDataResult.data.videoPrompt,
            narration_script: narrationScript,
            scene_breakdown: videoDataResult.data.sceneBreakdown,
            estimated_duration: videoDataResult.data.estimatedDuration,
            selected_voice_id: voiceId
        };

        const createdTask = await videoGenerationTasksServerAPI.createTask(taskData);

        return NextResponse.json({
            success: true,
            data: {
                taskId: createdTask.id,
                audioBuffer: Array.from(audioResult.audioBuffer), // Buffer를 배열로 직렬화
                videoData: videoDataResult.data,
                sceneVideoRequests,
                usage: videoDataResult.usage,
                task: createdTask
            },
            message: `Voice generation, video data analysis, and ${sceneVideoRequests.length} scene video generation requests completed. Task ID: ${createdTask.id}`
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