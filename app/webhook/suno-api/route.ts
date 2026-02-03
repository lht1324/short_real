import {NextRequest} from "next/server";
import {
    BaseSunoAPIResponse,
    PostGenerateWebhookPayload,
    PostGenerateWebhookType
} from "@/api/types/suno-api/SunoAPIResponses";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";
import {internalFireAndForgetFetch} from "@/utils/internalFetch";

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
        const rawBody = await request.text();
        let webhookData: PostGenerateWebhookPayload;

        try {
            const parsedBody: BaseSunoAPIResponse<PostGenerateWebhookPayload> = JSON.parse(rawBody);
            console.log("Suno Webhook Result: ", JSON.stringify(parsedBody));

            webhookData = parsedBody.data;
        } catch (error) {
            console.error("[Suno-API] Error occurred while parsing: ", error);

            return getNextBaseResponse({
                success: true,
                status: 400,
                message: "Received invalid requests.",
            });
        }

        switch (webhookData.callbackType) {
            case PostGenerateWebhookType.TEXT: {
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Received the success of lyrics generation.",
                });
            }
            case PostGenerateWebhookType.FIRST: {
                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Received the success of first music generation.",
                });
            }
            case PostGenerateWebhookType.ERROR: {
                await videoGenerationTasksServerAPI.patchVideoGenerationTaskFailed(taskId);

                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Bad request",
                });
            }
            case PostGenerateWebhookType.COMPLETE: {
                internalFireAndForgetFetch(
                    `${process.env.BASE_URL!}/api/music/upload?taskId=${taskId}`,
                    {
                        method: 'POST',
                    },
                    {
                        musicMetadataList: webhookData.data,
                    }
                );

                return getNextBaseResponse({
                    success: true,
                    status: 200,
                    message: "Received the success of every music generation.",
                });
            }
        }
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