import {PostVideoResponse} from "@/api/types/api/video/PostVideoResponse";
import {deleteFetch, getFetch, patchFetch, postFetch} from '@/api/client/baseFetch';
import {VideoGenerationTask} from "@/api/types/supabase/VideoGenerationTasks";
import {PostVideoMergeFinalResponse} from "@/api/types/api/video/merge/final/PostVideoMergeFinalResponse";

export const videoClientAPI = {
    /**
     * 영상 생성 요청을 서버에 전송합니다.
     * 음성 생성 → OpenAI 분석 → Scene별 영상 생성 → DB 저장의 전체 플로우를 실행합니다.
     */
    async postVideo(taskId: string): Promise<PostVideoResponse | null> {
        try {
            const response = await postFetch(`/api/video?taskId=${taskId}`);

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

            const postVideoTaskResponse = await response.json();

            return postVideoTaskResponse.data;
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

            const getVideoTaskByTaskIdResult = await response.json();

            if (!getVideoTaskByTaskIdResult.success || !getVideoTaskByTaskIdResult.data) {
                throw Error(getVideoTaskByTaskIdResult.error ?? 'Unknown error while fetching task data.');
            }

            return getVideoTaskByTaskIdResult.data.videoGenerationTask;
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

            const patchVideoTaskByTaskIdResult = await response.json();

            if (!patchVideoTaskByTaskIdResult.success || !patchVideoTaskByTaskIdResult.data) {
                throw Error(patchVideoTaskByTaskIdResult.error ?? "Unknown error occurred while patching task.")
            }

            return patchVideoTaskByTaskIdResult.data.videoGenerationTask;
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

    async getVideoVoiceUrl(taskId: string): Promise<string | null> {
        try {
            const response = await getFetch(`/api/video/url/voice?taskId=${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Video not found for task: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const getVideoVoiceUrlResult = await reponse.json();

            if (!getVideoVoiceUrlResult.success || !getVideoVoiceUrlResult.data) {
                throw Error(getVideoVoiceUrlResult.error ?? "Unknown error occurred while fetching video voice url.")
            }

            return getVideoVoiceUrlResult.data.url;
        } catch (error) {
            console.error('Failed to get video URL:', error);
            return null;
        }
    },

    async getVideoFinalUrl(taskId: string): Promise<string | null> {
        try {
            const response = await getFetch(`/api/video/url/final?taskId=${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Video not found for task: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const getVideoFinalUrlResult = await response.json();

            if (!getVideoFinalUrlResult.success || !getVideoFinalUrlResult.data) {
                throw Error(getVideoFinalUrlResult.error ?? "Unknown error occurred while fetching video final url.")
            }

            return getVideoFinalUrlResult.data.url;
        } catch (error) {
            console.error('Failed to get video URL:', error);
            return null;
        }
    },

    async postVideoMergeFinal(taskId: string): Promise<PostVideoMergeFinalResponse | null> {
        try {
            const response = await postFetch(`/api/video/merge/final?taskId=${taskId}`);

            if (!response.ok) {
                if (response.status === 404) {
                    console.warn(`Video not found for task: ${taskId}`);
                    return null;
                }
                throw Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Failed to get video URL:', error);
            return null;
        }
    },

    async postVideoTaskRetryByTaskId(taskId: string): Promise<void> {
        try {
            const response = await postFetch(`/api/video/task/${taskId}/retry`);

            if (!response.ok) {
                throw Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw Error(`[${result.status}]: ${result.message}`);
            }
        } catch (error) {
            console.error('Failed to get video URL:', error);
            throw error;
        }
    }
}