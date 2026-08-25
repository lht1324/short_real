-- ============================================================================
-- ShortReal Ad 파이프라인 — 배치 테이블 + 동시성 안전 RPC 3종
--
-- 병렬 오케스트레이션(creative별 자율 주행)에서 생기는 jsonb 배열 동시 쓰기를
-- 막는 장치. 모든 RPC는 단일 UPDATE 문(행 잠금) 안에서 jsonb_set으로 자기 조각만
-- 수술하므로, 동시 호출이 몰려도 서로 덮어쓰지 않는다.
--
--   1) update_creative_prompt_outputs                        — 프롬프트 단계 전용
--   2) update_creative_image_by_ratio_generation_completed   — 이미지 웹훅 전용
--   3) update_creative_image_analysis                        — Vision 분석 전용
-- ============================================================================

create table if not exists ad_generation_batches (
    id uuid primary key default gen_random_uuid(),
    user_id text not null,
    status text not null default 'queued',
    product_image jsonb,
    person_image jsonb,
    aspect_ratios jsonb not null default '[]'::jsonb,
    concept_count int not null default 1,
    cta_enabled boolean not null default false,
    ad_creative_specs jsonb not null default '[]'::jsonb,
    ad_creative_results jsonb not null default '[]'::jsonb,
    created_at timestamptz not null default now(),
    updated_at timestamptz
);

-- ----------------------------------------------------------------------------
-- 1) 프롬프트 산출물 저장 — 비율별 캡션(imageSpecs) + 판매 카피(copy)
--    프롬프트 단계가 creative당 1회 호출. 병렬 호출돼도 인덱스 슬라이스가 달라 안전.
-- ----------------------------------------------------------------------------
create or replace function update_creative_prompt_outputs(
    p_batch_id uuid,
    p_creative_index int,
    p_image_specs jsonb,  -- {"9_16": "caption...", "1_1": "caption..."}
    p_copy jsonb          -- {"headline": "...", "cta": "..."} | cta 미사용시 {"headline":"...","cta":null}
) returns void
language plpgsql as $$
begin
    update ad_generation_batches
    set ad_creative_specs = jsonb_set(
            ad_creative_specs,
            array[p_creative_index, 'imageSpecs'],
            p_image_specs,
            true
        ),
        ad_creative_results = jsonb_set(
            ad_creative_results,
            array[p_creative_index, 'copy'],
            p_copy,
            true
        ),
        updated_at = now()
    where id = p_batch_id
      and jsonb_array_length(ad_creative_specs) > p_creative_index;
end;
$$;

-- ----------------------------------------------------------------------------
-- 2) 이미지 생성 완료 — 웹훅 도착마다 호출. 완료 마커 기록 + 마지막 조각 판정.
--    반환: {"isLastCreative": bool, "batchCompleted": bool}
--    마커는 존재 자체가 완료 신호(design/score는 analysis가 나중에 채움).
--    전부 생성되면 status를 'generating' → 'designing'으로 전이 (analysis 대기).
--    멱등: 같은 (creative, ratio) 재전송 시 기존 값을 보존한다.
-- ----------------------------------------------------------------------------
create or replace function update_creative_image_by_ratio_generation_completed(
    p_batch_id uuid,
    p_creative_index int,
    p_ratio_key text
) returns jsonb
language plpgsql as $$
declare
    v_row ad_generation_batches;
    v_results jsonb;
    v_ratio_count int;
    v_expected_total int;
    v_done_in_creative int;
    v_done_total int;
begin
    select * into v_row
    from ad_generation_batches
    where id = p_batch_id
    for update;

    if not found then
        return jsonb_build_object('isLastCreative', false, 'batchCompleted', false);
    end if;

    v_ratio_count := jsonb_array_length(coalesce(v_row.aspect_ratios, '[]'::jsonb));
    v_expected_total := v_row.concept_count * v_ratio_count;

    -- 완료 마커 삽입 (이미 analysis가 채운 값이 있으면 그것을 보존)
    v_results := jsonb_set(
        coalesce(v_row.ad_creative_results, '[]'::jsonb),
        array[p_creative_index, 'imageResults', p_ratio_key],
        coalesce(
            v_row.ad_creative_results -> p_creative_index -> 'imageResults' -> p_ratio_key,
            jsonb_build_object('design', null, 'score', null)
        ),
        true
    );

    -- 이 creative의 완료 조각 수
    v_done_in_creative := (
        select count(*)
        from jsonb_object_keys(coalesce(v_results -> p_creative_index -> 'imageResults', '{}'::jsonb))
    );

    -- 배치 전체 완료 조각 수
    v_done_total := (
        select coalesce(count(*), 0)
        from jsonb_array_elements(v_results) elem,
             jsonb_object_keys(coalesce(elem -> 'imageResults', '{}'::jsonb))
    );

    update ad_generation_batches
    set ad_creative_results = v_results,
        status = case
                     when v_done_total >= v_expected_total then 'designing'
                     else status
        end,
        updated_at = now()
    where id = p_batch_id;

    return jsonb_build_object(
        'isLastCreative', v_done_in_creative >= v_ratio_count,
        'batchCompleted', v_done_total >= v_expected_total
    );
end;
$$;

-- ----------------------------------------------------------------------------
-- 3) 분석 결과 저장 — Vision이 확정한 design/score를 통째로 슬라이스 교체.
--    배치의 모든 조각에 score가 채워지면 status를 'completed'로 전이.
-- ----------------------------------------------------------------------------
create or replace function update_creative_image_analysis(
    p_batch_id uuid,
    p_creative_index int,
    p_image_results jsonb  -- Partial<Record<AdRatioKey, AdImageResult>>
) returns void
language plpgsql as $$
declare
    v_row ad_generation_batches;
    v_results jsonb;
    v_expected_total int;
    v_scored_total int;
begin
    select * into v_row
    from ad_generation_batches
    where id = p_batch_id
    for update;

    if not found then
        return;
    end if;

    v_expected_total := v_row.concept_count * jsonb_array_length(coalesce(v_row.aspect_ratios, '[]'::jsonb));

    v_results := jsonb_set(
        coalesce(v_row.ad_creative_results, '[]'::jsonb),
        array[p_creative_index, 'imageResults'],
        p_image_results,
        true
    );

    -- score가 숫자로 채워진 조각 수 = 분석 완료 조각 수
    v_scored_total := (
        select coalesce(count(*), 0)
        from jsonb_array_elements(v_results) elem,
             jsonb_each(coalesce(elem -> 'imageResults', '{}'::jsonb)) piece
        where jsonb_typeof(piece.value -> 'score') = 'number'
    );

    update ad_generation_batches
    set ad_creative_results = v_results,
        status = case
                     when v_scored_total >= v_expected_total then 'completed'
                     else status
        end,
        updated_at = now()
    where id = p_batch_id;
end;
$$;
