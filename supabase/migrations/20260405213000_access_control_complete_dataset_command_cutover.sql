drop function if exists public.cmd_dataset_save_draft(text, uuid, text, jsonb, uuid, jsonb);

create or replace function public.cmd_dataset_save_draft(
  p_table text,
  p_id uuid,
  p_version text,
  p_json_ordered jsonb,
  p_model_id uuid default null,
  p_rule_verification boolean default null,
  p_audit jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_current_row jsonb;
  v_owner_id uuid;
  v_state_code integer;
  v_updated_row jsonb;
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
    'contacts',
    'sources',
    'unitgroups',
    'flowproperties',
    'flows',
    'processes',
    'lifecyclemodels'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_DATASET_TABLE',
      'status', 400,
      'message', 'Unsupported dataset table'
    );
  end if;

  if p_json_ordered is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'JSON_ORDERED_REQUIRED',
      'status', 400,
      'message', 'jsonOrdered is required'
    );
  end if;

  if p_table <> 'processes' and p_model_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'MODEL_ID_NOT_ALLOWED',
      'status', 400,
      'message', 'modelId is only allowed for process dataset drafts'
    );
  end if;

  execute format(
    'select to_jsonb(t) from public.%I as t where t.id = $1 and t.version = $2 for update of t',
    p_table
  )
    into v_current_row
    using p_id, p_version;

  if v_current_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_NOT_FOUND',
      'status', 404,
      'message', 'Dataset not found'
    );
  end if;

  v_owner_id := nullif(v_current_row->>'user_id', '')::uuid;
  v_state_code := coalesce((v_current_row->>'state_code')::integer, 0);

  if v_owner_id is distinct from v_actor then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_OWNER_REQUIRED',
      'status', 403,
      'message', 'Only the dataset owner can save draft changes'
    );
  end if;

  if v_state_code >= 100 then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATA_ALREADY_PUBLISHED',
      'status', 403,
      'message', 'Published data cannot be edited through draft save',
      'details', jsonb_build_object(
        'state_code', v_state_code
      )
    );
  end if;

  if v_state_code >= 20 then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATA_UNDER_REVIEW',
      'status', 403,
      'message', 'Data is under review and cannot be modified',
      'details', jsonb_build_object(
        'state_code', 20,
        'review_state_code', v_state_code
      )
    );
  end if;

  if p_table = 'processes' then
    execute format(
      'update public.%I as t
          set json_ordered = $1::json,
              model_id = coalesce($2, t.model_id),
              rule_verification = $3,
              modified_at = now()
        where t.id = $4
          and t.version = $5
      returning to_jsonb(t)',
      p_table
    )
      into v_updated_row
      using p_json_ordered, p_model_id, p_rule_verification, p_id, p_version;
  else
    execute format(
      'update public.%I as t
          set json_ordered = $1::json,
              rule_verification = $2,
              modified_at = now()
        where t.id = $3
          and t.version = $4
      returning to_jsonb(t)',
      p_table
    )
      into v_updated_row
      using p_json_ordered, p_rule_verification, p_id, p_version;
  end if;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    target_version,
    payload
  )
  values (
    'cmd_dataset_save_draft',
    v_actor,
    p_table,
    p_id,
    p_version,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_updated_row
  );
end;
$$;

create or replace function public.cmd_dataset_create(
  p_table text,
  p_id uuid,
  p_json_ordered jsonb,
  p_model_id uuid default null,
  p_rule_verification boolean default null,
  p_audit jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_created_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_table = 'lifecyclemodels' then
    return jsonb_build_object(
      'ok', false,
      'code', 'LIFECYCLEMODEL_BUNDLE_REQUIRED',
      'status', 400,
      'message', 'Lifecycle models must use bundle create and delete commands'
    );
  end if;

  if p_table not in (
    'contacts',
    'sources',
    'unitgroups',
    'flowproperties',
    'flows',
    'processes'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_DATASET_TABLE',
      'status', 400,
      'message', 'Unsupported dataset table'
    );
  end if;

  if p_json_ordered is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'JSON_ORDERED_REQUIRED',
      'status', 400,
      'message', 'jsonOrdered is required'
    );
  end if;

  if p_table <> 'processes' and p_model_id is not null then
    return jsonb_build_object(
      'ok', false,
      'code', 'MODEL_ID_NOT_ALLOWED',
      'status', 400,
      'message', 'modelId is only allowed for process dataset creation'
    );
  end if;

  begin
    if p_table = 'processes' then
      execute format(
        'insert into public.%I as t (id, json_ordered, model_id, rule_verification)
         values ($1, $2::json, $3, $4)
         returning to_jsonb(t)',
        p_table
      )
        into v_created_row
        using p_id, p_json_ordered, p_model_id, p_rule_verification;
    else
      execute format(
        'insert into public.%I as t (id, json_ordered, rule_verification)
         values ($1, $2::json, $3)
         returning to_jsonb(t)',
        p_table
      )
        into v_created_row
        using p_id, p_json_ordered, p_rule_verification;
    end if;
  exception
    when unique_violation then
      return jsonb_build_object(
        'ok', false,
        'code', '23505',
        'status', 409,
        'message', 'Dataset with the same id and version already exists'
      );
    when not_null_violation then
      return jsonb_build_object(
        'ok', false,
        'code', '23502',
        'status', 400,
        'message', 'Dataset creation requires a valid id, version, and jsonOrdered payload'
      );
    when check_violation then
      return jsonb_build_object(
        'ok', false,
        'code', sqlstate,
        'status', 400,
        'message', sqlerrm
      );
  end;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    target_version,
    payload
  )
  values (
    'cmd_dataset_create',
    v_actor,
    p_table,
    p_id,
    nullif(v_created_row->>'version', ''),
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_created_row
  );
end;
$$;

create or replace function public.cmd_dataset_delete(
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
  v_current_row jsonb;
  v_deleted_row jsonb;
  v_owner_id uuid;
  v_state_code integer;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_table = 'lifecyclemodels' then
    return jsonb_build_object(
      'ok', false,
      'code', 'LIFECYCLEMODEL_BUNDLE_REQUIRED',
      'status', 400,
      'message', 'Lifecycle models must use bundle create and delete commands'
    );
  end if;

  if p_table not in (
    'contacts',
    'sources',
    'unitgroups',
    'flowproperties',
    'flows',
    'processes'
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_DATASET_TABLE',
      'status', 400,
      'message', 'Unsupported dataset table'
    );
  end if;

  execute format(
    'select to_jsonb(t) from public.%I as t where t.id = $1 and t.version = $2 for update of t',
    p_table
  )
    into v_current_row
    using p_id, p_version;

  if v_current_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_NOT_FOUND',
      'status', 404,
      'message', 'Dataset not found'
    );
  end if;

  v_owner_id := nullif(v_current_row->>'user_id', '')::uuid;
  v_state_code := coalesce((v_current_row->>'state_code')::integer, 0);

  if v_owner_id is distinct from v_actor then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_OWNER_REQUIRED',
      'status', 403,
      'message', 'Only the dataset owner can delete this dataset'
    );
  end if;

  if v_state_code <> 0 then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_DELETE_REQUIRES_DRAFT',
      'status', 403,
      'message', 'Only draft datasets can be deleted',
      'details', jsonb_build_object(
        'state_code', v_state_code
      )
    );
  end if;

  execute format(
    'delete from public.%I as t
      where t.id = $1
        and t.version = $2
      returning to_jsonb(t)',
    p_table
  )
    into v_deleted_row
    using p_id, p_version;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    target_version,
    payload
  )
  values (
    'cmd_dataset_delete',
    v_actor,
    p_table,
    p_id,
    p_version,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_deleted_row
  );
end;
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
      and team_id = '00000000-0000-0000-0000-000000000000'::uuid
      and role = 'review-admin'
  )
$$;

revoke insert, update, delete on table public.contacts from anon, authenticated;
revoke insert, update, delete on table public.sources from anon, authenticated;
revoke insert, update, delete on table public.unitgroups from anon, authenticated;
revoke insert, update, delete on table public.flowproperties from anon, authenticated;
revoke insert, update, delete on table public.flows from anon, authenticated;
revoke insert, update, delete on table public.processes from anon, authenticated;
revoke insert, update, delete on table public.lifecyclemodels from anon, authenticated;

revoke all on function public.cmd_dataset_save_draft(text, uuid, text, jsonb, uuid, boolean, jsonb) from public;
revoke all on function public.cmd_dataset_create(text, uuid, jsonb, uuid, boolean, jsonb) from public;
revoke all on function public.cmd_dataset_delete(text, uuid, text, jsonb) from public;

grant execute on function public.cmd_dataset_save_draft(text, uuid, text, jsonb, uuid, boolean, jsonb) to authenticated;
grant execute on function public.cmd_dataset_create(text, uuid, jsonb, uuid, boolean, jsonb) to authenticated;
grant execute on function public.cmd_dataset_delete(text, uuid, text, jsonb) to authenticated;

grant execute on function public.cmd_dataset_save_draft(text, uuid, text, jsonb, uuid, boolean, jsonb) to service_role;
grant execute on function public.cmd_dataset_create(text, uuid, jsonb, uuid, boolean, jsonb) to service_role;
grant execute on function public.cmd_dataset_delete(text, uuid, text, jsonb) to service_role;
