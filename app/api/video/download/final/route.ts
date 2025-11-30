import fs from 'fs';
import {NextRequest, NextResponse} from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { videoGenerationTasksServerAPI } from '@/api/server/videoGenerationTasksServerAPI';
import {getNextBaseResponse} from "@/utils/getNextBaseResponse";

export async function GET(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId',
        });
    }

    try {
        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Task not found'
            });
        }

        const { data, error } = await supabase.storage
            .from("processed_video_storage")
            .download(`${taskId}/${taskId}_final.mp4`)
            // .download(`temp/${taskId}_final.mp4`)

        if (!data) {
            return getNextBaseResponse({
                success: false,
                status: 500,
                error: error instanceof Error ? error.message : 'Failed to fetch video.'
            });
        }


        fs.writeFile('/temp.mp4', Buffer.from(data.arrayBuffer()), (err) => { })

        console.log("1: ", data);
        console.log("2: ", data instanceof Blob)      // true 여야 함
        console.log("3: ", Object.prototype.toString.call(data)) // [object Blob] 여야 함
        console.log("4: ", data.type)                 // 'video/mp4' 권장
        console.log("5: ", data.size)                 // 0보다 커야 함

        // return getNextBaseResponse({
        //     success: true,
        //     status: 200,
        //     data: {
        //         videoBlob: data,
        //     },
        //     message: 'Fetching video successfully.',
        // });
        return new NextResponse(data as Blob, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp4',
                'Content-Disposition': `attachment; filename="${taskId}_final.mp4"`,
                ...(typeof (data as unknown).size === 'number'
                ? { 'Content-Length': String((data as unknown).size) }
                : { }),
                'Cache-Control': 'private, max-age=0, no-store',
            }
        })

    } catch (error) {
        console.error('[Webhook Video-Music Merge] Error:', error);
        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Webhook processing failed'
        });
    }
}