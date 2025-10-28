import {PostVideoRequest} from "@/api/types/api/video/PostVideoRequest";
import {PostVideoResponse} from "@/api/types/api/video/PostVideoResponse";
import {deleteFetch, getFetch, patchFetch, postFetch} from '@/api/client/baseFetch';
import {VideoGenerationTask} from "@/api/types/supabase/VideoGenerationTasks";

export const videoClientAPI = {
    /**
     * 영상 생성 요청을 서버에 전송합니다.
     * 음성 생성 → OpenAI 분석 → Scene별 영상 생성 → DB 저장의 전체 플로우를 실행합니다.
     */
    async postVideo(request: PostVideoRequest): Promise<PostVideoResponse | null> {
        try {
            const response = await postFetch('/api/video', request);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Video generation API call failed:', error);
            return null;
        }
    },

    async postVideoTask(videoGenerationTask: Partial<VideoGenerationTask>): Promise<VideoGenerationTask | null> {
        try {
            const response = await postFetch(`/api/video/task`, videoGenerationTask);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Failed to insert task.`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get video task:', error);
            return null;
        }
    },

    async getVideoTasksByUserId(userId: string): Promise<VideoGenerationTask[] | null> {
        try {
            const response = await getFetch(`/api/video/task/user/${userId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Tasks not found for user: ${userId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get user video tasks:', error);
            return null;
        }
    },

    async getVideoTaskByTaskId(taskId: string): Promise<VideoGenerationTask | null> {
        try {
            const response = await getFetch(`/api/video/task/${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Task not found: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get video task:', error);
            return null;
        }
    },

    async patchVideoTaskByTaskId(taskId: string, videoGenerationTask: Partial<VideoGenerationTask>): Promise<VideoGenerationTask | null> {
        try {
            const response = await patchFetch(`/api/video/task/${taskId}`, videoGenerationTask);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Task not found: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get video task:', error);
            return null;
        }
    },

    async deleteVideoTaskByTaskId(taskId: string): Promise<boolean> {
        try {
            const response = await deleteFetch(`/api/video/task/${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Task not found: ${taskId}`);
                    return false;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return true;
        } catch (error) {
            console.error('Failed to delete video task:', error);
            return false;
        }
    },

    async getVideoUrl(taskId: string): Promise<string | null> {
        try {
            const response = await getFetch(`/api/video/url?taskId=${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Video not found for task: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Failed to get video URL:', error);
            return null;
        }
    },

    async postVideoMergeFinal(taskId: string) {
        try {
            const response = await getFetch(`/api/video/merge/final?taskId=${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Video not found for task: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.url;
        } catch (error) {
            console.error('Failed to get video URL:', error);
            return null;
        }
    }
}