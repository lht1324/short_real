import {NextRequest, NextResponse} from "next/server";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {STYLE_DATA_LIST} from "@/lib/styles";

interface RetryPathData {
    path: string;
    restType: 'POST' | 'GET' | 'PUT' | 'DELETE';
    body?: unknown;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ taskId: string }> }
): Promise<NextResponse<{
    status: number;
    success: boolean;
    message: string;
}>> {
    try {
        const { taskId } = await params;

        // Task 데이터 가져오기
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            return NextResponse.json({
                status: 404,
                success: false,
                message: `Task not found`
            });
        }

        const taskStatus = videoGenerationTask.status;

        if (!taskStatus) {
            return NextResponse.json({
                status: 500,
                success: false,
                message: `Task status is not defined.`
            });
        }

        const getRetryPathAndRestType = (): RetryPathData | null => {
            switch (taskStatus) {
                case VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT:
                case VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT:
                case VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT:
                case VideoGenerationTaskStatus.GENERATING_VIDEO: {
                    // Style 객체 찾기
                    const style = STYLE_DATA_LIST.find(s => s.id === videoGenerationTask.selected_style_id);

                    if (!style) {
                        console.error(`Style not found: ${videoGenerationTask.selected_style_id}`);
                        return null;
                    }

                    return {
                        path: "/api/video/process",
                        restType: 'POST',
                        body: {
                            userId: videoGenerationTask.user_id,
                            taskId: taskId,
                            style: style,
                        }
                    };
                }
                case VideoGenerationTaskStatus.STITCHING_VIDEOS: {
                    return {
                        path: "/api/video/merge",
                        restType: 'POST',
                        body: {
                            generationTaskId: taskId
                        }
                    };
                }
                case VideoGenerationTaskStatus.COMPOSING_MUSIC: {
                    return {
                        path: `/api/music?generationTaskId=${taskId}`,
                        restType: 'POST',
                        body: undefined
                    };
                }
                case VideoGenerationTaskStatus.FINALIZING: {
                    if (!videoGenerationTask.final_video_merge_data) {
                        console.error(`final_video_merge_data not found for task: ${taskId}`);
                        return null;
                    }

                    return {
                        path: `/api/video/merge/final?taskId=${taskId}`,
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
            return NextResponse.json({
                status: 400,
                success: false,
                message: `Cannot retry from status: ${taskStatus}`
            });
        }

        // is_generation_failed를 false로 업데이트
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            // VIDEO/PROCESS
            ...((
                taskStatus === VideoGenerationTaskStatus.GENERATING_MASTER_STYLE_PROMPT
                || taskStatus === VideoGenerationTaskStatus.GENERATING_IMAGE_PROMPT
                || taskStatus === VideoGenerationTaskStatus.GENERATING_VIDEO_PROMPT
                || taskStatus === VideoGenerationTaskStatus.GENERATING_VIDEO
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
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        fetch(`${baseUrl}${retryPathData.path}`, {
            method: retryPathData.restType,
            headers: {
                'Content-Type': 'application/json',
            },
            body: retryPathData.body ? JSON.stringify(retryPathData.body) : undefined
        }).catch(error => {
            console.error('Fire and forget fetch error:', error);
        });

        // 즉시 응답
        return NextResponse.json({
            status: 200,
            success: true,
            message: "Retry started successfully",
        });
    } catch (error) {
        console.error("Error in POST /api/video/task/[taskId]/retry:", error);
        return NextResponse.json({
            status: 500,
            success: false,
            message: "Failed to retry task"
        });
    }
}
