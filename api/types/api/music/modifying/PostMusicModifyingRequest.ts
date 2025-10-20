export interface PostMusicModifyingRequest {
    audioUrl: string;
    cuttingAreaStartSec: number;
    cuttingAreaEndSec: number;
    volumePercentage: number;
    videoGenerationTaskId: string;
}