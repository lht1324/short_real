import { NextRequest, NextResponse } from "next/server";
import { BaseSunoAPIResponse, PostGenerateWebhookPayload, PostGenerateWebhookType } from "@/api/types/suno-api/SunoAPIResponses";
import { musicServerAPI } from "@/api/server/musicServerAPI";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {waitUntil} from "@vercel/functions";

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

        const body = await request.json() as BaseSunoAPIResponse<PostGenerateWebhookPayload>;

        // 요청 검증
        if (!body || !body.data) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Invalid webhook payload'
            });
        }

        const webhookData = body.data;

        // 필수 필드 검증
        if (!webhookData.callbackType || !webhookData.task_id) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Missing required fields: callbackType, task_id'
            });
        }

        console.log('Suno API Webhook received:', {
            callbackType: webhookData.callbackType,
            taskId: webhookData.task_id,
            dataCount: webhookData.data?.length || 0
        });

        // 콜백 타입에 따른 비즈니스 로직 처리
        const processWebhookBackgroundJob = async () => {
            try {
                switch (webhookData.callbackType) {
                    case PostGenerateWebhookType.TEXT:
                        console.log('가사 생성 완료');
                        break;

                    case PostGenerateWebhookType.FIRST:
                        console.log('첫 번째 오디오 생성 완료');
                        // TODO: 필요시 첫 번째 오디오 처리 로직 추가
                        break;

                    case PostGenerateWebhookType.COMPLETE:
                        console.log('모든 생성 완료 - 음악 파일 업로드 시작');

                        if (webhookData.data && webhookData.data.length > 0) {
                            try {
                                // audio_url에서 파일 다운로드
                                const musicFileList: Blob[] = [];
                                const musicMetadataList = webhookData.data;

                                for (const musicMetaData of musicMetadataList) {
                                    if (musicMetaData.audio_url) {
                                        const response = await fetch(musicMetaData.audio_url);
                                        if (response.ok) {
                                            const musicBlob = await response.blob();
                                            musicFileList.push(musicBlob);
                                        } else {
                                            console.error(`Failed to download music from ${musicMetaData.audio_url}`);
                                        }
                                    }
                                }

                                if (musicFileList.length > 0) {
                                    // Supabase Storage에 업로드
                                    const uploadResult = await musicServerAPI.postMusic(
                                        taskId,
                                        musicFileList,
                                        musicMetadataList.map((musicMetaData) => {
                                            return {
                                                title: musicMetaData.title,
                                                tagList: musicMetaData.tags.split(", "),
                                                audioUrl: musicMetaData.source_audio_url,
                                                // imageUrl: musicMetaData.source_image_url,
                                                imageUrl: musicMetaData.image_url,
                                                duration: musicMetaData.duration,
                                            }
                                        }),
                                    );

                                    if (uploadResult.success) {
                                        console.log(`Successfully uploaded ${musicFileList.length} music files for task: ${taskId}`);

                                        // Task 상태 'EDITOR'로 업데이트
                                        await videoGenerationTasksServerAPI.patchVideoGenerationTaskStatus(taskId, VideoGenerationTaskStatus.EDITOR);
                                    } else {
                                        console.error(`Failed to upload music files for task: ${taskId}`, uploadResult.error);
                                    }
                                } else {
                                    console.warn('No valid music files to upload');
                                }
                            } catch (error) {
                                console.error('Error processing music files:', error);
                            }
                        } else {
                            console.warn('No music data received in COMPLETE callback');
                        }
                        break;

                    case PostGenerateWebhookType.ERROR:
                        console.error('음악 생성 실패:', webhookData);
                        break;

                    default:
                        console.warn('Unknown callback type:', webhookData.callbackType);
                        break;
                }
            } catch (error) {
                console.error('Error in POST /webhook/suno-api background job:', error);
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            }
        }

        waitUntil(processWebhookBackgroundJob())

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Generated music with Suno-API successfully.",
        });
    } catch (error) {
        console.error('Error in POST /webhook/suno-api:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Failed to process webhook'
        });
    }
}