import {NextRequest, NextResponse} from "next/server";
import {sunoAPIServerAPI} from "@/api/server/sunoAPIServerAPI";
import {PostGenerateRequest, SunoModelType} from "@/api/types/suno-api/SunoAPIRequests";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function POST(request: NextRequest) {
    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Task not found",
            });
        }

        const checkingInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkingInitialResult) {
            return checkingInitialResult;
        }

        // 필수 데이터 검증
        if (!videoGenerationTask.video_main_subject) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'video_main_subject is missing from task'
            });
        }

        if (!videoGenerationTask.master_style_positive_prompt) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'master_style_positive_prompt is missing from task'
            });
        }

        // OpenAI로 Music Generation Data 생성
        const postMusicGenerationDataResult = await openAIServerAPI.postMusicGenerationData(
            videoGenerationTask.video_main_subject,
            videoGenerationTask.narration_script,
            videoGenerationTask.master_style_positive_prompt,
            videoGenerationTask.scene_breakdown_list,
        );

        if (!postMusicGenerationDataResult.success || !postMusicGenerationDataResult.data) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: postMusicGenerationDataResult.error ?? 'Failed to generate music data',
            });
        }

        const {
            prompt,
            style,
            title,
            negativeTags,
            // styleWeight,
            // weirdnessConstraint,
            // audioWeight,
        } = postMusicGenerationDataResult.data;

        // 필수 파라미터 검증
        if (!prompt || !style || !title) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to generate music generation data: prompt, style, title'
            });
        }

        const baseUrl = process.env.BASE_URL;

        const fullRequest: PostGenerateRequest = {
            prompt: prompt,
            style: style,
            title: title,
            customMode: true,
            instrumental: true,
            model: SunoModelType.V4_5,
            styleWeight: 0.65,
            weirdnessConstraint: 0.65,
            audioWeight: 0.65,
            callBackUrl: `${baseUrl}/webhook/suno-api?taskId=${taskId}`,
        }

        // Suno API를 통한 음악 생성 요청
        const result = await sunoAPIServerAPI.postGenerate(fullRequest);

        if (!result) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to request music generation.'
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Requested generation music successfully.",
        });
    } catch (error) {
        console.error('Error in POST /api/music:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Failed to generate music.'
        });
    }
}