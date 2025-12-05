import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {openAIServerAPI} from "@/api/server/openAIServerAPI";
import {STYLE_DATA_LIST} from "@/lib/styles";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {usersServerAPI} from "@/api/server/usersServerAPI";

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
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video Generation Task not found.'
            });
        }

        const checkResultInitialResult = await taskCheckAndCleanupIfCancelled(videoGenerationTask);

        if (checkResultInitialResult) {
            return checkResultInitialResult;
        }


        const patchVideoGenerationTaskStatusResult = await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT);

        const checkInitialResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusResult);

        if (checkInitialResult) {
            return checkInitialResult;
        }


        // Scene 생성 단계에서 이미 저장됨
        const selectedStyleId = videoGenerationTask.selected_style_id;
        const selectedStyle = STYLE_DATA_LIST.find((styleData) => {
            return styleData.id == selectedStyleId;
        });

        if (!selectedStyle) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Style data not found.'
            });
        }

        // 2. openAIServerAPI로 비디오 Scene 분리 데이터, 마스터 스타일 프롬프트 생성 요청
        const postMasterStylePromptResult = await openAIServerAPI.postMasterStylePrompt(
            selectedStyle,
            patchVideoGenerationTaskStatusResult.scene_breakdown_list.map((sceneData) => {
                return {
                    sceneNumber: sceneData.sceneNumber,
                    sceneNarration: sceneData.narration,
                }
            })
        );

        if (!postMasterStylePromptResult.success || !postMasterStylePromptResult.masterStylePositivePromptInfo || !postMasterStylePromptResult.masterStyleNegativePrompt) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

            return getNextBaseResponse({
                success: false,
                status: 500,
                error: postMasterStylePromptResult?.error?.message || 'Failed to generate master style with OpenAI'
            });
        }

        const masterStylePositivePromptInfo = postMasterStylePromptResult.masterStylePositivePromptInfo;
        const masterStyleNegativePrompt = postMasterStylePromptResult.masterStyleNegativePrompt;
        const entityManifestList = postMasterStylePromptResult.entityManifestList;

        const patchVideoGenerationTaskStatusFinalResult = await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            status: VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT,
            master_style_positive_prompt: masterStylePositivePromptInfo,
            master_style_negative_prompt: masterStyleNegativePrompt,
            entity_manifest_list: entityManifestList,
        });

        const sceneDataList = videoGenerationTask.scene_breakdown_list;
        const sceneCount = sceneDataList.length;
        const totalDuration = sceneDataList.reduce((acc, sceneData) => {
            return acc + sceneData.sceneDuration;
        }, 0);
        const additionalTotalDurationUsage = totalDuration > 30
            ? Math.ceil((totalDuration - 30) / 2) * 5
            : 0;
        const additionalSceneCountUsage = sceneCount > 6
            ? (sceneCount - 6) * 5
            : 0;
        const creditUsage = 100 + additionalTotalDurationUsage + additionalSceneCountUsage;
        const patchUserCreditCountResult = await usersServerAPI.patchUserCreditCountByUserId(videoGenerationTask.user_id, -creditUsage);

        if (!patchUserCreditCountResult) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to patch user\'s credit count.'
            });
        }

        const checkFinalResult = await taskCheckAndCleanupIfCancelled(patchVideoGenerationTaskStatusFinalResult);

        if (checkFinalResult) {
            return checkFinalResult;
        }

        // fire and forget
        fetch(`${process.env.BASE_URL}/api/video/process/image?taskId=${taskId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        }).catch(error => {
            console.error('[/api/video/process/master-style] Fire and forget fetch error:', error);
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Master Style Prompt is successfully generated."
        })
    } catch (error) {
        console.error(error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to generate Master Style Prompt.",
        })
    }
}