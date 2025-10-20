import {CaptionConfigState, CaptionData} from "@/components/page/workspace/editor/WorkspaceEditorPageClient";

export interface PostVideoMergeCaptionRequest {
    videoUrl: string;
    captionDataList: CaptionData[];
    captionConfigState: CaptionConfigState;
    videoWidth: number;
    videoHeight: number;
    captionAreaTop: number;
    captionAreaVerticalPadding: number;
    captionOneLineHeight: number;
    videoGenerationTaskId: string;
}