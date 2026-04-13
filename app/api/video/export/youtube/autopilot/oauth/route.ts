import { NextRequest, NextResponse } from 'next/server';
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { getIsValidRequestC2S } from "@/lib/utils/getIsValidRequest";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { internalFireAndForgetFetch } from "@/lib/utils/internalFetch";
import { videoGenerationTasksServerAPI } from "@/lib/api/server/videoGenerationTasksServerAPI";
import { ExportPlatform, ExportStatus } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { ExportPrivacySetting } from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";

/**
 * GET /api/video/export/youtube/autopilot/oauth
 * Initiates YouTube OAuth process for an Autopilot series.
 * Handles both initial connection and immediate upload if a task is pending.
 */
export async function GET(request: NextRequest) {
    const { isValidRequest, user } = await getIsValidRequestC2S();

    if (!isValidRequest || !user || !user.id) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized. Sign-in required.',
        });
    }

    const searchParams = request.nextUrl.searchParams;
    const seriesId = searchParams.get('seriesId') || searchParams.get('taskId'); // Flexible parameter name

    if (!seriesId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: seriesId'
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. Fetch Autopilot Data to check for pending tasks and settings
        const { data: autopilotData } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (!autopilotData) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Autopilot series not found'
            });
        }

        const series = autopilotData as AutopilotData;
        const privacySetting = searchParams.get('privacySetting') || series.youtube_privacy || ExportPrivacySetting.UNLISTED;

        // 2. Check for existing token
        const { data: existingToken } = await supabase
            .from('user_youtube_tokens')
            .select('refresh_token')
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingToken?.refresh_token) {
            // ALREADY CONNECTED: Trigger upload if a task is pending
            const pendingTaskId = series.current_generating_task_id;
            
            if (pendingTaskId) {
                internalFireAndForgetFetch(
                    `${process.env.BASE_URL}/api/video/export/youtube/upload?taskId=${pendingTaskId}&privacySetting=${privacySetting}`,
                    { method: 'POST' },
                    { userId: user.id }
                );

                await videoGenerationTasksServerAPI.patchVideoGenerationTask(pendingTaskId, {
                    export_status: ExportStatus.UPLOADING,
                    export_platform: ExportPlatform.YOUTUBE,
                });
            }

            // Redirect back to autopilot settings with the series selected
            return NextResponse.redirect(`${process.env.BASE_URL}/workspace/autopilot?seriesId=${seriesId}`);
        }

        // 3. START OAUTH: Pack 'autopilot' mode and seriesId into state
        const params = new URLSearchParams({
            client_id: process.env.GOOGLE_YOUTUBE_CLIENT_ID!,
            redirect_uri: `${process.env.BASE_URL}/callback/youtube`,
            response_type: 'code',
            scope: 'https://www.googleapis.com/auth/youtube.upload',
            access_type: 'offline',
            prompt: 'consent',
            state: encodeURIComponent(JSON.stringify({
                userId: user.id,
                seriesId: seriesId,
                mode: 'autopilot',
                privacySetting: privacySetting,
            }))
        });

        return NextResponse.redirect(
            `https://accounts.google.com/o/oauth2/v2/auth?${params}`
        );
    } catch (error) {
        console.error('YouTube autopilot auth initiate error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error'
        });
    }
}
