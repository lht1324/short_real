// app/api/youtube/upload/route.ts
import { NextRequest } from 'next/server';
import { createSupabaseServiceRoleClient } from '@/lib/supabaseServiceRole';
import { getNextBaseResponse } from '@/utils/getNextBaseResponse';
import {
    PostVideoExportYoutubeUploadRequest
} from "@/api/types/api/video/export/youtube/upload/PostVideoExportYoutubeUploadRequest";
import {UserYoutubeToken} from "@/api/types/supabase/UserYoutubeToken";
import {PostgrestSingleResponse} from "@supabase/supabase-js";
import {DownloadResult} from "@supabase/storage-js";
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {ExportStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {ExportPlatform} from "@/components/page/workspace/dashboard/WorkspaceDashboardPageClient";

export async function POST(request: NextRequest) {
    const supabase = createSupabaseServiceRoleClient();

    // URL에서 파라미터 추출
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get('taskId');

    if (!taskId) {
        // 찝찝하지만 비정상 요청으로 간주하고 넘기자
        return getNextBaseResponse({
            success: false,
            status: 400,
            error: 'Missing required query param: taskId'
        });
    }

    try {
        const { userId }: PostVideoExportYoutubeUploadRequest = await request.json();

        if (!userId) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return getNextBaseResponse({
                success: false,
                status: 400,
                error: 'userId is required'
            });
        }

        const videoGenerationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

        if (!videoGenerationTask) {
            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: "Task not found."
            })
        }

        console.log(`[YouTube Upload] Starting for userId=${userId}`);

        // 1. DB에서 토큰 조회
        const { data: tokenData, error: tokenError }: PostgrestSingleResponse<UserYoutubeToken> = await supabase
            .from('user_youtube_tokens')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (tokenError || !tokenData) {
            console.error('[YouTube Upload] Token not found:', tokenError);

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return getNextBaseResponse({
                success: false,
                status: 401,
                error: 'YouTube token not found. Please authorize first.'
            });
        }

        let accessToken = tokenData.access_token;
        const refreshToken = tokenData.refresh_token;
        const expiresAt = new Date(tokenData.expires_at);

        // 2. Access token 만료 확인 → 필요하면 갱신
        if (Date.now() >= expiresAt.getTime()) {
            console.log('[YouTube Upload] Access token expired, refreshing...');

            const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams({
                    client_id: process.env.GOOGLE_YOUTUBE_CLIENT_ID!,
                    client_secret: process.env.GOOGLE_YOUTUBE_CLIENT_SECRET!,
                    refresh_token: refreshToken,
                    grant_type: 'refresh_token'
                }).toString()
            });

            if (!refreshResponse.ok) {
                console.error('[YouTube Upload] Token refresh failed');

                await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                    export_status: ExportStatus.FAILED,
                    export_platform: ExportPlatform.YOUTUBE,
                });

                return getNextBaseResponse({
                    success: false,
                    status: 401,
                    error: 'Failed to refresh token. Please authorize again.'
                });
            }

            const newTokens = await refreshResponse.json();
            accessToken = newTokens.access_token;

            // 3. DB 업데이트 (새 access_token + 새 만료시간)
            const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000).toISOString();

            await supabase
                .from('user_youtube_tokens')
                .update({
                    access_token: accessToken,
                    expires_at: newExpiresAt,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', userId);

            console.log('[YouTube Upload] Token refreshed successfully');
        }

        // 4. Supabase Storage에서 영상 파일 다운로드
        console.log('[YouTube Upload] Downloading video from storage...');
        const { data: fileData, error: downloadError }: DownloadResult<Blob> = await supabase.storage
            .from('processed_video_storage')
            .download(`${taskId}/${taskId}_final.mp4`);

        if (downloadError || !fileData) {
            console.error('[YouTube Upload] Video download failed:', downloadError);

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return getNextBaseResponse({
                success: false,
                status: 404,
                error: 'Video file not found'
            });
        }

        // 5. 영상 파일을 Buffer로 변환
        const buffer = await fileData.arrayBuffer();

        // 6. YouTube API로 업로드
        console.log('[YouTube Upload] Uploading to YouTube...');
        const boundary = 'boundary_shortreal_ai_youtube_upload';
        const multipartBody = createMultipartBody(
            buffer,
            videoGenerationTask.video_title ?? "ShortReal AI",
            videoGenerationTask.video_description ?? "ShortReal AI",
            boundary
        )
        const uploadResponse = await fetch(
            'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`  // ← 동적으로
                },
                body: Buffer.from(multipartBody)
            }
        );

        if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json();
            console.error('[YouTube Upload] YouTube API error:', JSON.stringify(errorData));

            await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
                export_status: ExportStatus.FAILED,
                export_platform: ExportPlatform.YOUTUBE,
            });

            return getNextBaseResponse({
                success: false,
                status: uploadResponse.status,
                error: `YouTube API error: ${errorData.error?.message || 'Unknown error'}`
            });
        }

        const uploadedVideo = await uploadResponse.json();

        console.log('[YouTube Upload] Success! Video ID:', uploadedVideo.id);

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            export_status: ExportStatus.SUCCESS,
        });

        return getNextBaseResponse({
            success: true,
            status: 200,
            data: {
                videoId: uploadedVideo.id,
                title: uploadedVideo.snippet?.title,
                url: `https://youtube.com/watch?v=${uploadedVideo.id}`
            },
            message: 'Video uploaded successfully'
        });

    } catch (error) {
        console.error('[YouTube Upload] Error:', error);

        await videoGenerationTasksServerAPI.patchVideoGenerationTask(taskId, {
            export_status: ExportStatus.FAILED,
            export_platform: ExportPlatform.YOUTUBE,
        });

        return getNextBaseResponse({
            success: false,
            status: 500,
            error: 'Internal server error'
        });
    }
}

// Multipart body 생성 (YouTube API 형식)
function createMultipartBody(
    videoBuffer: ArrayBuffer,
    videoTitle: string,
    videoDescription: string,
    boundary: string
): Uint8Array {
    const encoder = new TextEncoder();
    const metadataJson = JSON.stringify({
        snippet: {
            title: videoTitle,
            description: videoDescription,
            categoryId: '24',
            tags: ['shorts', 'ai', 'generated'],
        },
        status: {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
        },
    });

    // Part 1: Metadata (JSON)
    const part1 = encoder.encode(
        `--${boundary}\r\n` +
        `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
        metadataJson + '\r\n'
    );

    // Part 2: Video file (binary)
    const part2Start = encoder.encode(
        `--${boundary}\r\n` +
        `Content-Type: video/mp4\r\n\r\n`
    );
    const videoBufferUint8 = new Uint8Array(videoBuffer);
    const part2End = encoder.encode(`\r\n--${boundary}--\r\n`);

    // 병합
    const totalLength = part1.length + part2Start.length + videoBufferUint8.length + part2End.length;
    const result = new Uint8Array(totalLength);

    let offset = 0;
    result.set(part1, offset);
    offset += part1.length;
    result.set(part2Start, offset);
    offset += part2Start.length;
    result.set(videoBufferUint8, offset);
    offset += videoBufferUint8.length;
    result.set(part2End, offset);

    return result;
}