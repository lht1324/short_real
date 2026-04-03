import { NextRequest } from "next/server";
import { getNextBaseResponse } from "@/lib/utils/getNextBaseResponse";
import { createSupabaseServiceRoleClient } from "@/lib/supabaseServiceRole";
import { AutopilotData } from "@/lib/api/types/supabase/AutopilotData";
import { getIsValidRequestS2S } from "@/lib/utils/getIsValidRequest";
import { schedules, tasks } from "@trigger.dev/sdk/v3";
import { subtractHoursFromCron } from "@/lib/utils/cronUtils";

/**
 * GET /api/autopilot-data/series/[seriesId]
 * Fetch a specific autopilot series.
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ seriesId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const sessionUserId = request.nextUrl.searchParams.get('userId');
    const { seriesId } = await context.params;

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        const { data, error } = await supabase
            .from('autopilot_data')
            .select('*')
            .eq('id', seriesId)
            .single();

        if (error) throw error;
        
        if (data.user_id !== sessionUserId) {
            return getNextBaseResponse({
                success: false,
                status: 403,
                error: "Forbidden. You can only access your own series."
            });
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotData: data as AutopilotData },
            message: "Successfully fetched autopilot series."
        });
    } catch (error) {
        console.error("Error in GET /api/autopilot-data/series/[seriesId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to fetch autopilot series."
        });
    }
}

/**
 * PATCH /api/autopilot-data/series/[seriesId]
 * Update a specific autopilot series and sync Trigger.dev schedule.
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ seriesId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const sessionUserId = request.nextUrl.searchParams.get('userId');
    const { seriesId } = await context.params;

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. Ownership Check
        const { data: existingData, error: fetchError } = await supabase
            .from('autopilot_data')
            .select('user_id')
            .eq('id', seriesId)
            .single();
            
        if (fetchError || !existingData) {
            return getNextBaseResponse({ success: false, status: 404, error: "Series not found." });
        }
        
        if (existingData.user_id !== sessionUserId) {
            return getNextBaseResponse({ success: false, status: 403, error: "Forbidden. You can only update your own series." });
        }

        // 2. Update DB
        const updateData: Partial<AutopilotData> = await request.json();
        const { data, error } = await supabase
            .from('autopilot_data')
            .update({
                ...updateData,
                updated_at: new Date().toISOString()
            })
            .eq('id', seriesId)
            .select()
            .single();

        if (error) throw error;

        // 3. Trigger.dev Schedule Sync
        try {
            const updated: AutopilotData = data;
            const runImmediately = request.nextUrl.searchParams.get('runImmediately') === 'true';
            
            // Sync if scheduling fields have changed OR runImmediately is requested
            const isSchedulingChange = (
                'is_active' in updateData || 
                'schedule_cron' in updateData || 
                'user_timezone' in updateData ||
                runImmediately
            );

            if (isSchedulingChange) {
                const scheduleKey = `autopilot-${seriesId}`;

                if (updated.is_active && updated.schedule_cron !== "NONE") {
                    // Adjust cron for generation: 2 hours buffer
                    const generationCron = subtractHoursFromCron(updated.schedule_cron, 2);
                    
                    // Update Generation Schedule
                    await schedules.create({
                        task: "autopilot-generation-orchestrator",
                        cron: generationCron,
                        timezone: updated.user_timezone,
                        externalId: `${seriesId}-generation`,
                        deduplicationKey: `${scheduleKey}-generation`,
                    });
                    
                    // Update Upload Schedule
                    await schedules.create({
                        task: "autopilot-upload-orchestrator",
                        cron: updated.schedule_cron,
                        timezone: updated.user_timezone,
                        externalId: `${seriesId}-upload`,
                        deduplicationKey: `${scheduleKey}-upload`,
                    });
                    
                    // If runImmediately is true, trigger a one-time generation run
                    // Note: Ensure the video generation pipeline (rendering complete step) 
                    // triggers the 'autopilot-upload-orchestrator' task upon finishing 
                    // to achieve immediate upload as promised in the UI.
                    if (runImmediately) {
                        await tasks.trigger("autopilot-generation-orchestrator", { 
                            externalId: `${seriesId}-generation` 
                        });
                        console.log(`[Trigger.dev] Immediate run triggered for series: ${seriesId}`);
                    }
                    
                    console.log(`[Trigger.dev] Schedules synced (Active) for series: ${seriesId}`);
                } else {
                    // Remove both schedules if inactive or invalid
                    const existingSchedules = await schedules.list();
                    for (const schedule of existingSchedules.data) {
                        if (schedule.externalId === `${seriesId}-generation` || schedule.externalId === `${seriesId}-upload`) {
                            await schedules.del(schedule.id);
                            console.log(`[Trigger.dev] Schedule removed (Inactive): ${schedule.externalId}`);
                        }
                    }
                }
            }
        } catch (syncError) {
            console.error("[Trigger.dev] Sync Error:", syncError);
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { autopilotData: data },
            message: "Successfully updated autopilot series."
        });
    } catch (error) {
        console.error("Error in PATCH /api/autopilot-data/series/[seriesId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to update autopilot series."
        });
    }
}

/**
 * DELETE /api/autopilot-data/series/[seriesId]
 * Delete a specific autopilot series and cleanup Trigger.dev schedule.
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ seriesId: string }> }
) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

    const sessionUserId = request.nextUrl.searchParams.get('userId');
    const { seriesId } = await context.params;

    if (!sessionUserId) {
        return getNextBaseResponse({
            success: false,
            status: 403,
            error: "Forbidden. You can only read your own data."
        });
    }

    const supabase = createSupabaseServiceRoleClient();

    try {
        // 1. Ownership Check
        const { data: existingData, error: fetchError } = await supabase
            .from('autopilot_data')
            .select('user_id')
            .eq('id', seriesId)
            .single();
            
        if (fetchError || !existingData) {
            return getNextBaseResponse({ success: false, status: 404, error: "Series not found." });
        }
        
        if (existingData.user_id !== sessionUserId) {
            return getNextBaseResponse({ success: false, status: 403, error: "Forbidden. You can only delete your own series." });
        }

        // 2. Delete from DB
        const { error } = await supabase
            .from('autopilot_data')
            .delete()
            .eq('id', seriesId);

        if (error) throw error;

        // 3. Trigger.dev Schedule Cleanup
        try {
            const existingSchedules = await schedules.list();
            for (const schedule of existingSchedules.data) {
                // Check for both generation and upload schedules
                if (schedule.externalId === `${seriesId}-generation` || schedule.externalId === `${seriesId}-upload`) {
                    await schedules.del(schedule.id);
                    console.log(`[Trigger.dev] Cleanup successful for: ${schedule.externalId}`);
                }
            }
        } catch (cleanupError) {
            console.error("[Trigger.dev] Cleanup Error:", cleanupError);
        }

        return getNextBaseResponse({
            success: true,
            status: 200,
            message: "Successfully deleted autopilot series."
        });
    } catch (error) {
        console.error("Error in DELETE /api/autopilot-data/series/[seriesId]:", error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: error instanceof Error ? error.message : "Failed to delete autopilot series."
        });
    }
}
