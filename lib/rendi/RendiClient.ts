import {
    OutputFile,
    PollCommandResponse,
    RunChainedFfmpegCommandsRequest,
    RunFfmpegCommandRequest,
    RunFfmpegCommandResponse
} from './RendiType';
import {videoGenerationTasksServerAPI} from "@/api/server/videoGenerationTasksServerAPI";
import {SceneData, SceneGenerationStatus} from "@/api/types/supabase/VideoGenerationTasks";
import {createSupabaseServiceRoleClient} from "@/lib/supabaseServiceRole";

export class RendiClient {
    private readonly apiKey?: string;
    private baseUrl: string = 'https://api.rendi.dev/v1';

    constructor() {
        this.apiKey = process.env.RENDI_API_KEY;
    }

    private async makeRequest<T>(
        endpoint: string,
        method: 'GET' | 'POST' | 'DELETE' = 'GET',
        body?: any
    ): Promise<T> {
        if (!this.apiKey) {
            throw Error("Invalid Rendi token")
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers: Record<string, string> = {
            'X-API-KEY': this.apiKey,
            'Content-Type': 'application/json',
        };

        const response = await fetch(url, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Rendi API 오류: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    // 1. 단일 FFmpeg 명령어 실행
    async runFfmpegCommand(request: RunFfmpegCommandRequest): Promise<RunFfmpegCommandResponse> {
        return this.makeRequest<RunFfmpegCommandResponse>('/run-ffmpeg-command', 'POST', request);
    }

    // 2. 체인 FFmpeg 명령어 실행
    async runChainedFfmpegCommands(request: RunChainedFfmpegCommandsRequest): Promise<RunFfmpegCommandResponse> {
        return this.makeRequest<RunFfmpegCommandResponse>('/run-chained-ffmpeg-commands', 'POST', request);
    }

    // 3. 작업 상태 조회
    async pollCommandStatus(commandId: string): Promise<PollCommandResponse> {
        return this.makeRequest<PollCommandResponse>(`/commands/${commandId}`);
    }

    // 4. 작업 완료 대기 및 결과 반환
    async waitForCompletion(
        commandId: string,
        pollInterval: number = 2000,
        maxAttempts: number = 150, // 5분 최대 대기
        generationTaskId?: string
    ): Promise<Record<string, OutputFile>> {
        let attempts = 0;

        while (attempts < maxAttempts) {
            const status = await this.pollCommandStatus(commandId);

            if (status.status === 'SUCCESS') {
                if (!status.output_files) {
                    throw new Error('작업은 성공했지만 출력 파일을 찾을 수 없습니다.');
                }
                return status.output_files;
            }

            if (status.status === 'FAILED') {
                throw new Error(`작업 실패: ${status.error_message || status.error_status || '알 수 없는 오류'}`);
            }

            // PROCESSING 상태인 경우 대기
            await new Promise(resolve => setTimeout(resolve, pollInterval));
            attempts++;
        }

        if (generationTaskId) {
            const supabase = createSupabaseServiceRoleClient();
            const generationTask = await videoGenerationTasksServerAPI.getVideoGenerationTaskById(generationTaskId);

            if (generationTask) {
                const mappedList: SceneData[] = generationTask?.scene_breakdown_list.map((sceneData) => {
                    return {
                        ...sceneData,
                        status: SceneGenerationStatus.IN_PROGRESS,
                    }
                });
                const requestIdList = mappedList.map((sceneData) => {
                    return sceneData.requestId!;
                });

                await videoGenerationTasksServerAPI.patchVideoGenerationTask({
                    id: generationTaskId,
                    scene_breakdown_list: mappedList,
                });

                // 처리된 영상 파일들 삭제
                const filesToDelete = requestIdList.map(requestId => `${generationTaskId}/${requestId}.mp4`);
                const { error: deleteError } = await supabase.storage
                    .from('processed_video_storage')
                    .remove(filesToDelete);

                if (deleteError) {
                    console.error('처리된 영상 파일 삭제 중 에러:', deleteError);
                }

            }
        }
        throw new Error(`작업 완료 대기 시간 초과 (${maxAttempts * pollInterval / 1000}초)`);
    }
}