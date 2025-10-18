import {CaptionConfigState, CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

export interface PostVideoMergeCaptionRequest {
    videoUrl: string;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    videoHeight: number;
    videoGenerationTaskId: string;
}