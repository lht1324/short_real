/**
 * ad_generation_batches 테이블 타입 정의 — ⚠️ 임시 (스키마 미확정).
 * ad_creative_specs[] 형식 합의됨. results 저장 방식(RPC+jsonb 부분 갱신 vs 후보 테이블)은
 * ad_variation_study.md §5,7 참고 — 아직 미정.
 */

export type AdAspectRatio = '1:1' | '4:5' | '9:16' | '16:9' | '2:3';

/**
 * JSON 키/경로에 콜론이 포함되면 여러 곳에서 곤란 → 언더스코어 정규화.
 * creativeIndex의 각 이미지(비율 파생) 대응 키.
 */
export type AdRatioKey = '1_1' | '4_5' | '9_16' | '16_9' | '2_3';

export type AdBatchStatus = 'queued' | 'generating' | 'designing' | 'rendering' | 'completed' | 'failed';

export interface AdUploadedComponentRecord {
    /** Supabase Storage 경로 — 바이너리는 버킷에만 존재 */
    path: string;
    width?: number;
    height?: number;
    note?: string;
}

export interface AdCreativeSpec {
    /** 배치 내 몇 번째 크리에이티브인지 (0-based) — results[]가 this를 참조 */
    creativeIndex: number;
    /** 크리에이티브 특성 = 이 크리에이티브의 "다름"을 정의하는 축 (코드가 배정) */
    camera: string;
    lighting: string;
    palette: string;
    framing: string;
    layout_tone: string;
    /**
     * 이미지(비율)별 최종 I2I 캡션. 같은 creative의 비율 파생마다 다른 캡션.
     * 비율마다 여백/강조가 달라야 하므로 키를 ratio로 구분 (생성 후 불변 → DB가 진실).
     */
    imageSpecs: Record<AdRatioKey, string>;
    /** creative 공통 시드 — 비율 파생들이 같은 seed를 공유해 "같은 개념"을 맞추는 신호 */
    seed: number;
}

export interface AdResultItem {
    creativeIndex: number;
    aspectRatio: AdAspectRatio;
    design: unknown; // AdOverlayLayout — 오버레이 배치(헤드라인/CTA/로고 위치 + scrim)
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
    aspect_ratios: AdRatioKey[];
    concept_count: number;
    cta_enabled: boolean;
    /** ★ 변주 스펙 벡터(지시문) — creative별 (5축+이미지 캡션+seed) */
    ad_creative_specs: AdCreativeSpec[];
    /** design/score — 저장 방식 미정 (RPC+jsonb 부분 갱신 vs 후보 테이블) */
    results: AdResultItem[];
    created_at: string;
    updated_at: string | null;
}