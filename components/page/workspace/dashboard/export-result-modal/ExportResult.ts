
import {ExportPlatform, ExportStatus} from "@/api/types/supabase/VideoGenerationTasks";

export interface ExportResult {
    taskId: string;
    title?: string;
    platform: ExportPlatform;
    status: ExportStatus.SUCCESS | ExportStatus.FAILED;
}