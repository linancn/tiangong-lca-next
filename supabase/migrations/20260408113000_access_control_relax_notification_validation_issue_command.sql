drop function if exists public.cmd_notification_send_validation_issue(
  uuid,
  text,
  uuid,
  text,
  text,
  uuid,
  text,
  text,
  text[],
  text[],
  integer,
  jsonb
);

drop function if exists public.cmd_notification_send_validation_issue(
  uuid,
  text,
  uuid,
  text,
  text,
  text[],
  text[],
  integer,
  jsonb
);

create or replace function public.cmd_notification_send_validation_issue(
  p_recipient_user_id uuid,
  p_dataset_type text,
  p_dataset_id uuid,
  p_dataset_version text,
  p_link text default null,
  p_issue_codes text[] default array[]::text[],
  p_tab_names text[] default array[]::text[],
  p_issue_count integer default 0,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_dataset_type text := nullif(btrim(coalesce(p_dataset_type, '')), '');
  v_dataset_version text := nullif(btrim(coalesce(p_dataset_version, '')), '');
  v_target_table text;
  v_target_row jsonb;
  v_issue_codes text[];
  v_tab_names text[];
  v_sender_name text;
  v_notification_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_recipient_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'RECIPIENT_REQUIRED',
      'status', 400,
      'message', 'recipientUserId is required'
    );
  end if;

  if v_actor = p_recipient_user_id then
    return jsonb_build_object(
      'ok', false,
      'code', 'NOTIFICATION_SELF_TARGET',
      'status', 409,
      'message', 'The recipient must differ from the actor'
    );
  end if;

  if v_dataset_type is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_TYPE_REQUIRED',
      'status', 400,
      'message', 'datasetType is required'
    );
  end if;

  if p_dataset_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_ID_REQUIRED',
      'status', 400,
      'message', 'datasetId is required'
    );
  end if;

  if v_dataset_version is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_VERSION_REQUIRED',
      'status', 400,
      'message', 'datasetVersion is required'
    );
  end if;

  if not exists (
    select 1
    from public.users
    where id = p_recipient_user_id
  ) then
    return jsonb_build_object(
      'ok', false,
      'code', 'RECIPIENT_NOT_FOUND',
      'status', 404,
      'message', 'The recipient user does not exist'
    );
  end if;

  v_target_table := public.cmd_review_ref_type_to_table(v_dataset_type);
  if v_target_table is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_TYPE_INVALID',
      'status', 400,
      'message', 'datasetType is not supported'
    );
  end if;

  v_target_row := public.cmd_review_get_dataset_row(
    v_target_table,
    p_dataset_id,
    v_dataset_version,
    false
  );
  if v_target_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'DATASET_NOT_FOUND',
      'status', 404,
      'message', 'The target dataset does not exist'
    );
  end if;

  if ((v_target_row ->> 'user_id')::uuid is distinct from p_recipient_user_id) then
    return jsonb_build_object(
      'ok', false,
      'code', 'RECIPIENT_NOT_TARGET_OWNER',
      'status', 403,
      'message', 'The recipient must own the target dataset'
    );
  end if;

  v_issue_codes := public.cmd_notification_normalize_text_array(p_issue_codes);
  v_tab_names := public.cmd_notification_normalize_text_array(p_tab_names);

  select coalesce(
    nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(u.raw_user_meta_data ->> 'email'), ''),
    '-'
  )
  into v_sender_name
  from public.users as u
  where u.id = v_actor;

  v_sender_name := coalesce(v_sender_name, '-');

  insert into public.notifications (
    recipient_user_id,
    sender_user_id,
    type,
    dataset_type,
    dataset_id,
    dataset_version,
    json,
    modified_at
  )
  values (
    p_recipient_user_id,
    v_actor,
    'validation_issue',
    v_dataset_type,
    p_dataset_id,
    v_dataset_version,
    jsonb_build_object(
      'issueCodes', to_jsonb(v_issue_codes),
      'issueCount', greatest(coalesce(p_issue_count, 0), 0),
      'link', nullif(btrim(coalesce(p_link, '')), ''),
      'senderName', v_sender_name,
      'tabNames', to_jsonb(v_tab_names)
    ),
    now()
  )
  on conflict (
    recipient_user_id,
    sender_user_id,
    type,
    dataset_type,
    dataset_id,
    dataset_version
  ) do update
  set json = excluded.json,
      modified_at = excluded.modified_at
  returning to_jsonb(notifications.*)
    into v_notification_row;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_notification_send_validation_issue',
    v_actor,
    'notifications',
    (v_notification_row ->> 'id')::uuid,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'recipientUserId', p_recipient_user_id,
      'datasetType', v_dataset_type,
      'datasetId', p_dataset_id,
      'datasetVersion', v_dataset_version,
      'issueCount', greatest(coalesce(p_issue_count, 0), 0)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_notification_row
  );
end;
$$;

revoke all on function public.cmd_notification_send_validation_issue(
  uuid,
  text,
  uuid,
  text,
  text,
  text[],
  text[],
  integer,
  jsonb
) from public;

grant execute on function public.cmd_notification_send_validation_issue(
  uuid,
  text,
  uuid,
  text,
  text,
  text[],
  text[],
  integer,
  jsonb
) to authenticated;

grant execute on function public.cmd_notification_send_validation_issue(
  uuid,
  text,
  uuid,
  text,
  text,
  text[],
  text[],
  integer,
  jsonb
) to service_role;
