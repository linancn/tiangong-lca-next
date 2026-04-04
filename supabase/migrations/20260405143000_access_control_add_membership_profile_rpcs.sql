create or replace function public.cmd_membership_is_team_owner(
  p_actor uuid,
  p_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.roles
    where user_id = p_actor
      and team_id = p_team_id
      and role = 'owner'
  )
$$;

create or replace function public.cmd_membership_is_team_manager(
  p_actor uuid,
  p_team_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.roles
    where user_id = p_actor
      and team_id = p_team_id
      and role in ('owner', 'admin')
  )
$$;

create or replace function public.cmd_membership_is_system_owner(
  p_actor uuid default auth.uid()
)
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
      and role = 'owner'
  )
$$;

create or replace function public.cmd_membership_is_system_manager(
  p_actor uuid default auth.uid()
)
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
      and role in ('owner', 'admin', 'member')
  )
$$;

create or replace function public.cmd_membership_is_review_admin(
  p_actor uuid default auth.uid()
)
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

create or replace function public.cmd_membership_resolve_sort_direction(
  p_sort_order text
)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  case lower(coalesce(p_sort_order, ''))
    when 'asc' then
      return 'asc';
    when 'ascend' then
      return 'asc';
    else
      return 'desc';
  end case;
end;
$$;

create or replace function public.cmd_membership_resolve_member_order_by(
  p_sort_by text,
  p_allow_workload boolean default false
)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  case lower(coalesce(p_sort_by, ''))
    when 'role' then
      return 'm.role';
    when 'email' then
      return 'm.email';
    when 'display_name' then
      return 'm.display_name';
    when 'modified_at' then
      return 'm.modified_at';
    when 'pendingcount' then
      if p_allow_workload then
        return 'm.pending_count';
      end if;
    when 'pending_count' then
      if p_allow_workload then
        return 'm.pending_count';
      end if;
    when 'reviewedcount' then
      if p_allow_workload then
        return 'm.reviewed_count';
      end if;
    when 'reviewed_count' then
      if p_allow_workload then
        return 'm.reviewed_count';
      end if;
    else
      return 'm.created_at';
  end case;

  return 'm.created_at';
end;
$$;

create or replace function public.cmd_team_create(
  p_team_id uuid,
  p_json jsonb,
  p_rank integer,
  p_is_public boolean,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_team_row jsonb;
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_team_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_ID_REQUIRED',
      'status', 400,
      'message', 'teamId is required'
    );
  end if;

  if p_json is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_JSON_REQUIRED',
      'status', 400,
      'message', 'json is required'
    );
  end if;

  if public.policy_user_has_team(v_actor) then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_ALREADY_ASSIGNED',
      'status', 409,
      'message', 'The actor already belongs to a team'
    );
  end if;

  if not public.policy_roles_insert(v_actor, p_team_id, 'owner') then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'The actor is not allowed to create this team'
    );
  end if;

  delete from public.roles
  where user_id = v_actor
    and role = 'rejected'
    and team_id <> '00000000-0000-0000-0000-000000000000'::uuid;

  insert into public.teams (
    id,
    json,
    rank,
    is_public,
    modified_at
  )
  values (
    p_team_id,
    p_json,
    coalesce(p_rank, -1),
    coalesce(p_is_public, false),
    now()
  )
  returning to_jsonb(teams.*)
    into v_team_row;

  insert into public.roles (
    user_id,
    team_id,
    role,
    modified_at
  )
  values (
    v_actor,
    p_team_id,
    'owner',
    now()
  )
  returning to_jsonb(roles.*)
    into v_role_row;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_team_create',
    v_actor,
    'teams',
    p_team_id,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', jsonb_build_object(
      'team', v_team_row,
      'owner_role', v_role_row
    )
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_ALREADY_EXISTS',
      'status', 409,
      'message', 'The team already exists'
    );
end;
$$;

create or replace function public.cmd_team_update_profile(
  p_team_id uuid,
  p_json jsonb,
  p_is_public boolean,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_team_row jsonb;
  v_can_manage boolean;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_team_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_ID_REQUIRED',
      'status', 400,
      'message', 'teamId is required'
    );
  end if;

  if p_json is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_JSON_REQUIRED',
      'status', 400,
      'message', 'json is required'
    );
  end if;

  select
    public.cmd_membership_is_team_manager(v_actor, p_team_id) or
    public.cmd_membership_is_system_manager(v_actor)
  into v_can_manage;

  if not coalesce(v_can_manage, false) then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'The actor cannot update this team profile'
    );
  end if;

  update public.teams
    set json = p_json,
        is_public = coalesce(p_is_public, false),
        modified_at = now()
  where id = p_team_id
  returning to_jsonb(teams.*)
    into v_team_row;

  if v_team_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_NOT_FOUND',
      'status', 404,
      'message', 'Team not found'
    );
  end if;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_team_update_profile',
    v_actor,
    'teams',
    p_team_id,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_team_row
  );
end;
$$;

create or replace function public.cmd_team_set_rank(
  p_team_id uuid,
  p_rank integer,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_team_row jsonb;
  v_can_manage boolean;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_team_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_ID_REQUIRED',
      'status', 400,
      'message', 'teamId is required'
    );
  end if;

  if p_rank is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'RANK_REQUIRED',
      'status', 400,
      'message', 'rank is required'
    );
  end if;

  select
    public.cmd_membership_is_team_manager(v_actor, p_team_id) or
    public.cmd_membership_is_system_manager(v_actor)
  into v_can_manage;

  if not coalesce(v_can_manage, false) then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'The actor cannot update this team rank'
    );
  end if;

  update public.teams
    set rank = p_rank,
        modified_at = now()
  where id = p_team_id
  returning to_jsonb(teams.*)
    into v_team_row;

  if v_team_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_NOT_FOUND',
      'status', 404,
      'message', 'Team not found'
    );
  end if;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_team_set_rank',
    v_actor,
    'teams',
    p_team_id,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_team_row
  );
end;
$$;

create or replace function public.cmd_user_update_contact(
  p_user_id uuid,
  p_contact jsonb,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_user_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'USER_ID_REQUIRED',
      'status', 400,
      'message', 'userId is required'
    );
  end if;

  if v_actor <> p_user_id and not public.cmd_membership_is_review_admin(v_actor) then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'The actor cannot update this contact'
    );
  end if;

  update public.users
    set contact = p_contact
  where id = p_user_id
  returning to_jsonb(users.*)
    into v_user_row;

  if v_user_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'USER_NOT_FOUND',
      'status', 404,
      'message', 'User not found'
    );
  end if;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    payload
  )
  values (
    'cmd_user_update_contact',
    v_actor,
    'users',
    p_user_id,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_user_row
  );
end;
$$;

create or replace function public.cmd_team_change_member_role(
  p_team_id uuid,
  p_user_id uuid,
  p_role text default null,
  p_action text default 'set',
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(coalesce(p_action, 'set'));
  v_existing_role text;
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_team_id is null or p_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_PAYLOAD',
      'status', 400,
      'message', 'teamId and userId are required'
    );
  end if;

  if p_team_id = '00000000-0000-0000-0000-000000000000'::uuid then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_TEAM_SCOPE',
      'status', 400,
      'message', 'Use system or review member commands for the zero team scope'
    );
  end if;

  select role
    into v_existing_role
  from public.roles
  where user_id = p_user_id
    and team_id = p_team_id
  for update;

  if v_action = 'remove' then
    if v_existing_role is null then
      return jsonb_build_object(
        'ok', false,
        'code', 'ROLE_NOT_FOUND',
        'status', 404,
        'message', 'Role not found'
      );
    end if;

    if not public.policy_roles_delete(p_user_id, p_team_id, v_existing_role) then
      return jsonb_build_object(
        'ok', false,
        'code', 'FORBIDDEN',
        'status', 403,
        'message', 'The actor cannot remove this team member'
      );
    end if;

    delete from public.roles
    where user_id = p_user_id
      and team_id = p_team_id;

    insert into public.command_audit_log (
      command,
      actor_user_id,
      target_table,
      target_id,
      target_version,
      payload
    )
    values (
      'cmd_team_change_member_role',
      v_actor,
      'roles',
      p_user_id,
      p_team_id::text,
      coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
        'action', 'remove'
      )
    );

    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'removed', true,
        'user_id', p_user_id,
        'team_id', p_team_id
      )
    );
  end if;

  if v_action <> 'set' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ACTION',
      'status', 400,
      'message', 'Unsupported action'
    );
  end if;

  if p_role = 'is_invited' then
    if v_existing_role = 'rejected' then
      return jsonb_build_object(
        'ok', false,
        'code', 'REINVITE_REQUIRED',
        'status', 409,
        'message', 'Use the reinvite command for rejected members'
      );
    end if;

    if v_existing_role is not null then
      return jsonb_build_object(
        'ok', false,
        'code', 'TEAM_MEMBER_ALREADY_EXISTS',
        'status', 409,
        'message', 'The team membership already exists'
      );
    end if;

    if not public.policy_roles_insert(p_user_id, p_team_id, 'is_invited') then
      return jsonb_build_object(
        'ok', false,
        'code', 'FORBIDDEN',
        'status', 403,
        'message', 'The actor cannot invite this user to the team'
      );
    end if;

    insert into public.roles (
      user_id,
      team_id,
      role,
      modified_at
    )
    values (
      p_user_id,
      p_team_id,
      'is_invited',
      now()
    )
    returning to_jsonb(roles.*)
      into v_role_row;
  elsif p_role in ('admin', 'member') then
    if not public.cmd_membership_is_team_owner(v_actor, p_team_id) then
      return jsonb_build_object(
        'ok', false,
        'code', 'FORBIDDEN',
        'status', 403,
        'message', 'Only the team owner can change active member roles'
      );
    end if;

    if v_existing_role not in ('admin', 'member') then
      return jsonb_build_object(
        'ok', false,
        'code', 'INVALID_ROLE_STATE',
        'status', 409,
        'message', 'Only active team members can be promoted or demoted'
      );
    end if;

    update public.roles
      set role = p_role,
          modified_at = now()
    where user_id = p_user_id
      and team_id = p_team_id
    returning to_jsonb(roles.*)
      into v_role_row;
  else
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ROLE',
      'status', 400,
      'message', 'Unsupported team role transition'
    );
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
    'cmd_team_change_member_role',
    v_actor,
    'roles',
    p_user_id,
    p_team_id::text,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'action', 'set',
      'role', p_role
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_role_row
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'TEAM_MEMBER_ALREADY_EXISTS',
      'status', 409,
      'message', 'The team membership already exists'
    );
end;
$$;

create or replace function public.cmd_system_change_member_role(
  p_user_id uuid,
  p_role text default null,
  p_action text default 'set',
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(coalesce(p_action, 'set'));
  v_team_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_actor_is_owner boolean;
  v_actor_is_manager boolean;
  v_existing_role text;
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'USER_ID_REQUIRED',
      'status', 400,
      'message', 'userId is required'
    );
  end if;

  v_actor_is_owner := public.cmd_membership_is_system_owner(v_actor);
  v_actor_is_manager := public.cmd_membership_is_system_manager(v_actor);

  if not v_actor_is_manager then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'The actor cannot manage system members'
    );
  end if;

  select role
    into v_existing_role
  from public.roles
  where user_id = p_user_id
    and team_id = v_team_id
  for update;

  if v_action = 'remove' then
    if v_existing_role is null then
      return jsonb_build_object(
        'ok', false,
        'code', 'ROLE_NOT_FOUND',
        'status', 404,
        'message', 'Role not found'
      );
    end if;

    if p_user_id = v_actor or v_existing_role = 'owner' then
      return jsonb_build_object(
        'ok', false,
        'code', 'FORBIDDEN',
        'status', 403,
        'message', 'The actor cannot remove this system member'
      );
    end if;

    delete from public.roles
    where user_id = p_user_id
      and team_id = v_team_id;

    insert into public.command_audit_log (
      command,
      actor_user_id,
      target_table,
      target_id,
      target_version,
      payload
    )
    values (
      'cmd_system_change_member_role',
      v_actor,
      'roles',
      p_user_id,
      v_team_id::text,
      coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
        'action', 'remove'
      )
    );

    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'removed', true,
        'user_id', p_user_id,
        'team_id', v_team_id
      )
    );
  end if;

  if v_action <> 'set' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ACTION',
      'status', 400,
      'message', 'Unsupported action'
    );
  end if;

  if p_role not in ('member', 'admin') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ROLE',
      'status', 400,
      'message', 'Unsupported system role transition'
    );
  end if;

  if p_role = 'admin' and not v_actor_is_owner then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'Only the system owner can assign admin roles'
    );
  end if;

  if p_role = 'member' and v_existing_role = 'admin' and not v_actor_is_owner then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'Only the system owner can demote an admin'
    );
  end if;

  if v_existing_role is null then
    insert into public.roles (
      user_id,
      team_id,
      role,
      modified_at
    )
    values (
      p_user_id,
      v_team_id,
      p_role,
      now()
    )
    returning to_jsonb(roles.*)
      into v_role_row;
  elsif v_existing_role in ('owner', 'admin', 'member') then
    if v_existing_role = 'owner' then
      return jsonb_build_object(
        'ok', false,
        'code', 'FORBIDDEN',
        'status', 403,
        'message', 'The owner role cannot be modified'
      );
    end if;

    update public.roles
      set role = p_role,
          modified_at = now()
    where user_id = p_user_id
      and team_id = v_team_id
    returning to_jsonb(roles.*)
      into v_role_row;
  else
    return jsonb_build_object(
      'ok', false,
      'code', 'ROLE_CONFLICT',
      'status', 409,
      'message', 'The existing zero-team role belongs to another scope'
    );
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
    'cmd_system_change_member_role',
    v_actor,
    'roles',
    p_user_id,
    v_team_id::text,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'action', 'set',
      'role', p_role
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_role_row
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROLE_CONFLICT',
      'status', 409,
      'message', 'The existing zero-team role belongs to another scope'
    );
end;
$$;

create or replace function public.cmd_review_change_member_role(
  p_user_id uuid,
  p_role text default null,
  p_action text default 'set',
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_action text := lower(coalesce(p_action, 'set'));
  v_team_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_existing_role text;
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if p_user_id is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'USER_ID_REQUIRED',
      'status', 400,
      'message', 'userId is required'
    );
  end if;

  if not public.cmd_membership_is_review_admin(v_actor) then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'Only a review admin can manage review members'
    );
  end if;

  select role
    into v_existing_role
  from public.roles
  where user_id = p_user_id
    and team_id = v_team_id
  for update;

  if v_action = 'remove' then
    if v_existing_role is null then
      return jsonb_build_object(
        'ok', false,
        'code', 'ROLE_NOT_FOUND',
        'status', 404,
        'message', 'Role not found'
      );
    end if;

    if p_user_id = v_actor or v_existing_role <> 'review-member' then
      return jsonb_build_object(
        'ok', false,
        'code', 'FORBIDDEN',
        'status', 403,
        'message', 'Only review-member rows can be removed'
      );
    end if;

    delete from public.roles
    where user_id = p_user_id
      and team_id = v_team_id;

    insert into public.command_audit_log (
      command,
      actor_user_id,
      target_table,
      target_id,
      target_version,
      payload
    )
    values (
      'cmd_review_change_member_role',
      v_actor,
      'roles',
      p_user_id,
      v_team_id::text,
      coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
        'action', 'remove'
      )
    );

    return jsonb_build_object(
      'ok', true,
      'data', jsonb_build_object(
        'removed', true,
        'user_id', p_user_id,
        'team_id', v_team_id
      )
    );
  end if;

  if v_action <> 'set' then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ACTION',
      'status', 400,
      'message', 'Unsupported action'
    );
  end if;

  if p_role not in ('review-member', 'review-admin') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVALID_ROLE',
      'status', 400,
      'message', 'Unsupported review role transition'
    );
  end if;

  if v_existing_role is null then
    if p_role <> 'review-member' then
      return jsonb_build_object(
        'ok', false,
        'code', 'INVALID_ROLE_STATE',
        'status', 409,
        'message', 'A new review member must start as review-member'
      );
    end if;

    insert into public.roles (
      user_id,
      team_id,
      role,
      modified_at
    )
    values (
      p_user_id,
      v_team_id,
      p_role,
      now()
    )
    returning to_jsonb(roles.*)
      into v_role_row;
  elsif v_existing_role in ('review-member', 'review-admin') then
    update public.roles
      set role = p_role,
          modified_at = now()
    where user_id = p_user_id
      and team_id = v_team_id
    returning to_jsonb(roles.*)
      into v_role_row;
  else
    return jsonb_build_object(
      'ok', false,
      'code', 'ROLE_CONFLICT',
      'status', 409,
      'message', 'The existing zero-team role belongs to another scope'
    );
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
    'cmd_review_change_member_role',
    v_actor,
    'roles',
    p_user_id,
    v_team_id::text,
    coalesce(p_audit, '{}'::jsonb) || jsonb_build_object(
      'action', 'set',
      'role', p_role
    )
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_role_row
  );
exception
  when unique_violation then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROLE_CONFLICT',
      'status', 409,
      'message', 'The existing zero-team role belongs to another scope'
    );
end;
$$;

create or replace function public.cmd_team_reinvite_member(
  p_team_id uuid,
  p_user_id uuid,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_existing_role text;
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  select role
    into v_existing_role
  from public.roles
  where user_id = p_user_id
    and team_id = p_team_id
  for update;

  if v_existing_role is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'ROLE_NOT_FOUND',
      'status', 404,
      'message', 'Role not found'
    );
  end if;

  if not public.policy_roles_update(p_user_id, p_team_id, 'is_invited') then
    return jsonb_build_object(
      'ok', false,
      'code', 'FORBIDDEN',
      'status', 403,
      'message', 'The actor cannot reinvite this member'
    );
  end if;

  update public.roles
    set role = 'is_invited',
        modified_at = now()
  where user_id = p_user_id
    and team_id = p_team_id
  returning to_jsonb(roles.*)
    into v_role_row;

  insert into public.command_audit_log (
    command,
    actor_user_id,
    target_table,
    target_id,
    target_version,
    payload
  )
  values (
    'cmd_team_reinvite_member',
    v_actor,
    'roles',
    p_user_id,
    p_team_id::text,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_role_row
  );
end;
$$;

create or replace function public.cmd_team_accept_invitation(
  p_team_id uuid,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if not public.policy_roles_update(v_actor, p_team_id, 'member') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVITATION_NOT_FOUND',
      'status', 404,
      'message', 'No matching invitation was found for the actor'
    );
  end if;

  update public.roles
    set role = 'member',
        modified_at = now()
  where user_id = v_actor
    and team_id = p_team_id
    and role = 'is_invited'
  returning to_jsonb(roles.*)
    into v_role_row;

  if v_role_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVITATION_NOT_FOUND',
      'status', 404,
      'message', 'No matching invitation was found for the actor'
    );
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
    'cmd_team_accept_invitation',
    v_actor,
    'roles',
    v_actor,
    p_team_id::text,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_role_row
  );
end;
$$;

create or replace function public.cmd_team_reject_invitation(
  p_team_id uuid,
  p_audit jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_role_row jsonb;
begin
  if v_actor is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'AUTH_REQUIRED',
      'status', 401,
      'message', 'Authentication required'
    );
  end if;

  if not public.policy_roles_update(v_actor, p_team_id, 'rejected') then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVITATION_NOT_FOUND',
      'status', 404,
      'message', 'No matching invitation was found for the actor'
    );
  end if;

  update public.roles
    set role = 'rejected',
        modified_at = now()
  where user_id = v_actor
    and team_id = p_team_id
    and role = 'is_invited'
  returning to_jsonb(roles.*)
    into v_role_row;

  if v_role_row is null then
    return jsonb_build_object(
      'ok', false,
      'code', 'INVITATION_NOT_FOUND',
      'status', 404,
      'message', 'No matching invitation was found for the actor'
    );
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
    'cmd_team_reject_invitation',
    v_actor,
    'roles',
    v_actor,
    p_team_id::text,
    coalesce(p_audit, '{}'::jsonb)
  );

  return jsonb_build_object(
    'ok', true,
    'data', v_role_row
  );
end;
$$;

create or replace function public.qry_team_get_member_list(
  p_team_id uuid,
  p_page integer default 1,
  p_page_size integer default 10,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc'
)
returns table (
  user_id uuid,
  team_id uuid,
  role text,
  email text,
  display_name text,
  created_at timestamptz,
  modified_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_limit integer := greatest(1, least(coalesce(p_page_size, 10), 100));
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * v_limit;
  v_order_by text := public.cmd_membership_resolve_member_order_by(p_sort_by, false);
  v_order_dir text := public.cmd_membership_resolve_sort_direction(p_sort_order);
begin
  if v_actor is null then
    return;
  end if;

  if not exists (
    select 1
    from public.roles
    where user_id = v_actor
      and team_id = p_team_id
      and role <> 'rejected'
  ) then
    return;
  end if;

  return query execute format(
    $sql$
      with members as (
        select
          r.user_id,
          r.team_id,
          r.role::text as role,
          coalesce(u.raw_user_meta_data->>'email', '') as email,
          coalesce(
            nullif(u.raw_user_meta_data->>'display_name', ''),
            u.raw_user_meta_data->>'email',
            '-'
          ) as display_name,
          r.created_at,
          r.modified_at
        from public.roles as r
        left join public.users as u
          on u.id = r.user_id
        where r.team_id = $1
      )
      select
        m.user_id,
        m.team_id,
        m.role,
        m.email,
        m.display_name,
        m.created_at,
        m.modified_at,
        count(*) over() as total_count
      from members as m
      order by %s %s nulls last, m.user_id asc
      limit $2
      offset $3
    $sql$,
    v_order_by,
    v_order_dir
  )
  using p_team_id, v_limit, v_offset;
end;
$$;

create or replace function public.qry_system_get_member_list(
  p_page integer default 1,
  p_page_size integer default 10,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc'
)
returns table (
  user_id uuid,
  team_id uuid,
  role text,
  email text,
  display_name text,
  created_at timestamptz,
  modified_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_team_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_limit integer := greatest(1, least(coalesce(p_page_size, 10), 100));
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * v_limit;
  v_order_by text := public.cmd_membership_resolve_member_order_by(p_sort_by, false);
  v_order_dir text := public.cmd_membership_resolve_sort_direction(p_sort_order);
begin
  if v_actor is null then
    return;
  end if;

  if not public.cmd_membership_is_system_manager(v_actor) then
    return;
  end if;

  return query execute format(
    $sql$
      with members as (
        select
          r.user_id,
          r.team_id,
          r.role::text as role,
          coalesce(u.raw_user_meta_data->>'email', '') as email,
          coalesce(
            nullif(u.raw_user_meta_data->>'display_name', ''),
            u.raw_user_meta_data->>'email',
            '-'
          ) as display_name,
          r.created_at,
          r.modified_at
        from public.roles as r
        left join public.users as u
          on u.id = r.user_id
        where r.team_id = $1
          and r.role in ('owner', 'admin', 'member')
      )
      select
        m.user_id,
        m.team_id,
        m.role,
        m.email,
        m.display_name,
        m.created_at,
        m.modified_at,
        count(*) over() as total_count
      from members as m
      order by %s %s nulls last, m.user_id asc
      limit $2
      offset $3
    $sql$,
    v_order_by,
    v_order_dir
  )
  using v_team_id, v_limit, v_offset;
end;
$$;

create or replace function public.qry_review_get_member_list(
  p_page integer default 1,
  p_page_size integer default 10,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc',
  p_role text default null
)
returns table (
  user_id uuid,
  team_id uuid,
  role text,
  email text,
  display_name text,
  created_at timestamptz,
  modified_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_team_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_limit integer := greatest(1, least(coalesce(p_page_size, 10), 100));
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * v_limit;
  v_order_by text := public.cmd_membership_resolve_member_order_by(p_sort_by, false);
  v_order_dir text := public.cmd_membership_resolve_sort_direction(p_sort_order);
begin
  if v_actor is null then
    return;
  end if;

  if not public.cmd_membership_is_review_admin(v_actor) then
    return;
  end if;

  return query execute format(
    $sql$
      with members as (
        select
          r.user_id,
          r.team_id,
          r.role::text as role,
          coalesce(u.raw_user_meta_data->>'email', '') as email,
          coalesce(
            nullif(u.raw_user_meta_data->>'display_name', ''),
            u.raw_user_meta_data->>'email',
            '-'
          ) as display_name,
          r.created_at,
          r.modified_at
        from public.roles as r
        left join public.users as u
          on u.id = r.user_id
        where r.team_id = $1
          and r.role in ('review-admin', 'review-member')
          and ($4::text is null or r.role = $4::text)
      )
      select
        m.user_id,
        m.team_id,
        m.role,
        m.email,
        m.display_name,
        m.created_at,
        m.modified_at,
        count(*) over() as total_count
      from members as m
      order by %s %s nulls last, m.user_id asc
      limit $2
      offset $3
    $sql$,
    v_order_by,
    v_order_dir
  )
  using v_team_id, v_limit, v_offset, p_role;
end;
$$;

create or replace function public.qry_review_get_member_workload(
  p_page integer default 1,
  p_page_size integer default 10,
  p_sort_by text default 'created_at',
  p_sort_order text default 'desc',
  p_role text default null
)
returns table (
  user_id uuid,
  team_id uuid,
  role text,
  email text,
  display_name text,
  pending_count bigint,
  reviewed_count bigint,
  created_at timestamptz,
  modified_at timestamptz,
  total_count bigint
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_team_id uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_limit integer := greatest(1, least(coalesce(p_page_size, 10), 100));
  v_offset integer := (greatest(coalesce(p_page, 1), 1) - 1) * v_limit;
  v_order_by text := public.cmd_membership_resolve_member_order_by(p_sort_by, true);
  v_order_dir text := public.cmd_membership_resolve_sort_direction(p_sort_order);
begin
  if v_actor is null then
    return;
  end if;

  if not public.cmd_membership_is_review_admin(v_actor) then
    return;
  end if;

  return query execute format(
    $sql$
      with members as (
        select
          r.user_id,
          r.team_id,
          r.role::text as role,
          coalesce(u.raw_user_meta_data->>'email', '') as email,
          coalesce(
            nullif(u.raw_user_meta_data->>'display_name', ''),
            u.raw_user_meta_data->>'email',
            '-'
          ) as display_name,
          coalesce(w.pending_count, 0) as pending_count,
          coalesce(w.reviewed_count, 0) as reviewed_count,
          r.created_at,
          r.modified_at
        from public.roles as r
        left join public.users as u
          on u.id = r.user_id
        left join lateral (
          select
            count(*) filter (
              where c.state_code = 0
                and rv.state_code > 0
            ) as pending_count,
            count(*) filter (
              where c.state_code in (1, 2)
                and rv.state_code > 0
            ) as reviewed_count
          from public.comments as c
          join public.reviews as rv
            on rv.id = c.review_id
          where c.reviewer_id = r.user_id
            and c.state_code in (0, 1, 2)
        ) as w on true
        where r.team_id = $1
          and r.role in ('review-admin', 'review-member')
          and ($4::text is null or r.role = $4::text)
      )
      select
        m.user_id,
        m.team_id,
        m.role,
        m.email,
        m.display_name,
        m.pending_count,
        m.reviewed_count,
        m.created_at,
        m.modified_at,
        count(*) over() as total_count
      from members as m
      order by %s %s nulls last, m.user_id asc
      limit $2
      offset $3
    $sql$,
    v_order_by,
    v_order_dir
  )
  using v_team_id, v_limit, v_offset, p_role;
end;
$$;

revoke all on function public.cmd_membership_is_team_owner(uuid, uuid) from public;
revoke all on function public.cmd_membership_is_team_manager(uuid, uuid) from public;
revoke all on function public.cmd_membership_is_system_owner(uuid) from public;
revoke all on function public.cmd_membership_is_system_manager(uuid) from public;
revoke all on function public.cmd_membership_is_review_admin(uuid) from public;
revoke all on function public.cmd_membership_resolve_sort_direction(text) from public;
revoke all on function public.cmd_membership_resolve_member_order_by(text, boolean) from public;
revoke all on function public.cmd_team_create(uuid, jsonb, integer, boolean, jsonb) from public;
revoke all on function public.cmd_team_update_profile(uuid, jsonb, boolean, jsonb) from public;
revoke all on function public.cmd_team_set_rank(uuid, integer, jsonb) from public;
revoke all on function public.cmd_user_update_contact(uuid, jsonb, jsonb) from public;
revoke all on function public.cmd_team_change_member_role(uuid, uuid, text, text, jsonb) from public;
revoke all on function public.cmd_system_change_member_role(uuid, text, text, jsonb) from public;
revoke all on function public.cmd_review_change_member_role(uuid, text, text, jsonb) from public;
revoke all on function public.cmd_team_reinvite_member(uuid, uuid, jsonb) from public;
revoke all on function public.cmd_team_accept_invitation(uuid, jsonb) from public;
revoke all on function public.cmd_team_reject_invitation(uuid, jsonb) from public;
revoke all on function public.qry_team_get_member_list(uuid, integer, integer, text, text) from public;
revoke all on function public.qry_system_get_member_list(integer, integer, text, text) from public;
revoke all on function public.qry_review_get_member_list(integer, integer, text, text, text) from public;
revoke all on function public.qry_review_get_member_workload(integer, integer, text, text, text) from public;

grant execute on function public.cmd_team_create(uuid, jsonb, integer, boolean, jsonb) to authenticated;
grant execute on function public.cmd_team_update_profile(uuid, jsonb, boolean, jsonb) to authenticated;
grant execute on function public.cmd_team_set_rank(uuid, integer, jsonb) to authenticated;
grant execute on function public.cmd_user_update_contact(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.cmd_team_change_member_role(uuid, uuid, text, text, jsonb) to authenticated;
grant execute on function public.cmd_system_change_member_role(uuid, text, text, jsonb) to authenticated;
grant execute on function public.cmd_review_change_member_role(uuid, text, text, jsonb) to authenticated;
grant execute on function public.cmd_team_reinvite_member(uuid, uuid, jsonb) to authenticated;
grant execute on function public.cmd_team_accept_invitation(uuid, jsonb) to authenticated;
grant execute on function public.cmd_team_reject_invitation(uuid, jsonb) to authenticated;
grant execute on function public.qry_team_get_member_list(uuid, integer, integer, text, text) to authenticated;
grant execute on function public.qry_system_get_member_list(integer, integer, text, text) to authenticated;
grant execute on function public.qry_review_get_member_list(integer, integer, text, text, text) to authenticated;
grant execute on function public.qry_review_get_member_workload(integer, integer, text, text, text) to authenticated;

grant execute on function public.cmd_team_create(uuid, jsonb, integer, boolean, jsonb) to service_role;
grant execute on function public.cmd_team_update_profile(uuid, jsonb, boolean, jsonb) to service_role;
grant execute on function public.cmd_team_set_rank(uuid, integer, jsonb) to service_role;
grant execute on function public.cmd_user_update_contact(uuid, jsonb, jsonb) to service_role;
grant execute on function public.cmd_team_change_member_role(uuid, uuid, text, text, jsonb) to service_role;
grant execute on function public.cmd_system_change_member_role(uuid, text, text, jsonb) to service_role;
grant execute on function public.cmd_review_change_member_role(uuid, text, text, jsonb) to service_role;
grant execute on function public.cmd_team_reinvite_member(uuid, uuid, jsonb) to service_role;
grant execute on function public.cmd_team_accept_invitation(uuid, jsonb) to service_role;
grant execute on function public.cmd_team_reject_invitation(uuid, jsonb) to service_role;
grant execute on function public.qry_team_get_member_list(uuid, integer, integer, text, text) to service_role;
grant execute on function public.qry_system_get_member_list(integer, integer, text, text) to service_role;
grant execute on function public.qry_review_get_member_list(integer, integer, text, text, text) to service_role;
grant execute on function public.qry_review_get_member_workload(integer, integer, text, text, text) to service_role;
