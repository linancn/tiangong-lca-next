alter table public.roles
  drop constraint if exists roles_role_check;

alter table public.roles
  add constraint roles_role_check
  check (
    role in (
      'owner',
      'admin',
      'member',
      'is_invited',
      'rejected',
      'review-admin',
      'review-member'
    )
  );

alter table public.reviews
  drop constraint if exists reviews_state_code_check;

alter table public.reviews
  add constraint reviews_state_code_check
  check (state_code in (-1, 0, 1, 2));

alter table public.comments
  drop constraint if exists comments_state_code_check;

alter table public.comments
  add constraint comments_state_code_check
  check (state_code in (-3, -2, -1, 0, 1, 2));

alter table public.contacts
  drop constraint if exists contacts_state_code_check;

alter table public.contacts
  add constraint contacts_state_code_check
  check (state_code in (0, 3, 20, 100));

alter table public.sources
  drop constraint if exists sources_state_code_check;

alter table public.sources
  add constraint sources_state_code_check
  check (state_code in (0, 20, 100));

alter table public.unitgroups
  drop constraint if exists unitgroups_state_code_check;

alter table public.unitgroups
  add constraint unitgroups_state_code_check
  check (state_code in (0, 100, 200));

alter table public.flowproperties
  drop constraint if exists flowproperties_state_code_check;

alter table public.flowproperties
  add constraint flowproperties_state_code_check
  check (state_code in (0, 20, 100, 200));

alter table public.flows
  drop constraint if exists flows_state_code_check;

alter table public.flows
  add constraint flows_state_code_check
  check (state_code in (0, 20, 100, 200));

alter table public.processes
  drop constraint if exists processes_state_code_check;

alter table public.processes
  add constraint processes_state_code_check
  check (state_code in (0, 20, 100, 200));

alter table public.lifecyclemodels
  drop constraint if exists lifecyclemodels_state_code_check;

alter table public.lifecyclemodels
  add constraint lifecyclemodels_state_code_check
  check (state_code in (0, 20, 100));

create table if not exists public.command_audit_log (
  id bigint generated always as identity primary key,
  command text not null,
  actor_user_id uuid not null,
  target_table text,
  target_id uuid,
  target_version text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

revoke all on public.command_audit_log from anon, authenticated;
grant all on public.command_audit_log to service_role;

revoke all on sequence public.command_audit_log_id_seq from anon, authenticated;
grant all on sequence public.command_audit_log_id_seq to service_role;
