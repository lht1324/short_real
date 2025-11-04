import { createSupabaseServer } from '@/lib/supabaseServer';
import {VideoGenerationTask, VideoGenerationTaskStatus} from '@/api/types/supabase/VideoGenerationTasks';
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

export const videoGenerationTasksServerAPI = {
    // POST - 새로운 영상 생성 작업 생성
    async postVideoGenerationTask(taskData: Partial<VideoGenerationTask>): Promise<VideoGenerationTask> {
        const supabase = createSupabaseServiceRoleClient();
        
        const { data, error } = await supabase
            .from('video_generation_tasks')
            .upsert(taskData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create video generation task: ${error.message}`);
        }

        return data;
    },

    // GET - 전체 작업 조회
    async getVideoGenerationTasks(): Promise<VideoGenerationTask[] | null> {
        const supabase = await createSupabaseServer("readOnly");

        const { data, error } = await supabase
            .from('video_generation_tasks')
            .select('*');

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw new Error(`Failed to get video generation task: ${error.message}`);
        }

        return data;
    },

    // GET - 작업 ID로 단일 작업 조회
    async getVideoGenerationTaskById(taskId: string): Promise<VideoGenerationTask | null> {
        // const supabase = await createSupabaseServer("readOnly");
        const supabase = createSupabaseServiceRoleClient();
        
        const { data, error } = await supabase
            .from('video_generation_tasks')
            .select('*')
            .eq('id', taskId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw new Error(`Failed to get video generation task: ${error.message}`);
        }

        return data;
    },

    // GET - 사용자 ID로 작업 목록 조회
    async getVideoGenerationTasksByUserId(userId: string, limit: number = 10, offset: number = 0): Promise<VideoGenerationTask[]> {
        const supabase = createSupabaseServiceRoleClient();
        
        const { data, error } = await supabase
            .from('video_generation_tasks')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
            // .range(offset, offset + limit - 1);

        if (error) {
            throw new Error(`Failed to get user's video generation tasks: ${error.message}`);
        }

        return data || [];
    },

    // PATCH - 작업 데이터 업데이트
    async patchVideoGenerationTask(taskId: string, videoGenerationTask: Partial<VideoGenerationTask>): Promise<VideoGenerationTask> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('video_generation_tasks')
            .update(videoGenerationTask)
            .eq('id', taskId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update task status: ${error.message}`);
        }

        return data;
    },

    // PATCH - 작업 상태만 업데이트
    async patchVideoGenerationTaskStatus(taskId: string, status: VideoGenerationTaskStatus): Promise<VideoGenerationTask> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('video_generation_tasks')
            .update({ status: status } as Partial<VideoGenerationTask>)
            .eq('id', taskId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update task status: ${error.message}`);
        }

        return data;
    },

    async patchVideoGenerationTaskFailed(taskId: string, isFailed: boolean = true): Promise<VideoGenerationTask> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('video_generation_tasks')
            .update({ is_generation_failed: isFailed } as Partial<VideoGenerationTask>)
            .eq('id', taskId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update task status: ${error.message}`);
        }

        return data;
    },

    // DELETE - 작업 삭제
    async deleteVideoGenerationTask(taskId: string): Promise<boolean> {
        const supabase = createSupabaseServiceRoleClient();

        try {
            const existingTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

            if (!existingTask) throw new Error("Task not found.");

            // 1. narration_voice_storage 삭제
            const { error: voiceError } = await supabase.storage
                .from('narration_voice_storage')
                .remove([`${taskId}.mp3`]);
            if (voiceError) console.error('Storage delete error (narration_voice):', voiceError.message);

            // 2-4. 나머지 버킷들 (폴더 기반 - taskId 폴더 내 모든 파일 조회 후 삭제)
            const folderBasedBuckets = [
                'processed_video_storage',
                'scene_image_temp_storage',
                'video_music_temp_storage'
            ];

            for (const bucketName of folderBasedBuckets) {
                const { data: files, error: listError } = await supabase.storage
                    .from(bucketName)
                    .list(taskId);

                if (listError) {
                    console.error(`Failed to list files in ${bucketName}:`, listError.message);
                    continue;
                }

                if (files && files.length > 0) {
                    const filePaths = files.map(file => `${taskId}/${file.name}`);
                    const { error: removeError } = await supabase.storage
                        .from(bucketName)
                        .remove(filePaths);
                    if (removeError) console.error(`Storage delete error (${bucketName}):`, removeError.message);
                }
            }

            // DB에서 작업 레코드 삭제
            const { error } = await supabase
                .from('video_generation_tasks')
                .delete()
                .eq('id', taskId);

            if (error) {
                throw new Error(`Failed to delete video generation task: ${error.message}`);
            }

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    },

    // GET - 진행중인 작업 목록 조회
    async getActiveTasks(userId?: string): Promise<VideoGenerationTask[]> {
        const supabase = await createSupabaseServer("readOnly");
        
        let query = supabase
            .from('video_generation_tasks')
            .select('*')
            .in('status', ['pending', 'in_progress'])
            .order('created_at', { ascending: false });

        if (userId) {
            query = query.eq('user_id', userId);
        }

        const { data, error } = await query;

        if (error) {
            throw new Error(`Failed to get active tasks: ${error.message}`);
        }

        return data || [];
    }
}