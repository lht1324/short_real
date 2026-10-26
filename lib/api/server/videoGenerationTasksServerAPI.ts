import {VideoGenerationTask, VideoGenerationTaskStatus} from '@/lib/api/types/supabase/VideoGenerationTasks';
import {desc, eq} from "drizzle-orm";
import {getNeonDb} from "@/lib/db/neon";
import {videoGenerationTasks} from "@/lib/db/schema";
import {r2ServerAPI} from "@/lib/r2";
import {publishTaskDelete, publishTaskWrite} from "@/lib/taskEvents";

// R2 키 접두 — 구 Supabase 버킷명을 폴더로 사용
const FOLDER_PREFIXES = [
    'processed_video_storage',
    'scene_image_temp_storage',
    'video_music_temp_storage',
    'narration_voice_storage',
] as const;

export const videoGenerationTasksServerAPI = {
    // POST - 새로운 영상 생성 작업 생성 (Supabase upsert 계약 → PK 충돌 시 update)
    async postVideoGenerationTask(taskData: Partial<VideoGenerationTask>): Promise<VideoGenerationTask> {
        const db = getNeonDb();

        try {
            // 페이로드는 호출부(파이프라인)가 필수 컬럼을 채워 보내며, 누락 시 DB NOT NULL이 걸러준다.
            const insertPayload = taskData as typeof videoGenerationTasks.$inferInsert;

            const [data] = await db
                .insert(videoGenerationTasks)
                .values(insertPayload)
                .onConflictDoUpdate({
                    target: videoGenerationTasks.id,
                    set: taskData,
                })
                .returning();

            if (!data) {
                throw new Error('Failed to create video generation task: no row returned');
            }

            await publishTaskWrite(data.id, data.user_id);

            return data as unknown as VideoGenerationTask;
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to create video generation task: ${message}`);
        }
    },

    // GET - 전체 작업 조회
    async getVideoGenerationTasks(): Promise<VideoGenerationTask[] | null> {
        const db = getNeonDb();

        const rows = await db
            .select()
            .from(videoGenerationTasks);

        return rows as unknown as VideoGenerationTask[];
    },

    // GET - 작업 ID로 단일 작업 조회 (Supabase .single() 계약 — 0 rows면 null)
    async getVideoGenerationTaskById(taskId: string): Promise<VideoGenerationTask | null> {
        const db = getNeonDb();

        const rows = await db
            .select()
            .from(videoGenerationTasks)
            .where(eq(videoGenerationTasks.id, taskId))
            .limit(1);

        return rows[0] ? rows[0] as unknown as VideoGenerationTask : null;
    },

    // GET - 사용자 ID로 작업 목록 조회
    async getVideoGenerationTasksByUserId(userId: string, limit: number = 10, offset: number = 0): Promise<VideoGenerationTask[]> {
        const db = getNeonDb();

        const rows = await db
            .select()
            .from(videoGenerationTasks)
            .where(eq(videoGenerationTasks.user_id, userId))
            .orderBy(desc(videoGenerationTasks.created_at));

        return rows as unknown as VideoGenerationTask[];
    },

    // PATCH - 작업 데이터 업데이트 (Supabase .single() 계약 — 대상 없으면 throw)
    async patchVideoGenerationTask(taskId: string, videoGenerationTask: Partial<VideoGenerationTask>): Promise<VideoGenerationTask> {
        const db = getNeonDb();
        const currentDateString = new Date().toISOString();

        const rows = await db
            .update(videoGenerationTasks)
            .set({
                ...videoGenerationTask,
                updated_at: currentDateString,
            })
            .where(eq(videoGenerationTasks.id, taskId))
            .returning();

        if (!rows[0]) {
            throw new Error(`Failed to update task status: task not found (${taskId})`);
        }

        await publishTaskWrite(taskId, rows[0].user_id);

        return rows[0] as unknown as VideoGenerationTask;
    },

    // PATCH - 작업 상태만 업데이트
    async patchVideoGenerationTaskStatus(taskId: string, status: VideoGenerationTaskStatus): Promise<VideoGenerationTask> {
        const db = getNeonDb();

        const rows = await db
            .update(videoGenerationTasks)
            .set({ status })
            .where(eq(videoGenerationTasks.id, taskId))
            .returning();

        if (!rows[0]) {
            throw new Error(`Failed to update task status: task not found (${taskId})`);
        }

        await publishTaskWrite(taskId, rows[0].user_id);

        return rows[0] as unknown as VideoGenerationTask;
    },

    async patchVideoGenerationTaskFailed(taskId: string, isFailed: boolean = true): Promise<VideoGenerationTask> {
        const db = getNeonDb();

        const rows = await db
            .update(videoGenerationTasks)
            .set({ is_generation_failed: isFailed })
            .where(eq(videoGenerationTasks.id, taskId))
            .returning();

        if (!rows[0]) {
            throw new Error(`Failed to update task status: task not found (${taskId})`);
        }

        await publishTaskWrite(taskId, rows[0].user_id);

        return rows[0] as unknown as VideoGenerationTask;
    },

    // DELETE - 작업 삭제 (DB 레코드 + R2 4개 폴더의 태스크 파일 전부)
    async deleteVideoGenerationTask(taskId: string): Promise<boolean> {
        const db = getNeonDb();

        try {
            const existingTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(taskId);

            if (!existingTask) throw new Error("Task not found.");

            // R2: 유저폴더/{taskId} 폴더의 파일 전부 삭제 (현재 유저폴더 체계 구조)
            for (const prefix of FOLDER_PREFIXES) {
                try {
                    const files = await r2ServerAPI.listKeys(`${prefix}/${existingTask.user_id}/${taskId}/`);
                    if (files.length > 0) {
                        await r2ServerAPI.deleteKeys(
                            files.map((name) => `${prefix}/${existingTask.user_id}/${taskId}/${name}`)
                        );
                    }
                } catch (storageError) {
                    console.error(`R2 delete error (${prefix}):`, storageError);
                }
            }

            // DB에서 작업 레코드 삭제
            await db
                .delete(videoGenerationTasks)
                .where(eq(videoGenerationTasks.id, taskId));

            await publishTaskDelete(taskId, existingTask.user_id);

            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    },
}
