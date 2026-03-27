import {NextRequest} from "next/server";
import {videoGenerationTasksServerAPI} from "@/lib/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTaskStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {getIsValidRequestC2S, getIsValidRequestS2S} from "@/utils/getIsValidRequest";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";
import {usersServerAPI} from "@/lib/api/server/usersServerAPI";
import {
    RETRY_CREDIT_MUSIC_GENERATION,
    RETRY_CREDIT_PER_SCENE,
    RETRY_CREDIT_PER_VIDEO_DURATION
} from "@/lib/ADDITIONAL_CREDIT_AMOUNT";

interface RetryPathData {
    path: string;
    restType: 'POST' | 'GET' | 'PUT' | 'DELETE';
    body?: unknown;
}

export async function POST(
    request: NextRequest,
    context: { params: Promise<{ taskId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const searchParams = request.nextUrl.searchParams;

    const { taskId } = await context.params;
    const sessionUserId = searchParams.get('userId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    try {
        // Task 데이터 가져오기
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            return getNextBaseResponse({
                status: 404,
                success: false,
                message: `Task not found`
            });
        }

        const taskStatus = videoGenerationTask.status;

        if (!taskStatus) {
            return getNextBaseResponse({
                status: 500,
                success: false,
                message: `Task status is not defined.`
            });
        }

        // 크레딧 차감 로직
        let requiredCredits = 0;

        switch (taskStatus) {
            case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: {
                const sceneCount = videoGenerationTask.scene_breakdown_list.length;

                // 이미지 재생성 비용: 씬 개수 * 씬당 비용
                requiredCredits = sceneCount * RETRY_CREDIT_PER_SCENE;
                break;
            }
            case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
            case VideoGenerationTaskStatus.GENERATING_VIDEO: {
                const videoDuration = videoGenerationTask.scene_breakdown_list.reduce((acc, sceneData) => {
                    return acc + sceneData.sceneDuration;
                }, 0);

                // 비디오 재생성 비용: 영상 길이(초, 올림) * 초당 비용
                requiredCredits = Math.ceil(videoDuration) * RETRY_CREDIT_PER_VIDEO_DURATION;
                break;
            }
            case VideoGenerationTaskStatus.COMPOSING_MUSIC:
                // 음악 재생성 비용: 고정 비용
                requiredCredits = RETRY_CREDIT_MUSIC_GENERATION;
                break;
            default:
                // 그 외 상태는 무료 재시도 (또는 정책에 따라 추가)
                break;
        }

        if (requiredCredits > 0) {
            // 인증으로 넘어오는 user 객체가 users 테이블 객체과 같은 값 갖는지 확인
            const currentUser = await usersServerAPI.getUserByUserId(sessionUserId);
            const currentCredits = currentUser?.credit_count ?? 0;

            if (currentCredits < requiredCredits) {
                return getNextBaseResponse({
                    status: 402, // Payment Required
                    success: false,
                    message: `Insufficient credits. Required: ${requiredCredits}, Available: ${currentCredits}`
                });
            }

            // 크레딧 차감 (음수 값 전달)
            await usersServerAPI.patchUserCreditCountByUserId(sessionUserId, -requiredCredits);
        }

        const getRetryPathAndRestType = (): RetryPathData | null => {
            switch (taskStatus) {
                case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT: {
                    return {
                        path: "/api/video/process/master-style",
                        restType: "POST",
                        body: undefined,
                    }
                }
                case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT: {
                    return {
                        path: "/api/video/process/image",
                        restType: "POST",
                        body: undefined,
                    }
                }
                // 보통 프롬프트가 잘못 돼서 모델이 이상해지니 프롬프트 생성부터 다시 시작
                case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
                case VideoGenerationTaskStatus.GENERATING_VIDEO: {
                    return {
                        path: "/api/video/process/video",
                        restType: 'POST',
                        body: undefined,
                    };
                }
                case VideoGenerationTaskStatus.STITCHING_VIDEOS: {
                    return {
                        path: `/api/video/merge`,
                        restType: 'POST',
                        body: undefined,
                    };
                }
                case VideoGenerationTaskStatus.COMPOSING_MUSIC: {
                    return {
                        path: `/api/music`,
                        restType: 'POST',
                        body: undefined,
                    };
                }
                case VideoGenerationTaskStatus.FINALIZING: {
                    if (!videoGenerationTask.final_video_merge_data) {
                        console.error(`final_video_merge_data not found for task: ${taskId}`);
                        return null;
                    }

                    return {
                        path: `/api/video/merge/final`,
                        restType: 'POST',
                        body: undefined
                    };
                }
                default: {
                    return null;
                }
            }
        }

        const retryPathData = getRetryPathAndRestType();

        if (!retryPathData) {
            return getNextBaseResponse({
                status: 500,
                success: false,
                error: `Cannot retry from status: ${taskStatus}`
            });
        }

        // is_generation_failed를 false로 업데이트
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            // VIDEO/PROCESS
            ...((
                taskStatus === VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT || taskStatus === VideoGenerationTaskStatus.GENERATING_VIDEO
            ) && {
                processed_scene_count: 0,
            }),

            // FINALIZING
            ...(taskStatus === VideoGenerationTaskStatus.FINALIZING && {
                caption_completed: false,
                music_completed: false,
                merge_started: false,
            }),

            is_generation_failed: false
        });

        // Fire and Forget으로 재시작 엔드포인트 호출
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}${retryPathData.path}?taskId=${taskId}&isRetry=true`,
            {
                method: 'POST',
            },
            retryPathData.body ?? undefined,
        )

        // 즉시 응답
        return getNextBaseResponse({
            status: 200,
            success: true,
            message: "Retry started successfully",
        });
    } catch (error) {
        console.error("Error in POST /api/video/task/[taskId]/retry:", error);
        return getNextBaseResponse({
            status: 500,
            success: false,
            message: "Failed to retry task"
        });
    }
}
