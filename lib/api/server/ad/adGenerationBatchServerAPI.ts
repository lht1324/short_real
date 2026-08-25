import { createSupabaseServiceRoleClient } from "@/lib/supabase/supabaseServiceRole";
import {
    AdBatchStatus,
    AdGenerationBatch,
} from "@/lib/api/types/supabase/ad/AdGenerationBatch";

/**
 * ad_generation_batches 전용 서버 API — 서비스 롤 클라이언트로 동작 (내부 파이프라인 전용).
 * videoGenerationTasksServerAPI 관례를 따른다.
 */
export const adGenerationBatchServerAPI = {
    // POST - 새 배치 생성
    async postAdGenerationBatch(batchData: Partial<AdGenerationBatch>): Promise<AdGenerationBatch> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .insert(batchData)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to create ad generation batch: ${error.message}`);
        }

        return data;
    },

    // GET - 배치 ID로 단일 조회
    async getAdGenerationBatchById(batchId: string): Promise<AdGenerationBatch | null> {
        const supabase = createSupabaseServiceRoleClient();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .select('*')
            .eq('id', batchId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // No rows returned
                return null;
            }
            throw new Error(`Failed to get ad generation batch: ${error.message}`);
        }

        return data;
    },

    // PATCH - 배치 데이터 업데이트 (updated_at 자동 기록)
    async patchAdGenerationBatch(
        batchId: string,
        patch: Partial<AdGenerationBatch>,
    ): Promise<AdGenerationBatch> {
        const supabase = createSupabaseServiceRoleClient();
        const currentDateString = new Date().toISOString();

        const { data, error } = await supabase
            .from('ad_generation_batches')
            .update({
                ...patch,
                updated_at: currentDateString,
            })
            .eq('id', batchId)
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to update ad generation batch: ${error.message}`);
        }

        return data;
    },

    // PATCH - 상태만 업데이트
    async patchAdGenerationBatchStatus(batchId: string, status: AdBatchStatus): Promise<AdGenerationBatch> {
        return adGenerationBatchServerAPI.patchAdGenerationBatch(batchId, { status });
    },
};
