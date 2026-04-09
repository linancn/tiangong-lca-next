create or replace function public.cmd_review_merge_validation(
  p_existing jsonb,
  p_additions jsonb
)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with normalized as (
    select
      case
        when jsonb_typeof(p_existing) = 'object' then p_existing
        else '{}'::jsonb
      end as existing_obj,
      case
        when jsonb_typeof(p_additions) = 'object' then p_additions
        else '{}'::jsonb
      end as additions_obj
  ),
  merged as (
    select
      existing_obj,
      additions_obj,
      existing_obj || (additions_obj - 'review') as base_obj
    from normalized
  )
  select case
    when additions_obj ? 'review' then
      jsonb_set(
        base_obj,
        '{review}',
        public.cmd_review_merge_json_collection(existing_obj->'review', additions_obj->'review'),
        true
      )
    else base_obj
  end
  from merged
$$;

create or replace function public.cmd_review_merge_compliance_declarations(
  p_existing jsonb,
  p_additions jsonb
)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with normalized as (
    select
      case
        when jsonb_typeof(p_existing) = 'object' then p_existing
        else '{}'::jsonb
      end as existing_obj,
      case
        when jsonb_typeof(p_additions) = 'object' then p_additions
        else '{}'::jsonb
      end as additions_obj
  ),
  merged as (
    select
      existing_obj,
      additions_obj,
      existing_obj || (additions_obj - 'compliance') as base_obj
    from normalized
  )
  select case
    when additions_obj ? 'compliance' then
      jsonb_set(
        base_obj,
        '{compliance}',
        public.cmd_review_merge_json_collection(
          existing_obj->'compliance',
          additions_obj->'compliance'
        ),
        true
      )
    else base_obj
  end
  from merged
$$;

create or replace function public.cmd_review_apply_model_validation_to_process_json(
  p_process_json jsonb,
  p_model_json jsonb,
  p_comment_review jsonb default '[]'::jsonb,
  p_comment_compliance jsonb default '[]'::jsonb
)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with base as (
    select
      coalesce(p_process_json, '{}'::jsonb) as process_json,
      public.cmd_review_json_array(
        coalesce(
          p_process_json #> '{processDataSet,modellingAndValidation,validation,review}',
          '[]'::jsonb
        )
      ) as existing_review_items,
      public.cmd_review_json_array(
        coalesce(
          p_process_json #> '{processDataSet,modellingAndValidation,complianceDeclarations,compliance}',
          '[]'::jsonb
        )
      ) as existing_compliance_items,
      public.cmd_review_json_array(coalesce(p_comment_review, '[]'::jsonb)) as comment_review_items,
      public.cmd_review_json_array(coalesce(p_comment_compliance, '[]'::jsonb))
        as comment_compliance_items
  )
  select jsonb_set(
    jsonb_set(
      base.process_json,
      '{processDataSet,modellingAndValidation,validation,review}',
      base.existing_review_items || base.comment_review_items,
      true
    ),
    '{processDataSet,modellingAndValidation,complianceDeclarations,compliance}',
    base.existing_compliance_items || base.comment_compliance_items,
    true
  )
  from base
$$;

create or replace function public.cmd_review_apply_mv_payload(
  p_table text,
  p_id uuid,
  p_version text,
  p_review_items jsonb default '[]'::jsonb,
  p_compliance_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_doc jsonb;
  v_review_path text[];
  v_compliance_path text[];
  v_review_items jsonb := coalesce(p_review_items, '[]'::jsonb);
  v_compliance_items jsonb := coalesce(p_compliance_items, '[]'::jsonb);
begin
  if p_table not in ('processes', 'lifecyclemodels') then
    return public.cmd_review_get_dataset_row(p_table, p_id, p_version, false);
  end if;

  v_row := public.cmd_review_get_dataset_row(p_table, p_id, p_version, true);

  if v_row is null then
    return null;
  end if;

  if p_table = 'processes' then
    v_review_path := array['processDataSet', 'modellingAndValidation', 'validation', 'review'];
    v_compliance_path := array[
      'processDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance'
    ];
  else
    v_review_path := array[
      'lifeCycleModelDataSet',
      'modellingAndValidation',
      'validation',
      'review'
    ];
    v_compliance_path := array[
      'lifeCycleModelDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance'
    ];
  end if;

  v_doc := coalesce(v_row->'json_ordered', v_row->'json', '{}'::jsonb);

  if jsonb_array_length(v_review_items) > 0 then
    v_doc := jsonb_set(
      v_doc,
      v_review_path,
      public.cmd_review_json_array(v_doc #> v_review_path) || v_review_items,
      true
    );
  end if;

  if jsonb_array_length(v_compliance_items) > 0 then
    v_doc := jsonb_set(
      v_doc,
      v_compliance_path,
      public.cmd_review_json_array(v_doc #> v_compliance_path) || v_compliance_items,
      true
    );
  end if;

  execute format(
    'update public.%I
        set json_ordered = $1::json,
            json = $1::jsonb,
            modified_at = now()
      where id = $2
        and version = $3',
    p_table
  )
    using v_doc, p_id, p_version;

  return public.cmd_review_get_dataset_row(p_table, p_id, p_version, false);
end;
$$;

create or replace function public.cmd_review_approve(
  p_table text,
  p_review_id uuid,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_review public.reviews%rowtype;
  v_root_table text;
  v_root_targets jsonb;
  v_comment_ref_roots jsonb := '[]'::jsonb;
  v_target record;
  v_comment_ref record;
  v_review_items jsonb := '[]'::jsonb;
  v_compliance_items jsonb := '[]'::jsonb;
  v_root_row jsonb;
  v_updated_root_row jsonb;
  v_submodel_ids uuid[] := array[]::uuid[];
  v_submodel_id uuid;
  v_submodel_doc jsonb;
  v_affected_datasets jsonb := '[]'::jsonb;
  v_review_json jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if not public.cmd_review_is_review_admin(v_actor) then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEW_ADMIN_REQUIRED',
      'status', 403,
      'message', 'Only review admins can approve reviews'
    );
  end if;

  v_root_table := lower(coalesce(p_table, ''));
  if v_root_table not in ('processes', 'lifecyclemodels') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_TABLE',
      'status', 400,
      'message', 'table must be processes or lifecyclemodels'
    );
  end if;

  select *
    into v_review
  from public.reviews
  where id = p_review_id
  for update;

  if not found then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEW_NOT_FOUND',
      'status', 404,
      'message', 'Review not found'
    );
  end if;

  if v_review.state_code <> 1 then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEW_STATE',
      'status', 409,
      'message', 'Only assigned reviews can be approved',
      'details', jsonb_build_object(
        'state_code', v_review.state_code
      )
    );
  end if;

  v_root_targets := jsonb_build_array(
    jsonb_build_object(
      'table', v_root_table,
      'id', v_review.data_id,
      'version', v_review.data_version,
      'is_root', true
    )
  );

  create temporary table if not exists cmd_review_approve_targets (
    table_name text not null,
    dataset_id uuid not null,
    dataset_version text not null,
    state_code integer not null,
    reviews jsonb,
    dataset_row jsonb not null,
    is_root boolean not null default false,
    primary key (table_name, dataset_id, dataset_version)
  ) on commit drop;

  truncate table cmd_review_approve_targets;

  insert into cmd_review_approve_targets (
    table_name,
    dataset_id,
    dataset_version,
    state_code,
    reviews,
    dataset_row,
    is_root
  )
  select
    table_name,
    dataset_id,
    dataset_version,
    state_code,
    reviews,
    dataset_row,
    is_root
  from public.cmd_review_collect_dataset_targets(v_root_targets, true);

  select coalesce(
    jsonb_agg(review_items.value),
    '[]'::jsonb
  )
    into v_review_items
  from public.comments as c
  cross join lateral jsonb_array_elements(
    public.cmd_review_json_array(to_jsonb(c.json)#>'{modellingAndValidation,validation,review}')
  ) as review_items(value)
  where c.review_id = p_review_id
    and c.state_code = 1;

  select coalesce(
    jsonb_agg(compliance_items.value),
    '[]'::jsonb
  )
    into v_compliance_items
  from public.comments as c
  cross join lateral jsonb_array_elements(
    public.cmd_review_json_array(
      to_jsonb(c.json)#>'{modellingAndValidation,complianceDeclarations,compliance}'
    )
  ) as compliance_items(value)
  where c.review_id = p_review_id
    and c.state_code = 1;

  for v_comment_ref in
    select distinct
      ref.ref_type,
      ref.ref_object_id,
      ref.ref_version
    from public.comments as c
    cross join lateral public.cmd_review_extract_refs(coalesce(to_jsonb(c.json), '{}'::jsonb)) as ref
    where c.review_id = p_review_id
      and c.state_code = 1
  loop
    v_comment_ref_roots := v_comment_ref_roots || jsonb_build_array(
      jsonb_build_object(
        'table', public.cmd_review_ref_type_to_table(v_comment_ref.ref_type),
        'id', v_comment_ref.ref_object_id,
        'version', v_comment_ref.ref_version,
        'is_root', false
      )
    );
  end loop;

  insert into cmd_review_approve_targets (
    table_name,
    dataset_id,
    dataset_version,
    state_code,
    reviews,
    dataset_row,
    is_root
  )
  select
    table_name,
    dataset_id,
    dataset_version,
    state_code,
    reviews,
    dataset_row,
    is_root
  from public.cmd_review_collect_dataset_targets(v_comment_ref_roots, true)
  on conflict (table_name, dataset_id, dataset_version) do nothing;

  select dataset_row
    into v_root_row
  from cmd_review_approve_targets
  where is_root
    and table_name = v_root_table
    and dataset_id = v_review.data_id
    and dataset_version = v_review.data_version
  limit 1;

  if v_root_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEW_TARGET_NOT_FOUND',
      'status', 404,
      'message', 'Review target dataset not found'
    );
  end if;

  if v_root_table = 'processes' then
    v_updated_root_row := public.cmd_review_apply_mv_payload(
      'processes',
      v_review.data_id,
      v_review.data_version,
      v_review_items,
      v_compliance_items
    );
  elsif v_root_table = 'lifecyclemodels' then
    select coalesce(
      array_agg((submodel.value->>'id')::uuid),
      array[]::uuid[]
    )
      into v_submodel_ids
    from jsonb_array_elements(coalesce(v_root_row->'json_tg'->'submodels', '[]'::jsonb))
         as submodel(value)
    where lower(coalesce(submodel.value->>'type', '')) = 'secondary'
      and (submodel.value->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    foreach v_submodel_id in array v_submodel_ids
    loop
      if not exists (
        select 1
        from cmd_review_approve_targets as t
        where t.table_name = 'processes'
          and t.dataset_id = v_submodel_id
          and t.dataset_version = v_review.data_version
      ) then
        return jsonb_build_object(
          'ok', false,
          'code', 'INVALID_PAYLOAD',
          'status', 400,
          'message', format(
            'Missing current process snapshot for submodel %s',
            v_submodel_id
          )
        );
      end if;
    end loop;

    v_updated_root_row := public.cmd_review_apply_mv_payload(
      'lifecyclemodels',
      v_review.data_id,
      v_review.data_version,
      v_review_items,
      v_compliance_items
    );

    foreach v_submodel_id in array v_submodel_ids
    loop
      select public.cmd_review_apply_model_validation_to_process_json(
        coalesce(t.dataset_row->'json_ordered', t.dataset_row->'json', '{}'::jsonb),
        coalesce(v_updated_root_row->'json_ordered', v_updated_root_row->'json', '{}'::jsonb),
        v_review_items,
        v_compliance_items
      )
        into v_submodel_doc
      from cmd_review_approve_targets as t
      where t.table_name = 'processes'
        and t.dataset_id = v_submodel_id
        and t.dataset_version = v_review.data_version
      limit 1;

      update public.processes
        set json_ordered = v_submodel_doc::json,
            json = v_submodel_doc,
            modified_at = now()
      where id = v_submodel_id
        and version = v_review.data_version;
    end loop;

    for v_target in
      select *
      from cmd_review_approve_targets
      where table_name = 'processes'
        and not (dataset_id = any(v_submodel_ids))
      order by dataset_id, dataset_version
    loop
      perform public.cmd_review_apply_mv_payload(
        'processes',
        v_target.dataset_id,
        v_target.dataset_version,
        v_review_items,
        v_compliance_items
      );
    end loop;
  end if;

  for v_target in
    select *
    from cmd_review_approve_targets
    where state_code < 100
      and state_code <> 200
    order by table_name, dataset_id, dataset_version
  loop
    execute format(
      'update public.%I
          set state_code = 100,
              modified_at = now()
        where id = $1
          and version = $2',
      v_target.table_name
    )
      using v_target.dataset_id, v_target.dataset_version;
  end loop;

  update public.comments
    set state_code = 2,
        modified_at = now()
  where review_id = p_review_id
    and state_code <> -2;

  v_review_json := public.cmd_review_append_log(
    coalesce(v_review.json, '{}'::jsonb),
    'approved',
    v_actor
  );

  update public.reviews
    set state_code = 2,
        json = v_review_json,
        modified_at = now()
  where id = p_review_id
  returning *
    into v_review;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'table', table_name,
        'id', dataset_id,
        'version', dataset_version,
        'state_code', 100
      )
      order by table_name, dataset_id, dataset_version
    ),
    '[]'::jsonb
  )
    into v_affected_datasets
  from cmd_review_approve_targets
  where state_code < 100
    and state_code <> 200;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_approve',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'root_table', v_root_table,
      'affected_datasets', v_affected_datasets
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', to_jsonb(v_review),
      'affected_datasets', v_affected_datasets
    )
  );
end;
$$;

revoke all on function public.cmd_review_merge_validation(jsonb, jsonb) from public;
revoke all on function public.cmd_review_merge_compliance_declarations(jsonb, jsonb) from public;
