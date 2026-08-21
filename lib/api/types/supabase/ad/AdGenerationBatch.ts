/**
 * ad_generation_batches 테이블 타입 정의 — ⚠️ 임시 초안 (미완).
 * 변주 스펙(concepts) 형식, results 저장 방식(RPC+jsonb vs 후보 테이블)은
 * ad_variation_study.md 참고 — 자고 일어난 뒤 확정 예정.
 */

export type AdAspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '2:3';

export type AdBatchStatus = 'queued' | 'generating' | 'designing' | 'rendering' | 'completed' | 'failed';

export interface AdUploadedComponentRecord {
    /** Supabase Storage 경로 — 바이너리는 버킷에만 존재 */
    path: string;
    width?: number;
    height?: number;
    note?: string;
}

export interface AdResultItem {
    conceptIndex: number;
    aspectRatio: AdAspectRatio;
    design: unknown; // AdDesignLayout (형식 미정)
    score: number | null;
}

export interface AdGenerationBatch {
    id: string;
    user_id: string;
    status: AdBatchStatus;
    /** null이면 upload 모드 (background_image 사용) */
    background_prompt: string | null;
    background_image: AdUploadedComponentRecord | null;
    product_image: AdUploadedComponentRecord | null;
    person_image: AdUploadedComponentRecord | null;
    aspect_ratios: AdAspectRatio[];
    concept_count: number;
    cta_enabled: boolean;
    /** ★ 변주 스펙 벡터(지시문) — 개념별. 형식 미정 */
    concepts: unknown[];
    /** design/score — 저장 방식 미정 (RPC+jsonb 부분 갱신 vs 후보 테이블) */
    results: AdResultItem[];
    created_at: string;
    updated_at: string | null;
}