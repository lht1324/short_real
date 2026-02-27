// app/api/video/export/tiktok/upload/route.ts

import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { getNextBaseResponse } from '@/utils/getNextBaseResponse';
import { PostgrestSingleResponse } from '@supabase/supabase-js';
import { DownloadResult } from '@supabase/storage-js';
import { videoGenerationTasksServerAPI } from '@/lib/api/server/videoGenerationTasksServerAPI';
import { UserTikTokToken } from '@/lib/api/types/supabase/UserTikTokToken';
import {getIsValidRequestS2S} from "@/utils/getIsValidRequest";
import {ExportPlatform, ExportStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";


const MIN_CHUNK = 5 * 1024 * 1024;  // 5MB
const MAX_CHUNK = 64 * 1024 * 1024; // 64MB

export async function POST(request: NextRequest) {
    if (!getIsValidRequestS2S(request)) {
        return getNextBaseResponse({
            success: false,
            status: 401,
            error: 'Unauthorized internal request',
        });
    }

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
        const { userId } = await request.json();

        if (!userId) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'userId is required',
            });
        }

        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);
        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Task not found.',
            });
        }

        console.log(`[TikTok Upload] Starting for userId=${userId}`);

        // 1. DB에서 토큰 조회
        const { data: tokenData, error: tokenError }: PostgrestSingleResponse<UserTikTokToken> = await supabase
            .from('user_tiktok_tokens')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (tokenError || !tokenData) {
            console.error('[TikTok Upload] Token not found:', tokenError);
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 401,
                error: 'TikTok token not found. Please authorize first.',
            });
        }

        // 2. refresh_token 만료 확인
        if (Date.now() >= new Date(tokenData.refresh_expires_at).getTime()) {
            console.error('[TikTok Upload] Refresh token expired');
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 401,
                error: 'TikTok authorization expired. Please authorize again.',
            });
        }

        let accessToken = tokenData.access_token;

        // 3. access_token 만료 확인 → 필요하면 갱신
        if (Date.now() >= new Date(tokenData.expires_at).getTime()) {
            console.log('[TikTok Upload] Access token expired, refreshing...');

            const refreshResponse = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_key: process.env.TIKTOK_CLIENT_KEY!,
                    client_secret: process.env.TIKTOK_CLIENT_SECRET!,
                    grant_type: 'refresh_token',
                    refresh_token: tokenData.refresh_token,
                }).toString(),
            });

            if (!refreshResponse.ok) {
                console.error('[TikTok Upload] Token refresh failed');
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });

                return getNextBaseResponse({
                    success: false,
                    status: 401,
                    error: 'Failed to refresh token. Please authorize again.',
                });
            }

            const newTokens = await refreshResponse.json();
            accessToken = newTokens.access_token;

            await supabase
                .from('user_tiktok_tokens')
                .update({
                    access_token: newTokens.access_token,
                    expires_at: new Date(Date.now() + newTokens.expires_in * 1000).toISOString(),
                    updated_at: new Date().toISOString(),
                    last_used_at: new Date().toISOString(),
                })
                .eq('user_id', userId);

            console.log('[TikTok Upload] Token refreshed successfully');
        }

        // 4. Supabase Storage에서 영상 파일 다운로드
        console.log('[TikTok Upload] Downloading video from storage...');
        const { data: fileData, error: downloadError }: DownloadResult<Blob> = await supabase.storage
            .from('processed_video_storage')
            .download(`${taskId}/${taskId}_final.mp4`);

        if (downloadError || !fileData) {
            console.error('[TikTok Upload] Video download failed:', downloadError);
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video file not found',
            });
        }

        const buffer = await fileData.arrayBuffer();
        const videoSize = buffer.byteLength;

        const chunkSize = videoSize < MIN_CHUNK
            ? videoSize
            : Math.min(videoSize, MAX_CHUNK);
        const totalChunkCount = Math.ceil(videoSize / chunkSize);

        // 5. 업로드 세션 초기화
        console.log('[TikTok Upload] Initializing upload session...');
        const initResponse = await fetch('https://open.tiktokapis.com/v2/post/publish/video/init/', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({
                post_info: {
                    title: videoGenerationTask.video_title ?? 'ShortReal AI',
                    // privacy_level: process.env.NODE_ENV === 'production' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY',
                    privacy_level: 'SELF_ONLY',
                    disable_duet: false,
                    disable_comment: false,
                    disable_stitch: false,
                },
                source_info: {
                    source: 'FILE_UPLOAD',
                    video_size: videoSize,
                    chunk_size: chunkSize,
                    total_chunk_count: totalChunkCount,
                },
            }),
        });

        const initData = await initResponse.json();

        if (!initData.data?.upload_url || !initData.data?.publish_id) {
            console.error('[TikTok Upload] Init failed:', initData);
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'Failed to initialize TikTok upload session',
            });
        }

        const { upload_url, publish_id } = initData.data;

        // 6. 청크 업로드
        console.log('[TikTok Upload] Uploading chunks...');
        const uint8 = new Uint8Array(buffer);

        for (let i = 0; i < totalChunkCount; i++) {
            const start = i * chunkSize;
            const end = Math.min(start + chunkSize, videoSize);
            const chunk = uint8.slice(start, end);

            const chunkResponse = await fetch(upload_url, {
                method: 'PUT',
                headers: {
                    'Content-Range': `bytes ${start}-${end - 1}/${videoSize}`,
                    'Content-Type': 'video/mp4',
                },
                body: chunk,
            });

            if (!chunkResponse.ok) {
                console.error(`[TikTok Upload] Chunk ${i + 1}/${totalChunkCount} failed`);
                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.TIKTOK,
                });

                return getNextBaseResponse({
                    success: false,
                    status: 500,
                    error: `Failed to upload chunk ${i + 1}`,
                });
            }

            console.log(`[TikTok Upload] Chunk ${i + 1}/${totalChunkCount} uploaded`);
        }

        // 7. 게시 상태 폴링
        console.log('[TikTok Upload] Polling publish status...');
        const videoUrl = await pollPublishStatus(accessToken, publish_id);

        if (!videoUrl) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.TIKTOK,
            });

            return getNextBaseResponse({
                success: false,
                status: 500,
                error: 'TikTok publish failed or timed out',
            });
        }

        await supabase
            .from('user_tiktok_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('user_id', userId);

        console.log('[TikTok Upload] Success! URL:', videoUrl);
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            export_status: ExportStatus.SUCCESS,
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: { url: videoUrl },
            message: 'Video uploaded successfully',
        });

    } catch (error) {
        console.error('[TikTok Upload] Error:', error);
        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            export_status: ExportStatus.FAILED,
            export_platform: ExportPlatform.TIKTOK,
        });

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error',
        });
    }
}

async function pollPublishStatus(
    accessToken: string,
    publishId: string
): Promise<string | null> {
    const MAX_ATTEMPTS = 24;
    const INTERVAL_MS = 5000;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
        await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));

        const res = await fetch('https://open.tiktokapis.com/v2/post/publish/status/fetch/', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json; charset=UTF-8',
            },
            body: JSON.stringify({ publish_id: publishId }),
        });

        const data = await res.json();
        const status = data.data?.status;

        console.log(`[TikTok Upload] Publish status: ${status} (attempt ${i + 1})`);

        if (status === 'PUBLISH_COMPLETE') {
            const videoId = data.data?.publicaly_available_post_id?.[0];
            return videoId ? `https://www.tiktok.com/@me/video/${videoId}` : 'https://www.tiktok.com';
        }

        if (status === 'FAILED') return null;
    }

    return null;
}
