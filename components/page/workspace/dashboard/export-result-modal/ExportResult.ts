
import {ExportPlatform, ExportStatus} from "@/lib/api/types/supabase/VideoGenerationTasks";

export interface ExportResult {
    taskId: string;
    title?: string;
    platform: ExportPlatform;
    status: ExportStatus.SUCCESS | ExportStatus.FAILED;
}