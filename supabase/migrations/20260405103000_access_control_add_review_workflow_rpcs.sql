create or replace function public.cmd_review_json_array(p_value jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case jsonb_typeof(p_value)
    when 'array' then coalesce(p_value, '[]'::jsonb)
    when 'object' then jsonb_build_array(p_value)
    when 'string' then jsonb_build_array(p_value)
    when 'number' then jsonb_build_array(p_value)
    when 'boolean' then jsonb_build_array(p_value)
    else '[]'::jsonb
  end
$$;

create or replace function public.cmd_review_merge_json_collection(
  p_existing jsonb,
  p_additions jsonb
)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select public.cmd_review_json_array(p_existing) || public.cmd_review_json_array(p_additions)
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
      coalesce(p_model_json, '{}'::jsonb) as model_json
  )
  select jsonb_set(
    jsonb_set(
      base.process_json,
      '{processDataSet,modellingAndValidation,validation,review}',
      public.cmd_review_merge_json_collection(
        base.model_json #> '{lifeCycleModelDataSet,modellingAndValidation,validation,review}',
        p_comment_review
      ),
      true
    ),
    '{processDataSet,modellingAndValidation,complianceDeclarations,compliance}',
    public.cmd_review_merge_json_collection(
      base.model_json #> '{lifeCycleModelDataSet,modellingAndValidation,complianceDeclarations,compliance}',
      p_comment_compliance
    ),
    true
  )
  from base
$$;

create or replace function public.cmd_review_normalize_reviewer_ids(p_reviewer_ids jsonb)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with normalized as (
    select
      value,
      min(ordinality) as ordinality
    from jsonb_array_elements_text(
      case
        when jsonb_typeof(p_reviewer_ids) = 'array' then p_reviewer_ids
        else '[]'::jsonb
      end
    ) with ordinality as reviewer_ids(value, ordinality)
    where value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    group by value
  )
  select coalesce(
    jsonb_agg(to_jsonb(value) order by ordinality),
    '[]'::jsonb
  )
  from normalized
$$;

create or replace function public.cmd_review_is_review_admin(p_actor uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.roles
    where user_id = coalesce(p_actor, auth.uid())
      and role = 'review-admin'
  )
$$;

create or replace function public.cmd_review_get_actor_meta(p_actor uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_meta jsonb;
  v_display_name text;
  v_email text;
begin
  select u.raw_user_meta_data
    into v_meta
  from public.users as u
  where u.id = p_actor;

  v_display_name := coalesce(nullif(v_meta->>'display_name', ''), nullif(v_meta->>'email', ''));
  v_email := nullif(v_meta->>'email', '');

  return jsonb_strip_nulls(
    jsonb_build_object(
      'id', p_actor,
      'display_name', v_display_name,
      'email', v_email
    )
  );
end;
$$;

create or replace function public.cmd_review_append_log(
  p_review_json jsonb,
  p_action text,
  p_actor uuid,
  p_extra jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_review_json jsonb := coalesce(p_review_json, '{}'::jsonb);
  v_logs jsonb := public.cmd_review_json_array(v_review_json->'logs');
  v_actor_meta jsonb := public.cmd_review_get_actor_meta(p_actor);
  v_log_entry jsonb;
begin
  v_log_entry := jsonb_build_object(
    'action', p_action,
    'time', to_jsonb(now()),
    'user', v_actor_meta
  ) || coalesce(p_extra, '{}'::jsonb);

  return jsonb_set(
    v_review_json,
    '{logs}',
    v_logs || jsonb_build_array(v_log_entry),
    true
  );
end;
$$;

create or replace function public.cmd_review_get_root_table(
  p_review_json jsonb,
  p_data_id uuid,
  p_data_version text
)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_explicit text := lower(nullif(p_review_json#>>'{data,table}', ''));
  v_process_row jsonb;
  v_model_row jsonb;
  v_expected_name jsonb := coalesce(p_review_json#>'{data,name}', '{}'::jsonb);
begin
  if v_explicit in ('processes', 'lifecyclemodels') then
    return v_explicit;
  end if;

  v_process_row := public.cmd_review_get_dataset_row('processes', p_data_id, p_data_version, false);
  v_model_row := public.cmd_review_get_dataset_row(
    'lifecyclemodels',
    p_data_id,
    p_data_version,
    false
  );

  if v_model_row is not null
     and public.cmd_review_get_dataset_name('lifecyclemodels', v_model_row) = v_expected_name then
    return 'lifecyclemodels';
  end if;

  if v_process_row is not null
     and public.cmd_review_get_dataset_name('processes', v_process_row) = v_expected_name then
    return 'processes';
  end if;

  if v_model_row is not null and v_process_row is null then
    return 'lifecyclemodels';
  end if;

  if v_process_row is not null then
    return 'processes';
  end if;

  return null;
end;
$$;

create or replace function public.cmd_review_collect_dataset_targets(
  p_roots jsonb,
  p_lock boolean default false
)
returns table (
  table_name text,
  dataset_id uuid,
  dataset_version text,
  state_code integer,
  reviews jsonb,
  dataset_row jsonb,
  is_root boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_root jsonb;
  v_current record;
  v_current_row jsonb;
  v_current_state_code integer;
  v_ref record;
  v_ref_table text;
  v_submodel jsonb;
  v_paired_model_exists boolean;
  v_paired_process_exists boolean;
begin
  create temporary table if not exists cmd_review_collect_queue (
    table_name text not null,
    dataset_id uuid not null,
    dataset_version text not null,
    is_root boolean not null default false,
    primary key (table_name, dataset_id, dataset_version)
  ) on commit drop;

  create temporary table if not exists cmd_review_collect_targets (
    table_name text not null,
    dataset_id uuid not null,
    dataset_version text not null,
    state_code integer not null,
    reviews jsonb,
    dataset_row jsonb not null,
    is_root boolean not null default false,
    primary key (table_name, dataset_id, dataset_version)
  ) on commit drop;

  truncate table cmd_review_collect_queue;
  truncate table cmd_review_collect_targets;

  if jsonb_typeof(p_roots) <> 'array' then
    return;
  end if;

  for v_root in
    select value
    from jsonb_array_elements(p_roots)
  loop
    if lower(coalesce(v_root->>'table', '')) not in (
      'contacts',
      'sources',
      'unitgroups',
      'flowproperties',
      'flows',
      'processes',
      'lifecyclemodels'
    ) then
      continue;
    end if;

    if not (coalesce(v_root->>'id', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
      continue;
    end if;

    if nullif(v_root->>'version', '') is null then
      continue;
    end if;

    insert into cmd_review_collect_queue (
      table_name,
      dataset_id,
      dataset_version,
      is_root
    )
    values (
      lower(v_root->>'table'),
      (v_root->>'id')::uuid,
      v_root->>'version',
      coalesce((v_root->>'is_root')::boolean, false)
    )
    on conflict do nothing;
  end loop;

  while exists (select 1 from cmd_review_collect_queue) loop
    select
      q.table_name,
      q.dataset_id,
      q.dataset_version,
      q.is_root
    into v_current
    from cmd_review_collect_queue as q
    order by q.is_root desc, q.table_name, q.dataset_id, q.dataset_version
    limit 1;

    delete from cmd_review_collect_queue as q
    where q.table_name = v_current.table_name
      and q.dataset_id = v_current.dataset_id
      and q.dataset_version = v_current.dataset_version;

    if exists (
      select 1
      from cmd_review_collect_targets as t
      where t.table_name = v_current.table_name
        and t.dataset_id = v_current.dataset_id
        and t.dataset_version = v_current.dataset_version
    ) then
      continue;
    end if;

    v_current_row := public.cmd_review_get_dataset_row(
      v_current.table_name,
      v_current.dataset_id,
      v_current.dataset_version,
      p_lock
    );

    if v_current_row is null then
      continue;
    end if;

    v_current_state_code := coalesce((v_current_row->>'state_code')::integer, 0);

    insert into cmd_review_collect_targets (
      table_name,
      dataset_id,
      dataset_version,
      state_code,
      reviews,
      dataset_row,
      is_root
    )
    values (
      v_current.table_name,
      v_current.dataset_id,
      v_current.dataset_version,
      v_current_state_code,
      v_current_row->'reviews',
      v_current_row,
      v_current.is_root
    )
    on conflict do nothing;

    if v_current_state_code >= 100 and not v_current.is_root then
      if v_current.table_name = 'processes' then
        v_paired_model_exists := public.cmd_review_get_dataset_row(
          'lifecyclemodels',
          v_current.dataset_id,
          v_current.dataset_version,
          false
        ) is not null;

        if v_paired_model_exists then
          insert into cmd_review_collect_queue (
            table_name,
            dataset_id,
            dataset_version,
            is_root
          )
          values (
            'lifecyclemodels',
            v_current.dataset_id,
            v_current.dataset_version,
            false
          )
          on conflict do nothing;
        end if;
      end if;

      continue;
    end if;

    for v_ref in (
      select *
      from public.cmd_review_extract_refs(coalesce(v_current_row->'json_ordered', '{}'::jsonb))
      union
      select *
      from public.cmd_review_extract_refs(coalesce(v_current_row->'json', '{}'::jsonb))
      union
      select *
      from public.cmd_review_extract_refs(coalesce(v_current_row->'json_tg', '{}'::jsonb))
    ) loop
      v_ref_table := public.cmd_review_ref_type_to_table(v_ref.ref_type);

      if v_ref_table is null then
        continue;
      end if;

      if v_ref_table = v_current.table_name
         and v_ref.ref_object_id = v_current.dataset_id
         and v_ref.ref_version = v_current.dataset_version then
        continue;
      end if;

      insert into cmd_review_collect_queue (
        table_name,
        dataset_id,
        dataset_version,
        is_root
      )
      values (
        v_ref_table,
        v_ref.ref_object_id,
        v_ref.ref_version,
        false
      )
      on conflict do nothing;
    end loop;

    if v_current.table_name = 'processes' and not v_current.is_root then
      v_paired_model_exists := public.cmd_review_get_dataset_row(
        'lifecyclemodels',
        v_current.dataset_id,
        v_current.dataset_version,
        false
      ) is not null;

      if v_paired_model_exists then
        insert into cmd_review_collect_queue (
          table_name,
          dataset_id,
          dataset_version,
          is_root
        )
        values (
          'lifecyclemodels',
          v_current.dataset_id,
          v_current.dataset_version,
          false
        )
        on conflict do nothing;
      end if;
    end if;

    if v_current.table_name = 'lifecyclemodels' then
      if v_current.is_root then
        v_paired_process_exists := public.cmd_review_get_dataset_row(
          'processes',
          v_current.dataset_id,
          v_current.dataset_version,
          false
        ) is not null;

        if v_paired_process_exists then
          insert into cmd_review_collect_queue (
            table_name,
            dataset_id,
            dataset_version,
            is_root
          )
          values (
            'processes',
            v_current.dataset_id,
            v_current.dataset_version,
            false
          )
          on conflict do nothing;
        end if;
      end if;

      for v_submodel in
        select value
        from jsonb_array_elements(coalesce(v_current_row->'json_tg'->'submodels', '[]'::jsonb))
      loop
        if lower(coalesce(v_submodel->>'type', '')) <> 'secondary' then
          continue;
        end if;

        if not ((v_submodel->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
          continue;
        end if;

        insert into cmd_review_collect_queue (
          table_name,
          dataset_id,
          dataset_version,
          is_root
        )
        values (
          'processes',
          (v_submodel->>'id')::uuid,
          coalesce(nullif(v_submodel->>'version', ''), v_current.dataset_version),
          false
        )
        on conflict do nothing;
      end loop;
    end if;
  end loop;

  return query
  select
    t.table_name,
    t.dataset_id,
    t.dataset_version,
    t.state_code,
    t.reviews,
    t.dataset_row,
    t.is_root
  from cmd_review_collect_targets as t
  order by t.is_root desc, t.table_name, t.dataset_id, t.dataset_version;
end;
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

create or replace function public.cmd_review_save_assignment_draft(
  p_review_id uuid,
  p_reviewer_ids jsonb,
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
  v_reviewer_ids jsonb;
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
      'message', 'Only review admins can manage reviewer assignments'
    );
  end if;

  if coalesce(jsonb_typeof(p_reviewer_ids), 'null') not in ('null', 'array') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEWER_IDS',
      'status', 400,
      'message', 'reviewerIds must be an array of UUID strings'
    );
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(coalesce(p_reviewer_ids, '[]'::jsonb)) as reviewer_ids(value)
    where reviewer_ids.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEWER_IDS',
      'status', 400,
      'message', 'reviewerIds must contain valid UUID strings only'
    );
  end if;

  v_reviewer_ids := public.cmd_review_normalize_reviewer_ids(coalesce(p_reviewer_ids, '[]'::jsonb));

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

  if v_review.state_code not in (-1, 0, 1) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEW_STATE',
      'status', 409,
      'message', 'Reviewer assignments can only be changed for unassigned or active reviews',
      'details', jsonb_build_object(
        'state_code', v_review.state_code
      )
    );
  end if;

  v_review_json := public.cmd_review_append_log(
    coalesce(v_review.json, '{}'::jsonb),
    'assign_reviewers_temporary',
    v_actor,
    jsonb_build_object(
      'reviewer_ids', v_reviewer_ids
    )
  );

  update public.reviews
    set reviewer_id = v_reviewer_ids,
        json = v_review_json,
        modified_at = now()
  where id = p_review_id
  returning *
    into v_review;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_save_assignment_draft',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'reviewer_ids', v_reviewer_ids
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', to_jsonb(v_review)
    )
  );
end;
$$;

create or replace function public.cmd_review_assign_reviewers(
  p_review_id uuid,
  p_reviewer_ids jsonb,
  p_deadline timestamptz default null,
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
  v_reviewer_ids jsonb;
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
      'message', 'Only review admins can assign reviewers'
    );
  end if;

  if coalesce(jsonb_typeof(p_reviewer_ids), 'null') <> 'array' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEWER_IDS',
      'status', 400,
      'message', 'reviewerIds must be an array of UUID strings'
    );
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_reviewer_ids) as reviewer_ids(value)
    where reviewer_ids.value !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEWER_IDS',
      'status', 400,
      'message', 'reviewerIds must contain valid UUID strings only'
    );
  end if;

  v_reviewer_ids := public.cmd_review_normalize_reviewer_ids(p_reviewer_ids);

  if jsonb_array_length(v_reviewer_ids) = 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEWER_REQUIRED',
      'status', 400,
      'message', 'At least one reviewer is required'
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

  if v_review.state_code not in (-1, 0, 1) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEW_STATE',
      'status', 409,
      'message', 'Reviewers can only be assigned for pending or rejected reviews',
      'details', jsonb_build_object(
        'state_code', v_review.state_code
      )
    );
  end if;

  create temporary table if not exists cmd_review_assignment_active_reviewers (
    reviewer_id uuid primary key
  ) on commit drop;

  truncate table cmd_review_assignment_active_reviewers;

  insert into cmd_review_assignment_active_reviewers (reviewer_id)
  select value::uuid
  from jsonb_array_elements_text(v_reviewer_ids) as reviewer_ids(value);

  update public.comments
    set state_code = -2,
        modified_at = now()
  where review_id = p_review_id
    and reviewer_id not in (
      select reviewer_id
      from cmd_review_assignment_active_reviewers
    )
    and state_code = 0;

  insert into public.comments (
    review_id,
    reviewer_id,
    state_code
  )
  select
    p_review_id,
    reviewer_id,
    0
  from cmd_review_assignment_active_reviewers
  on conflict (review_id, reviewer_id) do update
    set state_code = case
      when public.comments.state_code in (-2, -1) then 0
      else public.comments.state_code
    end,
        modified_at = now();

  v_review_json := public.cmd_review_append_log(
    coalesce(v_review.json, '{}'::jsonb),
    'assign_reviewers',
    v_actor,
    jsonb_strip_nulls(
      jsonb_build_object(
        'reviewer_ids', v_reviewer_ids,
        'deadline', case
          when p_deadline is null then null
          else to_jsonb(p_deadline)
        end
      )
    )
  );

  update public.reviews
    set reviewer_id = v_reviewer_ids,
        state_code = 1,
        deadline = p_deadline,
        json = v_review_json,
        modified_at = now()
  where id = p_review_id
  returning *
    into v_review;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_assign_reviewers',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_strip_nulls(
      jsonb_build_object(
        'reviewer_ids', v_reviewer_ids,
        'deadline', case
          when p_deadline is null then null
          else to_jsonb(p_deadline)
        end
      )
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', to_jsonb(v_review)
    )
  );
end;
$$;

create or replace function public.cmd_review_revoke_reviewer(
  p_review_id uuid,
  p_reviewer_id uuid,
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
  v_comment public.comments%rowtype;
  v_remaining_reviewer_ids jsonb;
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
      'message', 'Only review admins can revoke reviewers'
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
      'message', 'Reviewers can only be revoked from assigned reviews',
      'details', jsonb_build_object(
        'state_code', v_review.state_code
      )
    );
  end if;

  if not public.cmd_review_json_array(v_review.reviewer_id) @> jsonb_build_array(to_jsonb(p_reviewer_id::text)) then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEWER_NOT_ASSIGNED',
      'status', 409,
      'message', 'Reviewer is not currently assigned to this review'
    );
  end if;

  select *
    into v_comment
  from public.comments
  where review_id = p_review_id
    and reviewer_id = p_reviewer_id
  for update;

  if found and v_comment.state_code <> 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEWER_ALREADY_RESPONDED',
      'status', 409,
      'message', 'Only pending reviewers can be revoked',
      'details', jsonb_build_object(
        'comment_state_code', v_comment.state_code
      )
    );
  end if;

  select coalesce(
    jsonb_agg(to_jsonb(value) order by ordinality),
    '[]'::jsonb
  )
    into v_remaining_reviewer_ids
  from jsonb_array_elements_text(public.cmd_review_json_array(v_review.reviewer_id))
       with ordinality as reviewer_ids(value, ordinality)
  where reviewer_ids.value <> p_reviewer_id::text;

  v_review_json := public.cmd_review_append_log(
    coalesce(v_review.json, '{}'::jsonb),
    'revoke_reviewer',
    v_actor,
    jsonb_build_object(
      'reviewer_id', p_reviewer_id
    )
  );

  update public.reviews
    set reviewer_id = v_remaining_reviewer_ids,
        state_code = case
          when jsonb_array_length(v_remaining_reviewer_ids) = 0 then 0
          else 1
        end,
        json = v_review_json,
        modified_at = now()
  where id = p_review_id
  returning *
    into v_review;

  update public.comments
    set state_code = -2,
        modified_at = now()
  where review_id = p_review_id
    and reviewer_id = p_reviewer_id;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_revoke_reviewer',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'reviewer_id', p_reviewer_id,
      'remaining_reviewer_ids', v_remaining_reviewer_ids
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', to_jsonb(v_review)
    )
  );
end;
$$;

create or replace function public.cmd_review_save_comment_draft(
  p_review_id uuid,
  p_json jsonb,
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
  v_comment public.comments%rowtype;
  v_comment_json jsonb := coalesce(p_json, '{}'::jsonb);
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

  if coalesce(jsonb_typeof(v_comment_json), 'null') <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_COMMENT_JSON',
      'status', 400,
      'message', 'comment json must be an object'
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

  if v_review.state_code not in (-1, 1) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEW_STATE',
      'status', 409,
      'message', 'Review comments can only be edited for assigned or rejected reviews',
      'details', jsonb_build_object(
        'state_code', v_review.state_code
      )
    );
  end if;

  if not public.cmd_review_json_array(v_review.reviewer_id) @> jsonb_build_array(to_jsonb(v_actor::text)) then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEWER_REQUIRED',
      'status', 403,
      'message', 'Only assigned reviewers can edit review comments'
    );
  end if;

  select *
    into v_comment
  from public.comments
  where review_id = p_review_id
    and reviewer_id = v_actor
  for update;

  if found and v_comment.state_code in (-2, 2) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_COMMENT_STATE',
      'status', 409,
      'message', 'This reviewer comment can no longer be edited',
      'details', jsonb_build_object(
        'state_code', v_comment.state_code
      )
    );
  end if;

  if not found then
    insert into public.comments (
      review_id,
      reviewer_id,
      json,
      state_code
    )
    values (
      p_review_id,
      v_actor,
      v_comment_json::json,
      case
        when v_review.state_code = -1 then -1
        else 0
      end
    )
    returning *
      into v_comment;
  else
    update public.comments
      set json = v_comment_json::json,
          modified_at = now()
    where review_id = p_review_id
      and reviewer_id = v_actor
    returning *
      into v_comment;
  end if;

  v_review_json := public.cmd_review_append_log(
    coalesce(v_review.json, '{}'::jsonb),
    'submit_comments_temporary',
    v_actor,
    jsonb_build_object(
      'reviewer_id', v_actor
    )
  );

  update public.reviews
    set json = v_review_json,
        modified_at = now()
  where id = p_review_id
  returning *
    into v_review;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_save_comment_draft',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'reviewer_id', v_actor,
      'comment_state_code', v_comment.state_code
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', to_jsonb(v_review),
      'comment', to_jsonb(v_comment)
    )
  );
end;
$$;

create or replace function public.cmd_review_submit_comment(
  p_review_id uuid,
  p_json jsonb,
  p_comment_state integer default 1,
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
  v_comment public.comments%rowtype;
  v_comment_json jsonb := coalesce(p_json, '{}'::jsonb);
  v_review_json jsonb;
  v_ref record;
  v_ref_table text;
  v_ref_roots jsonb := '[]'::jsonb;
  v_target record;
  v_affected_datasets jsonb := '[]'::jsonb;
  v_action text;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_comment_state not in (-3, 1) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_COMMENT_STATE',
      'status', 400,
      'message', 'commentState must be 1 or -3'
    );
  end if;

  if coalesce(jsonb_typeof(v_comment_json), 'null') <> 'object' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_COMMENT_JSON',
      'status', 400,
      'message', 'comment json must be an object'
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

  if v_review.state_code not in (-1, 1) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEW_STATE',
      'status', 409,
      'message', 'Review comments can only be submitted for assigned or rejected reviews',
      'details', jsonb_build_object(
        'state_code', v_review.state_code
      )
    );
  end if;

  if not public.cmd_review_json_array(v_review.reviewer_id) @> jsonb_build_array(to_jsonb(v_actor::text)) then
    return jsonb_build_object(
      'ok', false,
      'code', 'REVIEWER_REQUIRED',
      'status', 403,
      'message', 'Only assigned reviewers can submit review comments'
    );
  end if;

  select *
    into v_comment
  from public.comments
  where review_id = p_review_id
    and reviewer_id = v_actor
  for update;

  if found and v_comment.state_code in (-2, 2) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_COMMENT_STATE',
      'status', 409,
      'message', 'This reviewer comment can no longer be submitted',
      'details', jsonb_build_object(
        'state_code', v_comment.state_code
      )
    );
  end if;

  if not found then
    insert into public.comments (
      review_id,
      reviewer_id,
      state_code
    )
    values (
      p_review_id,
      v_actor,
      case
        when v_review.state_code = -1 then -1
        else 0
      end
    )
    returning *
      into v_comment;
  end if;

  if p_comment_state = 1 then
    for v_ref in
      select *
      from public.cmd_review_extract_refs(v_comment_json)
    loop
      v_ref_table := public.cmd_review_ref_type_to_table(v_ref.ref_type);

      if v_ref_table is null then
        continue;
      end if;

      v_ref_roots := v_ref_roots || jsonb_build_array(
        jsonb_build_object(
          'table', v_ref_table,
          'id', v_ref.ref_object_id,
          'version', v_ref.ref_version,
          'is_root', false
        )
      );
    end loop;

    create temporary table if not exists cmd_review_submit_comment_targets (
      table_name text not null,
      dataset_id uuid not null,
      dataset_version text not null,
      state_code integer not null,
      reviews jsonb,
      dataset_row jsonb not null,
      is_root boolean not null default false,
      primary key (table_name, dataset_id, dataset_version)
    ) on commit drop;

    truncate table cmd_review_submit_comment_targets;

    insert into cmd_review_submit_comment_targets (
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
    from public.cmd_review_collect_dataset_targets(v_ref_roots, true);

    for v_target in
      select *
      from cmd_review_submit_comment_targets
      where state_code >= 20
        and state_code < 100
      order by table_name, dataset_id, dataset_version
    loop
      return jsonb_build_object(
        'ok', false,
        'code', 'REFERENCED_DATA_UNDER_REVIEW',
        'status', 409,
        'message', 'Referenced data is already under review',
        'details', jsonb_build_object(
          'table', v_target.table_name,
          'id', v_target.dataset_id,
          'version', v_target.dataset_version,
          'state_code', 20,
          'review_state_code', v_target.state_code
        )
      );
    end loop;

    for v_target in
      select *
      from cmd_review_submit_comment_targets
      where state_code < 20
      order by table_name, dataset_id, dataset_version
    loop
      execute format(
        'update public.%I
            set state_code = 20,
                reviews = $1,
                modified_at = now()
          where id = $2
            and version = $3',
        v_target.table_name
      )
        using public.cmd_review_append_review_ref(v_target.reviews, p_review_id),
              v_target.dataset_id,
              v_target.dataset_version;
    end loop;

    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'table', table_name,
          'id', dataset_id,
          'version', dataset_version,
          'state_code', 20
        )
        order by table_name, dataset_id, dataset_version
      ),
      '[]'::jsonb
    )
      into v_affected_datasets
    from cmd_review_submit_comment_targets
    where state_code < 20;
  end if;

  update public.comments
    set json = v_comment_json::json,
        state_code = p_comment_state,
        modified_at = now()
  where review_id = p_review_id
    and reviewer_id = v_actor
  returning *
    into v_comment;

  v_action := case
    when p_comment_state = -3 then 'reviewer_rejected'
    else 'submit_comments'
  end;

  v_review_json := public.cmd_review_append_log(
    coalesce(v_review.json, '{}'::jsonb),
    v_action,
    v_actor,
    jsonb_build_object(
      'reviewer_id', v_actor,
      'comment_state_code', p_comment_state
    )
  );

  update public.reviews
    set state_code = case
          when p_comment_state = 1 and state_code = -1 then 1
          else state_code
        end,
        json = v_review_json,
        modified_at = now()
  where id = p_review_id
  returning *
    into v_review;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_submit_comment',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'reviewer_id', v_actor,
      'comment_state_code', p_comment_state,
      'affected_datasets', v_affected_datasets
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', to_jsonb(v_review),
      'comment', to_jsonb(v_comment),
      'affected_datasets', v_affected_datasets
    )
  );
end;
$$;

create or replace function public.cmd_review_submit_comment(
  p_review_id uuid,
  p_json jsonb,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select public.cmd_review_submit_comment(
    p_review_id,
    p_json,
    1,
    p_audit
  )
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

create or replace function public.cmd_review_reject(
  p_table text,
  p_review_id uuid,
  p_reason text,
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
  v_review_json jsonb;
  v_affected_datasets jsonb := '[]'::jsonb;
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
      'message', 'Only review admins can reject reviews'
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

  if v_review.state_code not in (-1, 0, 1) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_REVIEW_STATE',
      'status', 409,
      'message', 'Only pending, assigned, or rejected reviews can be rejected',
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

  create temporary table if not exists cmd_review_reject_targets (
    table_name text not null,
    dataset_id uuid not null,
    dataset_version text not null,
    state_code integer not null,
    reviews jsonb,
    dataset_row jsonb not null,
    is_root boolean not null default false,
    primary key (table_name, dataset_id, dataset_version)
  ) on commit drop;

  truncate table cmd_review_reject_targets;

  insert into cmd_review_reject_targets (
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

  for v_comment_ref in
    select distinct
      ref.ref_type,
      ref.ref_object_id,
      ref.ref_version
    from public.comments as c
    cross join lateral public.cmd_review_extract_refs(coalesce(to_jsonb(c.json), '{}'::jsonb)) as ref
    where c.review_id = p_review_id
      and c.state_code <> -2
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

  insert into cmd_review_reject_targets (
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

  for v_target in
    select *
    from cmd_review_reject_targets
    where state_code >= 20
      and state_code < 100
    order by table_name, dataset_id, dataset_version
  loop
    execute format(
      'update public.%I
          set state_code = 0,
              modified_at = now()
        where id = $1
          and version = $2',
      v_target.table_name
    )
      using v_target.dataset_id, v_target.dataset_version;
  end loop;

  update public.comments
    set state_code = -1,
        modified_at = now()
  where review_id = p_review_id
    and state_code <> -2;

  v_review_json := coalesce(v_review.json, '{}'::jsonb);
  v_review_json := jsonb_set(
    v_review_json,
    '{comment}',
    coalesce(v_review_json->'comment', '{}'::jsonb) || jsonb_build_object(
      'message', coalesce(p_reason, '')
    ),
    true
  );
  v_review_json := public.cmd_review_append_log(
    v_review_json,
    'rejected',
    v_actor,
    jsonb_build_object(
      'reason', coalesce(p_reason, '')
    )
  );

  update public.reviews
    set state_code = -1,
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
        'state_code', 0
      )
      order by table_name, dataset_id, dataset_version
    ),
    '[]'::jsonb
  )
    into v_affected_datasets
  from cmd_review_reject_targets
  where state_code >= 20
    and state_code < 100;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_review_reject',
    v_actor,
    'reviews',
    p_review_id,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'root_table', v_root_table,
      'reason', coalesce(p_reason, ''),
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

revoke all on function public.cmd_review_json_array(jsonb) from public;
revoke all on function public.cmd_review_merge_json_collection(jsonb, jsonb) from public;
revoke all on function public.cmd_review_apply_model_validation_to_process_json(jsonb, jsonb, jsonb, jsonb) from public;
revoke all on function public.cmd_review_normalize_reviewer_ids(jsonb) from public;
revoke all on function public.cmd_review_is_review_admin(uuid) from public;
revoke all on function public.cmd_review_get_actor_meta(uuid) from public;
revoke all on function public.cmd_review_append_log(jsonb, text, uuid, jsonb) from public;
revoke all on function public.cmd_review_get_root_table(jsonb, uuid, text) from public;
revoke all on function public.cmd_review_collect_dataset_targets(jsonb, boolean) from public;
revoke all on function public.cmd_review_apply_mv_payload(text, uuid, text, jsonb, jsonb) from public;
revoke all on function public.cmd_review_save_assignment_draft(uuid, jsonb, jsonb) from public;
revoke all on function public.cmd_review_assign_reviewers(uuid, jsonb, timestamp with time zone, jsonb) from public;
revoke all on function public.cmd_review_revoke_reviewer(uuid, uuid, jsonb) from public;
revoke all on function public.cmd_review_save_comment_draft(uuid, jsonb, jsonb) from public;
revoke all on function public.cmd_review_submit_comment(uuid, jsonb, jsonb) from public;
revoke all on function public.cmd_review_submit_comment(uuid, jsonb, integer, jsonb) from public;
revoke all on function public.cmd_review_approve(text, uuid, jsonb) from public;
revoke all on function public.cmd_review_reject(text, uuid, text, jsonb) from public;

grant execute on function public.cmd_review_save_assignment_draft(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.cmd_review_save_assignment_draft(uuid, jsonb, jsonb) to service_role;
grant execute on function public.cmd_review_assign_reviewers(uuid, jsonb, timestamp with time zone, jsonb) to authenticated;
grant execute on function public.cmd_review_assign_reviewers(uuid, jsonb, timestamp with time zone, jsonb) to service_role;
grant execute on function public.cmd_review_revoke_reviewer(uuid, uuid, jsonb) to authenticated;
grant execute on function public.cmd_review_revoke_reviewer(uuid, uuid, jsonb) to service_role;
grant execute on function public.cmd_review_save_comment_draft(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.cmd_review_save_comment_draft(uuid, jsonb, jsonb) to service_role;
grant execute on function public.cmd_review_submit_comment(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.cmd_review_submit_comment(uuid, jsonb, jsonb) to service_role;
grant execute on function public.cmd_review_submit_comment(uuid, jsonb, integer, jsonb) to authenticated;
grant execute on function public.cmd_review_submit_comment(uuid, jsonb, integer, jsonb) to service_role;
grant execute on function public.cmd_review_approve(text, uuid, jsonb) to authenticated;
grant execute on function public.cmd_review_approve(text, uuid, jsonb) to service_role;
grant execute on function public.cmd_review_reject(text, uuid, text, jsonb) to authenticated;
grant execute on function public.cmd_review_reject(text, uuid, text, jsonb) to service_role;
