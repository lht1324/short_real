import { NextRequest } from "next/server";
import { getIsValidRequestS2S } from "@/utils/getIsValidRequest";
import { getNextBaseResponse } from "@/utils/getNextBaseResponse";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { llmServerAPI } from "@/lib/api/server/llmServerAPI";
import { voiceServerAPI } from "@/lib/api/server/voiceServerAPI";
import { internalFireAndForgetFetch } from "@/utils/internalFetch";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";
import {AutopilotData} from "@/lib/api/types/supabase/AutopilotData";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ seriesId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const supabase = createSupabaseServiceRoleClient();


    try {
        const { seriesId } = await params;

        const { data, error } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (error) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Fetching autopilot data is failed.',
            })
        }

        const {
            id,
            user_id: userId,
            name: seriesName,
            niche_preset_id: nichePresetId,
            niche_value: nicheValue,
            voice_id: voiceId,
            topic_history: topicHistory,
        }: AutopilotData = data;

        await voiceServerAPI.postVoice("", voiceId);
        await llmServerAPI.postSceneSegmentation(taskId, "", []);

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {});

        // Fire and Forget으로 재시작 엔드포인트 호출
        internalFireAndForgetFetch(
            `${process.env.BASE_URL}/api/video?taskId=${taskId}`,
            {
                method: 'POST',
            },
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