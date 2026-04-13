import { ExportPlatform } from "@/lib/api/types/supabase/VideoGenerationTasks";
import { CaptionConfigState } from "@/components/page/workspace/editor/WorkspaceEditorPageClient";
import {ExportPrivacySetting} from "@/components/page/workspace/dashboard/export-settings-modal/ExportPrivacySetting";

export interface AutopilotData {
    id: string; // uuid
    user_id: string; // uuid
    name: string;
    is_active: boolean;
    niche_preset_id: string | null; // 프리셋인 경우 id, 커스텀인 경우 undefined
    niche_value: string; // 프리셋인 경우 프리셋 label, 커스텀인 경우 사용자가 입력한 프롬프트
    voice_id: string;
    style_id?: string;
    platforms: Record<ExportPlatform, boolean | undefined | null>; // 체크 여부 | 연결 안 됨 (Response) | 연결 안 함 (Request)
    schedule_cron: string;
    user_timezone: string;
    topic_history: string[];
    caption_config: CaptionConfigState;
    current_generating_task_id?: string;

    // Platform Setting
    youtube_privacy?: ExportPrivacySetting | null;

    last_run_at?: string | null; // timestamptz
    created_at?: string; // timestamptz
    updated_at?: string; // timestamptz
}