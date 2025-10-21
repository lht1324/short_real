import {CaptionConfigState, CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

export interface PostVideoMergeFinalRequest {
    // 공통
    videoGenerationTaskId: string;

    // Caption 병합용
    videoUrl: string;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    videoWidth: number;
    videoHeight: number;
    captionAreaTop: number;
    captionAreaVerticalPadding: number;
    captionOneLineHeight: number;

    // Music 자르기용
    audioUrl: string;
    cuttingAreaStartSec: number;
    cuttingAreaEndSec: number;
    volumePercentage: number;
}
