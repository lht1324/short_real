import { NextRequest, NextResponse } from "next/server";
import { BaseSunoAPIResponse, PostGenerateWebhookPayload, PostGenerateWebhookType } from "@/api/types/suno-api/SunoAPIResponses";
import { musicServerAPI } from "@/api/server/musicServerAPI";

export async function POST(request: NextRequest) {
    try {
        // URL에서 파라미터 추출
        const { searchParams } = new URL(request.url);
        const generationTaskId = searchParams.get('generationTaskId');

        if (!generationTaskId) {
            return NextResponse.json(
                { error: 'Missing required query param: generationTaskId' },
                { status: 400 }
            );
        }

        const body = await request.json() as BaseSunoAPIResponse<PostGenerateWebhookPayload>;

        // 요청 검증
        if (!body || !body.data) {
            return NextResponse.json(
                { error: 'Invalid webhook payload' },
                { status: 400 }
            );
        }

        const webhookData = body.data;

        // 필수 필드 검증
        if (!webhookData.callbackType || !webhookData.task_id) {
            return NextResponse.json(
                { error: 'Missing required fields: callbackType, task_id' },
                { status: 400 }
            );
        }

        console.log('Suno API Webhook received:', {
            callbackType: webhookData.callbackType,
            taskId: webhookData.task_id,
            dataCount: webhookData.data?.length || 0
        });

        // 콜백 타입에 따른 비즈니스 로직 처리
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

                        for (const musicData of webhookData.data) {
                            if (musicData.audio_url) {
                                const response = await fetch(musicData.audio_url);
                                if (response.ok) {
                                    const musicBlob = await response.blob();
                                    musicFileList.push(musicBlob);
                                } else {
                                    console.error(`Failed to download music from ${musicData.audio_url}`);
                                }
                            }
                        }

                        if (musicFileList.length > 0) {
                            // Supabase Storage에 업로드
                            const uploadResult = await musicServerAPI.postMusic(generationTaskId, musicFileList);

                            if (uploadResult.success) {
                                console.log(`Successfully uploaded ${musicFileList.length} music files for task: ${generationTaskId}`);
                            } else {
                                console.error(`Failed to upload music files for task: ${generationTaskId}`, uploadResult.error);
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

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error in POST /webhook/suno-api:', error);
        return NextResponse.json(
            { error: 'Failed to process webhook' },
            { status: 500 }
        );
    }
}