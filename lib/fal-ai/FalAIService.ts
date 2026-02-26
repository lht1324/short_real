import {FalAIClient} from "@/lib/fal-ai/FalAIClient";
import {MergeAudioVideoRequest, MergeVideosRequest, QueueOptions} from "@/lib/api/types/fal-ai/FalAIRequest";
import {
    FalApiResult,
    MergeAudioVideoResponse,
    MergeVideosResponse,
    QueueSubmitResult
} from "@/lib/api/types/fal-ai/FalAIResponse";

export class FalAIService {
    constructor(private client: FalAIClient) {}

    /**
     * 여러 비디오를 병합합니다
     */
    async mergeVideos(request: MergeVideosRequest): Promise<FalApiResult<MergeVideosResponse>> {
        return this.client.subscribe('merge-videos', { input: request });
    }

    /**
     * 오디오와 비디오를 병합합니다
     */
    async mergeAudioVideo(request: MergeAudioVideoRequest): Promise<FalApiResult<MergeAudioVideoResponse>> {
        return this.client.subscribe('merge-audio-video', { input: request });
    }

    /**
     * 비디오 병합 작업을 큐에 제출합니다
     */
    async submitMergeVideos(request: MergeVideosRequest, options?: QueueOptions): Promise<QueueSubmitResult> {
        return this.client.submitToQueue('merge-videos', request, options);
    }

    /**
     * 오디오-비디오 병합 작업을 큐에 제출합니다
     */
    async submitMergeAudioVideo(request: MergeAudioVideoRequest, options?: QueueOptions): Promise<QueueSubmitResult> {
        return this.client.submitToQueue('merge-audio-video', request, options);
    }
}