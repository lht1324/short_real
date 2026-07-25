import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { videoServerAPI } from "@/lib/api/server/videoServerAPI";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import { SceneGenerationStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";

/**
 * 단건 씬 비디오 전용 속도 후처리 및 Storage 업로드 API
 * 파이프라인 전체 상태(status) 변경 및 씬 카운트 증가 없이, 
 * 오직 해당 씬 비디오만 속도 조절 후 Storage에 덮어씁니다.
 */
export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: "Unauthorized internal request",
        });
    }

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("taskId");
    const sceneNumberString = searchParams.get("sceneNumber");

    if (!taskId || !sceneNumberString) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: "taskId and sceneNumber are required",
        });
    }

    const sceneNumber = parseInt(sceneNumberString, 10);
    const supabase = createSupabaseServiceRoleClient();

    try {
        const requestBody = await request.json();
        const { falPayload } = requestBody;

        if (!falPayload) {
            return getNextBaseResponse({
                success: false,
                status: 400,
                error: "falPayload is required",
            });
        }

        const { request_id: requestId, status: falStatus, payload, error: falError } = falPayload;

        // 1. Task 데이터 조회
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Video Generation Task not found",
            });
        }

        const currentSceneBreakdownList = videoGenerationTask.scene_breakdown_list || [];
        const targetSceneIndex = currentSceneBreakdownList.findIndex(
            (sceneData) => sceneData.sceneNumber === sceneNumber
        );

        if (targetSceneIndex === -1) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: `Scene #${sceneNumber} not found in task`,
            });
        }

        const targetSceneData = currentSceneBreakdownList[targetSceneIndex];
        const userId = videoGenerationTask.user_id;

        if (falStatus === "OK" || falStatus === "COMPLETED" || falStatus === "completed" || falStatus === "Completed") {
            const rawVideoUrl = payload?.video?.url || payload?.output?.video?.url || payload?.url;

            if (!rawVideoUrl || typeof rawVideoUrl !== "string") {
                console.error("Fal AI Payload Structure Error:", JSON.stringify(payload));
                throw new Error(`Invalid video output URL from Fal AI for scene #${sceneNumber}`);
            }

            // 2. 목표 Duration 계산 (자막 구간 기준)
            const subtitleSegmentList = targetSceneData.sceneSubtitleSegments || [];
            let targetDuration = targetSceneData.sceneDuration || 4;

            if (subtitleSegmentList.length > 0) {
                const isLastScene = targetSceneIndex === currentSceneBreakdownList.length - 1;
                if (isLastScene) {
                    targetDuration = subtitleSegmentList[subtitleSegmentList.length - 1].endSec - subtitleSegmentList[0].startSec + 0.75;
                } else {
                    const nextSceneSubtitles = currentSceneBreakdownList[targetSceneIndex + 1]?.sceneSubtitleSegments || [];
                    if (nextSceneSubtitles.length > 0) {
                        targetDuration = nextSceneSubtitles[0].startSec - subtitleSegmentList[0].startSec;
                    }
                }
            }

            // 3. 비디오 속도 조절 후처리 (postProcessedVideo)
            console.log(`[Single Scene Speed Process] Processing video speed for Scene #${sceneNumber}...`);
            const postProcessedResult = await videoServerAPI.postProcessedVideo(rawVideoUrl, targetDuration);

            if (!postProcessedResult.success || !postProcessedResult.processedVideoUrl) {
                throw new Error(`Video speed processing failed for scene #${sceneNumber}`);
            }

            // 4. Supabase Storage 업로드 (video_raw & video_processed)
            const processedVideoResponse = await fetch(postProcessedResult.processedVideoUrl);
            if (!processedVideoResponse.ok) {
                throw new Error(`Processed video download failed: ${processedVideoResponse.statusText}`);
            }
            const processedVideoBuffer = await processedVideoResponse.arrayBuffer();

            const rawVideoResponse = await fetch(rawVideoUrl);
            if (!rawVideoResponse.ok) {
                throw new Error(`Raw video download failed: ${rawVideoResponse.statusText}`);
            }
            const rawVideoBuffer = await rawVideoResponse.arrayBuffer();

            const rawFileName = `${userId}/${taskId}/video_raw_${sceneNumber}.mp4`;
            const processedFileName = `${userId}/${taskId}/video_processed_${sceneNumber}.mp4`;

            // Storage Upload (upsert)
            await supabase.storage.from("processed_video_storage").upload(rawFileName, Buffer.from(rawVideoBuffer), {
                contentType: "video/mp4",
                upsert: true,
            });

            await supabase.storage.from("processed_video_storage").upload(processedFileName, Buffer.from(processedVideoBuffer), {
                contentType: "video/mp4",
                upsert: true,
            });

            // 5. 해당 씬의 status만 PROCESSED로 갱신 (전체 파이프라인 status 및 씬 카운트는 보존!)
            targetSceneData.status = SceneGenerationStatus.PROCESSED;
            currentSceneBreakdownList[targetSceneIndex] = targetSceneData;

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                scene_breakdown_list: currentSceneBreakdownList,
            });

            console.log(`[Single Scene Speed Process] Successfully completed Scene #${sceneNumber} video!`);

            return getNextBaseResponse({
                success: true,
                status: 200,
                message: `Scene #${sceneNumber} video speed processing completed successfully`,
            });
        } else {
            console.error(`Fal AI Webhook error for Scene #${sceneNumber}:`, falError);
            targetSceneData.status = SceneGenerationStatus.FAILED;
            currentSceneBreakdownList[targetSceneIndex] = targetSceneData;

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                scene_breakdown_list: currentSceneBreakdownList,
            });

            return getNextBaseResponse({
                success: true,
                status: 200,
                error: `Fal AI video generation failed for Scene #${sceneNumber}`,
            });
        }
    } catch (error) {
        console.error(`Error in POST /api/video/process/speed/regenerate:`, error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Unknown error occurred",
        });
    }
}
