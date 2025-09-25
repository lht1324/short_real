import { SunoAPIClient } from '@/lib/SunoAPIClient';
import { PostGenerateRequest, GetTaskRequest } from '@/api/types/suno-api/SunoAPIRequests';
import {
    GetGenerateRecordInfoResponse,
    SunoAPIBaseData,
} from '@/api/types/suno-api/SunoAPIResponses';

export const sunoAPIServerAPI = {
    async postGenerate(request: PostGenerateRequest): Promise<SunoAPIBaseData> {
        const client = new SunoAPIClient();

        try {
            const response = await client.requestDefault<PostGenerateRequest, SunoAPIBaseData>('generate', 'POST', request);

            return response.data;
        } catch (error) {
            throw new Error(`음악 생성 요청 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    },

    async getGenerateRecordInfo(request: GetTaskRequest): Promise<GetGenerateRecordInfoResponse> {
        const client = new SunoAPIClient();

        try {
            const response = await client.requestDefault<undefined, GetGenerateRecordInfoResponse>(`generate/record-info?taskId=${request.taskId}`, 'GET');

            return response.data;
        } catch (error) {
            throw new Error(`음악 생성 상세 정보 조회 실패: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}