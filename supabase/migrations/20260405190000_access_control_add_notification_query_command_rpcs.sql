create or replace function public.cmd_notification_normalize_text_array(
  p_values text[]
)
returns text[]
language sql
immutable
set search_path = public, pg_temp
as $$
  with normalized as (
    select
      min(item.ordinality) as first_ordinality,
      nullif(btrim(item.value), '') as normalized_value
    from unnest(coalesce(p_values, array[]::text[])) with ordinality as item(value, ordinality)
    group by nullif(btrim(item.value), '')
  )
  select coalesce(
    array(
      select normalized_value
      from normalized
      where normalized_value is not null
      order by first_ordinality
    ),
    array[]::text[]
  );
$$;

create or replace function public.qry_notification_get_my_team_items(
  p_days integer default 3
)
returns table (
  team_id uuid,
  user_id uuid,
  role text,
  team_title jsonb,
  modified_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.team_id,
    r.user_id,
    r.role,
    coalesce(t.json -> 'title', '[]'::jsonb) as team_title,
    r.modified_at
  from public.roles as r
  join public.teams as t
    on t.id = r.team_id
  where r.user_id = auth.uid()
    and r.team_id <> '00000000-0000-0000-0000-000000000000'::uuid
    and (
      coalesce(p_days, 3) <= 0 or
      r.modified_at >= now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
    )
  order by r.modified_at desc;
$$;

create or replace function public.qry_notification_get_my_team_count(
  p_days integer default 3,
  p_last_view_at timestamptz default null
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.roles as r
  where r.user_id = auth.uid()
    and r.role = 'is_invited'
    and r.team_id <> '00000000-0000-0000-0000-000000000000'::uuid
    and (
      (p_last_view_at is not null and r.modified_at > p_last_view_at) or
      (p_last_view_at is null and (
        coalesce(p_days, 3) <= 0 or
        r.modified_at >= now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
      ))
    );
$$;

create or replace function public.qry_notification_get_my_data_items(
  p_page integer default 1,
  p_page_size integer default 10,
  p_days integer default 3
)
returns table (
  id uuid,
  state_code integer,
  "json" jsonb,
  modified_at timestamptz,
  total_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    r.id,
    r.state_code,
    coalesce(r.json, '{}'::jsonb) as json,
    r.modified_at,
    count(*) over ()::integer as total_count
  from public.reviews as r
  where coalesce(r.json -> 'user' ->> 'id', '') = auth.uid()::text
    and r.state_code in (1, -1, 2)
    and (
      coalesce(p_days, 3) <= 0 or
      r.modified_at >= now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
    )
  order by r.modified_at desc
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 10), 1)
  limit greatest(coalesce(p_page_size, 10), 1);
$$;

create or replace function public.qry_notification_get_my_data_count(
  p_days integer default 3,
  p_last_view_at timestamptz default null
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.reviews as r
  where coalesce(r.json -> 'user' ->> 'id', '') = auth.uid()::text
    and r.state_code in (1, -1, 2)
    and (
      (p_last_view_at is not null and r.modified_at > p_last_view_at) or
      (p_last_view_at is null and (
        coalesce(p_days, 3) <= 0 or
        r.modified_at >= now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
      ))
    );
$$;

create or replace function public.qry_notification_get_my_issue_items(
  p_page integer default 1,
  p_page_size integer default 10,
  p_days integer default 3
)
returns table (
  id uuid,
  type text,
  dataset_type text,
  dataset_id uuid,
  dataset_version text,
  "json" jsonb,
  modified_at timestamptz,
  total_count integer
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    n.id,
    n.type,
    n.dataset_type,
    n.dataset_id,
    n.dataset_version,
    n.json,
    n.modified_at,
    count(*) over ()::integer as total_count
  from public.notifications as n
  where n.recipient_user_id = auth.uid()
    and n.type = 'validation_issue'
    and (
      coalesce(p_days, 3) <= 0 or
      n.modified_at >= now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
    )
  order by n.modified_at desc
  offset greatest(coalesce(p_page, 1) - 1, 0) * greatest(coalesce(p_page_size, 10), 1)
  limit greatest(coalesce(p_page_size, 10), 1);
$$;

create or replace function public.qry_notification_get_my_issue_count(
  p_days integer default 3,
  p_last_view_at timestamptz default null
)
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(*)::integer
  from public.notifications as n
  where n.recipient_user_id = auth.uid()
    and n.type = 'validation_issue'
    and (
      (p_last_view_at is not null and n.modified_at > p_last_view_at) or
      (p_last_view_at is null and (
        coalesce(p_days, 3) <= 0 or
        n.modified_at >= now() - make_interval(days => greatest(coalesce(p_days, 3), 0))
      ))
    );
$$;

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

  if nullif(btrim(coalesce(p_dataset_type, '')), '') is null then
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

  if nullif(btrim(coalesce(p_dataset_version, '')), '') is null then
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
    btrim(p_dataset_type),
    p_dataset_id,
    btrim(p_dataset_version),
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
      'datasetType', btrim(p_dataset_type),
      'datasetId', p_dataset_id,
      'datasetVersion', btrim(p_dataset_version),
      'issueCount', greatest(coalesce(p_issue_count, 0), 0)
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_notification_row
  );
end;
$$;

revoke all on function public.cmd_notification_normalize_text_array(text[]) from public;
revoke all on function public.qry_notification_get_my_team_items(integer) from public;
revoke all on function public.qry_notification_get_my_team_count(integer, timestamptz) from public;
revoke all on function public.qry_notification_get_my_data_items(integer, integer, integer) from public;
revoke all on function public.qry_notification_get_my_data_count(integer, timestamptz) from public;
revoke all on function public.qry_notification_get_my_issue_items(integer, integer, integer) from public;
revoke all on function public.qry_notification_get_my_issue_count(integer, timestamptz) from public;
revoke all on function public.cmd_notification_send_validation_issue(uuid, text, uuid, text, text, text[], text[], integer, jsonb) from public;

grant execute on function public.cmd_notification_normalize_text_array(text[]) to authenticated;
grant execute on function public.cmd_notification_normalize_text_array(text[]) to service_role;
grant execute on function public.qry_notification_get_my_team_items(integer) to authenticated;
grant execute on function public.qry_notification_get_my_team_items(integer) to service_role;
grant execute on function public.qry_notification_get_my_team_count(integer, timestamptz) to authenticated;
grant execute on function public.qry_notification_get_my_team_count(integer, timestamptz) to service_role;
grant execute on function public.qry_notification_get_my_data_items(integer, integer, integer) to authenticated;
grant execute on function public.qry_notification_get_my_data_items(integer, integer, integer) to service_role;
grant execute on function public.qry_notification_get_my_data_count(integer, timestamptz) to authenticated;
grant execute on function public.qry_notification_get_my_data_count(integer, timestamptz) to service_role;
grant execute on function public.qry_notification_get_my_issue_items(integer, integer, integer) to authenticated;
grant execute on function public.qry_notification_get_my_issue_items(integer, integer, integer) to service_role;
grant execute on function public.qry_notification_get_my_issue_count(integer, timestamptz) to authenticated;
grant execute on function public.qry_notification_get_my_issue_count(integer, timestamptz) to service_role;
grant execute on function public.cmd_notification_send_validation_issue(uuid, text, uuid, text, text, text[], text[], integer, jsonb) to authenticated;
grant execute on function public.cmd_notification_send_validation_issue(uuid, text, uuid, text, text, text[], text[], integer, jsonb) to service_role;

revoke insert, update, delete on table public.notifications from anon, authenticated;
