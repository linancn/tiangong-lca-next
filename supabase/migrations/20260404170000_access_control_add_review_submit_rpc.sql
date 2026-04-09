create or replace function public.cmd_review_ref_type_to_table(p_ref_type text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select case lower(trim(coalesce(p_ref_type, '')))
    when 'contact data set' then 'contacts'
    when 'source data set' then 'sources'
    when 'unit group data set' then 'unitgroups'
    when 'flow property data set' then 'flowproperties'
    when 'flow data set' then 'flows'
    when 'process data set' then 'processes'
    when 'lifecyclemodel data set' then 'lifecyclemodels'
    when 'lifecycle model data set' then 'lifecyclemodels'
    when 'lifecyclemodel dataset' then 'lifecyclemodels'
    else null
  end
$$;

create or replace function public.cmd_review_extract_refs(p_json jsonb)
returns table (
  ref_type text,
  ref_object_id uuid,
  ref_version text
)
language sql
stable
set search_path = public, pg_temp
as $$
  with recursive walk(value) as (
    select coalesce(p_json, '{}'::jsonb)
    union all
    select child.value
    from walk
    cross join lateral (
      select object_values.value
      from jsonb_each(
        case
          when jsonb_typeof(walk.value) = 'object' then walk.value
          else '{}'::jsonb
        end
      ) as object_values(key, value)
      union all
      select array_values.value
      from jsonb_array_elements(
        case
          when jsonb_typeof(walk.value) = 'array' then walk.value
          else '[]'::jsonb
        end
      ) as array_values(value)
    ) as child
  )
  select distinct
    lower(trim(value->>'@type')) as ref_type,
    (value->>'@refObjectId')::uuid as ref_object_id,
    value->>'@version' as ref_version
  from walk
  where jsonb_typeof(value) = 'object'
    and value ? '@refObjectId'
    and value ? '@version'
    and value ? '@type'
    and (value->>'@refObjectId') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and nullif(value->>'@version', '') is not null
    and public.cmd_review_ref_type_to_table(value->>'@type') is not null
$$;

create or replace function public.cmd_review_get_dataset_row(
  p_table text,
  p_id uuid,
  p_version text,
  p_lock boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
begin
  if p_table not in (
    'contacts',
    'sources',
    'unitgroups',
    'flowproperties',
    'flows',
    'processes',
    'lifecyclemodels'
  ) then
    return null;
  end if;

  execute format(
    'select to_jsonb(t) from public.%I as t where t.id = $1 and t.version = $2 %s',
    p_table,
    case when p_lock then 'for update of t' else '' end
  )
    into v_row
    using p_id, p_version;

  return v_row;
end;
$$;

create or replace function public.cmd_review_get_dataset_name(
  p_table text,
  p_row jsonb
) returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_table
    when 'contacts' then coalesce(
      p_row#>'{json,contactDataSet,contactInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,contactDataSet,contactInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    when 'sources' then coalesce(
      p_row#>'{json,sourceDataSet,sourceInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,sourceDataSet,sourceInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    when 'unitgroups' then coalesce(
      p_row#>'{json,unitGroupDataSet,unitGroupInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,unitGroupDataSet,unitGroupInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    when 'flowproperties' then coalesce(
      p_row#>'{json,flowPropertyDataSet,flowPropertiesInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,flowPropertyDataSet,flowPropertiesInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    when 'flows' then coalesce(
      p_row#>'{json,flowDataSet,flowInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,flowDataSet,flowInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    when 'processes' then coalesce(
      p_row#>'{json,processDataSet,processInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,processDataSet,processInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    when 'lifecyclemodels' then coalesce(
      p_row#>'{json,lifeCycleModelDataSet,lifeCycleModelInformation,dataSetInformation,name}',
      p_row#>'{json_ordered,lifeCycleModelDataSet,lifeCycleModelInformation,dataSetInformation,name}',
      '{}'::jsonb
    )
    else '{}'::jsonb
  end
$$;

create or replace function public.cmd_review_append_review_ref(
  p_existing_reviews jsonb,
  p_review_id uuid
) returns jsonb
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  v_reviews jsonb := case
    when jsonb_typeof(p_existing_reviews) = 'array' then p_existing_reviews
    else '[]'::jsonb
  end;
begin
  if exists (
    select 1
    from jsonb_array_elements(v_reviews) as review_item(value)
    where review_item.value->>'id' = p_review_id::text
  ) then
    return v_reviews;
  end if;

  return v_reviews || jsonb_build_array(
    jsonb_build_object(
      'key', jsonb_array_length(v_reviews),
      'id', p_review_id
    )
  );
end;
$$;

create or replace function public.cmd_review_submit(
  p_table text,
  p_id uuid,
  p_version text,
  p_audit jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_current record;
  v_current_row jsonb;
  v_current_state_code integer;
  v_conflicting_version text;
  v_conflicting_state integer;
  v_root_row jsonb;
  v_root_owner_id uuid;
  v_review_id uuid := gen_random_uuid();
  v_review_record public.reviews%rowtype;
  v_review_json jsonb;
  v_review_row jsonb;
  v_team_name jsonb;
  v_user_meta jsonb;
  v_ref record;
  v_ref_table text;
  v_submodel jsonb;
  v_paired_process_exists boolean;
  v_paired_model_exists boolean;
  v_affected_datasets jsonb := '[]'::jsonb;
  v_updated_reviews jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_table not in (
    'processes',
    'lifecyclemodels'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_DATASET_TABLE',
      'status', 400,
      'message', 'Unsupported dataset table for review submission'
    );
  end if;

  create temporary table if not exists cmd_review_submit_queue (
    table_name text not null,
    dataset_id uuid not null,
    dataset_version text not null,
    is_root boolean not null default false,
    primary key (table_name, dataset_id, dataset_version)
  ) on commit drop;

  create temporary table if not exists cmd_review_submit_targets (
    table_name text not null,
    dataset_id uuid not null,
    dataset_version text not null,
    state_code integer not null,
    reviews jsonb,
    primary key (table_name, dataset_id, dataset_version)
  ) on commit drop;

  truncate table cmd_review_submit_queue;
  truncate table cmd_review_submit_targets;

  insert into cmd_review_submit_queue (
    table_name,
    dataset_id,
    dataset_version,
    is_root
  )
  values (
    p_table,
    p_id,
    p_version,
    true
  )
  on conflict do nothing;

  while exists (select 1 from cmd_review_submit_queue) loop
    select
      table_name,
      dataset_id,
      dataset_version,
      is_root
    into v_current
    from cmd_review_submit_queue
    order by is_root desc, table_name, dataset_id, dataset_version
    limit 1;

    delete from cmd_review_submit_queue
    where table_name = v_current.table_name
      and dataset_id = v_current.dataset_id
      and dataset_version = v_current.dataset_version;

    if exists (
      select 1
      from cmd_review_submit_targets
      where table_name = v_current.table_name
        and dataset_id = v_current.dataset_id
        and dataset_version = v_current.dataset_version
    ) then
      continue;
    end if;

    v_current_row := public.cmd_review_get_dataset_row(
      v_current.table_name,
      v_current.dataset_id,
      v_current.dataset_version,
      true
    );

    if v_current_row is null then
      if v_current.is_root then
        return jsonb_build_object(
          'ok', false,
          'code', 'DATASET_NOT_FOUND',
          'status', 404,
          'message', 'Dataset not found'
        );
      end if;

      return jsonb_build_object(
        'ok', false,
        'code', 'REFERENCED_DATASET_NOT_FOUND',
        'status', 409,
        'message', 'Referenced dataset not found',
        'details', jsonb_build_object(
          'table', v_current.table_name,
          'id', v_current.dataset_id,
          'version', v_current.dataset_version
        )
      );
    end if;

    v_current_state_code := coalesce((v_current_row->>'state_code')::integer, 0);

    if v_current.is_root then
      v_root_row := v_current_row;
      v_root_owner_id := nullif(v_current_row->>'user_id', '')::uuid;

      if v_root_owner_id is distinct from v_actor then
        return jsonb_build_object(
          'ok', false,
          'code', 'DATASET_OWNER_REQUIRED',
          'status', 403,
          'message', 'Only the dataset owner can submit review'
        );
      end if;

      if v_current_state_code >= 100 then
        return jsonb_build_object(
          'ok', false,
          'code', 'DATA_ALREADY_PUBLISHED',
          'status', 403,
          'message', 'Published data cannot be submitted for review',
          'details', jsonb_build_object(
            'state_code', v_current_state_code
          )
        );
      end if;

      if v_current_state_code >= 20 then
        return jsonb_build_object(
          'ok', false,
          'code', 'DATA_UNDER_REVIEW',
          'status', 403,
          'message', 'Data is already under review',
          'details', jsonb_build_object(
            'state_code', 20,
            'review_state_code', v_current_state_code
          )
        );
      end if;
    else
      if v_current_state_code >= 20 and v_current_state_code < 100 then
        return jsonb_build_object(
          'ok', false,
          'code', 'REFERENCED_DATA_UNDER_REVIEW',
          'status', 409,
          'message', 'Referenced data is already under review',
          'details', jsonb_build_object(
            'table', v_current.table_name,
            'id', v_current.dataset_id,
            'version', v_current.dataset_version,
            'state_code', 20,
            'review_state_code', v_current_state_code
          )
        );
      end if;

      if v_current_state_code >= 100 then
        if v_current.table_name = 'processes' then
          v_paired_model_exists := public.cmd_review_get_dataset_row(
            'lifecyclemodels',
            v_current.dataset_id,
            v_current.dataset_version,
            false
          ) is not null;

          if v_paired_model_exists then
            insert into cmd_review_submit_queue (
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
    end if;

    execute format(
      'select version, state_code
         from public.%I
        where id = $1
          and version <> $2
          and state_code >= 20
          and state_code < 100
        order by version desc
        limit 1',
      v_current.table_name
    )
      into v_conflicting_version, v_conflicting_state
      using v_current.dataset_id, v_current.dataset_version;

    if v_conflicting_version is not null then
      return jsonb_build_object(
        'ok', false,
        'code', case
          when v_current.is_root then 'DATASET_VERSION_UNDER_REVIEW'
          else 'REFERENCED_VERSION_UNDER_REVIEW'
        end,
        'status', case
          when v_current.is_root then 403
          else 409
        end,
        'message', case
          when v_current.is_root then 'Another version of this dataset is already under review'
          else 'Another version of a referenced dataset is already under review'
        end,
        'details', jsonb_build_object(
          'table', v_current.table_name,
          'id', v_current.dataset_id,
          'version', v_current.dataset_version,
          'under_review_version', v_conflicting_version,
          'state_code', 20,
          'review_state_code', v_conflicting_state
        )
      );
    end if;

    execute format(
      'select version
         from public.%I
        where id = $1
          and version > $2
          and state_code = 100
        order by version desc
        limit 1',
      v_current.table_name
    )
      into v_conflicting_version
      using v_current.dataset_id, v_current.dataset_version;

    if v_conflicting_version is not null then
      return jsonb_build_object(
        'ok', false,
        'code', case
          when v_current.is_root then 'DATASET_VERSION_ALREADY_PUBLISHED'
          else 'REFERENCED_VERSION_ALREADY_PUBLISHED'
        end,
        'status', case
          when v_current.is_root then 403
          else 409
        end,
        'message', case
          when v_current.is_root then 'A newer published version of this dataset already exists'
          else 'A newer published version of a referenced dataset already exists'
        end,
        'details', jsonb_build_object(
          'table', v_current.table_name,
          'id', v_current.dataset_id,
          'version', v_current.dataset_version,
          'published_version', v_conflicting_version,
          'state_code', 100
        )
      );
    end if;

    insert into cmd_review_submit_targets (
      table_name,
      dataset_id,
      dataset_version,
      state_code,
      reviews
    )
    values (
      v_current.table_name,
      v_current.dataset_id,
      v_current.dataset_version,
      v_current_state_code,
      v_current_row->'reviews'
    )
    on conflict do nothing;

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

      insert into cmd_review_submit_queue (
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
        insert into cmd_review_submit_queue (
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
          insert into cmd_review_submit_queue (
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
        if coalesce(v_submodel->>'type', '') <> 'secondary' then
          continue;
        end if;

        if not ((v_submodel->>'id') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$') then
          continue;
        end if;

        insert into cmd_review_submit_queue (
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

  select coalesce(t.json->'title', t.json->'name')
    into v_team_name
  from public.teams as t
  where t.id = nullif(v_root_row->>'team_id', '')::uuid;

  select u.raw_user_meta_data
    into v_user_meta
  from public.users as u
  where u.id = v_actor;

  v_review_json := jsonb_build_object(
    'data', jsonb_build_object(
      'id', p_id,
      'version', p_version,
      'name', public.cmd_review_get_dataset_name(p_table, v_root_row)
    ),
    'team', jsonb_build_object(
      'id', nullif(v_root_row->>'team_id', ''),
      'name', v_team_name
    ),
    'user', jsonb_build_object(
      'id', v_actor,
      'name', coalesce(nullif(v_user_meta->>'display_name', ''), nullif(v_user_meta->>'email', '')),
      'email', nullif(v_user_meta->>'email', '')
    ),
    'comment', jsonb_build_object(
      'message', ''
    ),
    'logs', jsonb_build_array(
      jsonb_build_object(
        'action', 'submit_review',
        'time', to_jsonb(now()),
        'user', jsonb_build_object(
          'id', v_actor,
          'display_name', coalesce(nullif(v_user_meta->>'display_name', ''), nullif(v_user_meta->>'email', ''))
        )
      )
    )
  );

  insert into public.reviews (
    id,
    data_id,
    data_version,
    state_code,
    reviewer_id,
    json
  )
  values (
    v_review_id,
    p_id,
    p_version,
    0,
    '[]'::jsonb,
    v_review_json
  )
  returning *
    into v_review_record;

  for v_current in
    select
      table_name,
      dataset_id,
      dataset_version,
      reviews
    from cmd_review_submit_targets
    order by table_name, dataset_id, dataset_version
  loop
    v_updated_reviews := public.cmd_review_append_review_ref(v_current.reviews, v_review_id);

    execute format(
      'update public.%I
          set state_code = 20,
              reviews = $1
        where id = $2
          and version = $3',
      v_current.table_name
    )
      using v_updated_reviews, v_current.dataset_id, v_current.dataset_version;
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
  from cmd_review_submit_targets;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    target_version,
    payload
  )
  values (
    'cmd_review_submit',
    v_actor,
    p_table,
    p_id,
    p_version,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'review_id', v_review_id,
      'affected_datasets', v_affected_datasets
    )
  );

  v_review_row := to_jsonb(v_review_record);

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'review', v_review_row,
      'affected_datasets', v_affected_datasets
    )
  );
end;
$$;

revoke all on function public.cmd_review_ref_type_to_table(text) from public;
revoke all on function public.cmd_review_extract_refs(jsonb) from public;
revoke all on function public.cmd_review_get_dataset_row(text, uuid, text, boolean) from public;
revoke all on function public.cmd_review_get_dataset_name(text, jsonb) from public;
revoke all on function public.cmd_review_append_review_ref(jsonb, uuid) from public;
revoke all on function public.cmd_review_submit(text, uuid, text, jsonb) from public;

grant execute on function public.cmd_review_submit(text, uuid, text, jsonb) to authenticated;
grant execute on function public.cmd_review_submit(text, uuid, text, jsonb) to service_role;
