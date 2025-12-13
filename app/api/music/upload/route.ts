import { NextRequest } from "next/server";
import { GeneratedMusicMetadata } from "@/api/types/suno-api/SunoAPIResponses";
import { musicServerAPI } from "@/api/server/musicServerAPI";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {taskCheckAndCleanupIfCancelled} from "@/utils/taskCheckAndCleanupIfCancelled";
import {VideoGenerationTaskStatus} from "@/api/types/supabase/VideoGenerationTasks";
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

        const result: {
            musicMetadataList?: GeneratedMusicMetadata[];
        } = await request.json();

        // 요청 검증
        if (!result || !result.musicMetadataList) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'Invalid request'
            });
        }

        console.log('모든 음악 생성 완료 - 음악 파일 업로드 시작');

        const musicMetadataList = result.musicMetadataList;

        if (musicMetadataList.length > 0) {
            try {
                // audio_url에서 파일 다운로드
                const musicFileList: Blob[] = [];

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