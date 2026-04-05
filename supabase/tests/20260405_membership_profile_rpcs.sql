begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(24);

select set_config('request.jwt.claim.role', 'authenticated', true);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'team-owner@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000001","email":"team-owner@example.com","display_name":"Team Owner"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'team-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000002","email":"team-admin@example.com","display_name":"Team Admin"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'team-member@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000003","email":"team-member@example.com","display_name":"Team Member"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'team-invitee@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000004","email":"team-invitee@example.com","display_name":"Team Invitee"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'system-owner@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000005","email":"system-owner@example.com","display_name":"System Owner"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000006',
    'authenticated',
    'authenticated',
    'system-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000006","email":"system-admin@example.com","display_name":"System Admin"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000007',
    'authenticated',
    'authenticated',
    'review-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000007","email":"review-admin@example.com","display_name":"Review Admin"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000008',
    'authenticated',
    'authenticated',
    'review-member@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000008","email":"review-member@example.com","display_name":"Review Member"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000009',
    'authenticated',
    'authenticated',
    'new-user@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000009","email":"new-user@example.com","display_name":"New User"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '71000000-0000-0000-0000-000000000010',
    'authenticated',
    'authenticated',
    'review-candidate@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"71000000-0000-0000-0000-000000000010","email":"review-candidate@example.com","display_name":"Review Candidate"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.users (id, raw_user_meta_data, contact)
values
  ('71000000-0000-0000-0000-000000000001', '{"email":"team-owner@example.com","display_name":"Team Owner"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000002', '{"email":"team-admin@example.com","display_name":"Team Admin"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000003', '{"email":"team-member@example.com","display_name":"Team Member"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000004', '{"email":"team-invitee@example.com","display_name":"Team Invitee"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000005', '{"email":"system-owner@example.com","display_name":"System Owner"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000006', '{"email":"system-admin@example.com","display_name":"System Admin"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000007', '{"email":"review-admin@example.com","display_name":"Review Admin"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000008', '{"email":"review-member@example.com","display_name":"Review Member"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000009', '{"email":"new-user@example.com","display_name":"New User"}'::jsonb, null),
  ('71000000-0000-0000-0000-000000000010', '{"email":"review-candidate@example.com","display_name":"Review Candidate"}'::jsonb, null);

insert into public.teams (id, json, rank, is_public, modified_at)
values
  ('72000000-0000-0000-0000-000000000001', '{"title":[{"@xml:lang":"en","#text":"Primary Team"}]}'::jsonb, 1, false, now()),
  ('72000000-0000-0000-0000-000000000002', '{"title":[{"@xml:lang":"en","#text":"Secondary Team"}]}'::jsonb, 5, true, now());

insert into public.roles (user_id, team_id, role, modified_at)
values
  ('71000000-0000-0000-0000-000000000001', '72000000-0000-0000-0000-000000000001', 'owner', now()),
  ('71000000-0000-0000-0000-000000000002', '72000000-0000-0000-0000-000000000001', 'admin', now()),
  ('71000000-0000-0000-0000-000000000003', '72000000-0000-0000-0000-000000000001', 'member', now()),
  ('71000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'owner', now()),
  ('71000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'admin', now()),
  ('71000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'review-admin', now()),
  ('71000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000000', 'review-member', now());

insert into public.reviews (
  id,
  data_id,
  data_version,
  state_code,
  reviewer_id,
  json,
  created_at,
  modified_at
)
values
  (
    '73000000-0000-0000-0000-000000000001',
    '74000000-0000-0000-0000-000000000001',
    '01.00.000',
    1,
    '["71000000-0000-0000-0000-000000000008"]'::jsonb,
    '{"data":{"id":"74000000-0000-0000-0000-000000000001","version":"01.00.000"}}'::jsonb,
    now(),
    now()
  ),
  (
    '73000000-0000-0000-0000-000000000002',
    '74000000-0000-0000-0000-000000000002',
    '01.00.000',
    2,
    '["71000000-0000-0000-0000-000000000008"]'::jsonb,
    '{"data":{"id":"74000000-0000-0000-0000-000000000002","version":"01.00.000"}}'::jsonb,
    now(),
    now()
  );

insert into public.comments (
  review_id,
  reviewer_id,
  json,
  state_code,
  created_at,
  modified_at
)
values
  (
    '73000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000008',
    '{"note":"pending"}'::json,
    0,
    now(),
    now()
  ),
  (
    '73000000-0000-0000-0000-000000000002',
    '71000000-0000-0000-0000-000000000008',
    '{"note":"reviewed"}'::json,
    1,
    now(),
    now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000009', true);

select is(
  public.cmd_team_create(
    '72000000-0000-0000-0000-000000000009',
    '{"title":[{"@xml:lang":"en","#text":"Created Team"}]}'::jsonb,
    0,
    true,
    '{"command":"team_create"}'::jsonb
  )->>'ok',
  'true',
  'team create command allows an actor without an existing team to create one'
);

select is(
  (select role from public.roles where user_id = '71000000-0000-0000-0000-000000000009' and team_id = '72000000-0000-0000-0000-000000000009'),
  'owner',
  'team create command initializes the owner role in the same transaction'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_team_change_member_role(
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000004',
    'is_invited',
    'set',
    '{"command":"team_invite"}'::jsonb
  )->>'ok',
  'true',
  'team owner can invite a new team member through the team role command'
);

select is(
  public.cmd_team_change_member_role(
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000003',
    'admin',
    'set',
    '{"command":"team_promote"}'::jsonb
  )->>'code',
  'FORBIDDEN',
  'team admins cannot promote or demote active members'
)
from (
  select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000002', true)
) as _;

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000004', true);

select is(
  public.cmd_team_accept_invitation(
    '72000000-0000-0000-0000-000000000001',
    '{"command":"team_accept"}'::jsonb
  )->>'ok',
  'true',
  'accept invitation only updates the current actor invitation row'
);

select is(
  (select role from public.roles where user_id = '71000000-0000-0000-0000-000000000004' and team_id = '72000000-0000-0000-0000-000000000001'),
  'member',
  'accept invitation upgrades the invited actor to member'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000003', true);

select is(
  public.cmd_team_accept_invitation(
    '72000000-0000-0000-0000-000000000001',
    '{"command":"team_accept"}'::jsonb
  )->>'code',
  'INVITATION_NOT_FOUND',
  'accept invitation cannot act on another user invitation'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_team_reinvite_member(
    '72000000-0000-0000-0000-000000000001',
    '71000000-0000-0000-0000-000000000004',
    '{"command":"team_reinvite"}'::jsonb
  )->>'ok',
  'false',
  'reinvite does not apply once the target is no longer rejected'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000006', true);

select is(
  public.cmd_system_change_member_role(
    '71000000-0000-0000-0000-000000000009',
    'member',
    'set',
    '{"command":"system_add_member"}'::jsonb
  )->>'ok',
  'true',
  'system admins can add a system member'
);

select is(
  public.cmd_system_change_member_role(
    '71000000-0000-0000-0000-000000000009',
    'admin',
    'set',
    '{"command":"system_promote_admin"}'::jsonb
  )->>'code',
  'FORBIDDEN',
  'system admins cannot promote a member to admin'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000005', true);

select is(
  public.cmd_system_change_member_role(
    '71000000-0000-0000-0000-000000000009',
    'admin',
    'set',
    '{"command":"system_promote_admin"}'::jsonb
  )->>'ok',
  'true',
  'system owner can promote a system member to admin'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000007', true);

select is(
  public.cmd_review_change_member_role(
    '71000000-0000-0000-0000-000000000010',
    'review-member',
    'set',
    '{"command":"review_add_member"}'::jsonb
  )->>'ok',
  'true',
  'review admin can add a review member'
);

select is(
  public.cmd_review_change_member_role(
    '71000000-0000-0000-0000-000000000010',
    'review-admin',
    'set',
    '{"command":"review_promote_admin"}'::jsonb
  )->>'ok',
  'true',
  'review admin can promote a review member to review-admin'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_team_update_profile(
    '72000000-0000-0000-0000-000000000001',
    '{"title":[{"@xml:lang":"en","#text":"Primary Team Updated"}]}'::jsonb,
    true,
    '{"command":"team_update_profile"}'::jsonb
  )->>'ok',
  'true',
  'team profile updates run through a dedicated profile command'
);

select is(
  (select rank::text from public.teams where id = '72000000-0000-0000-0000-000000000001'),
  '1',
  'team profile updates do not mutate rank'
);

select is(
  public.cmd_team_set_rank(
    '72000000-0000-0000-0000-000000000001',
    9,
    '{"command":"team_set_rank"}'::jsonb
  )->>'ok',
  'true',
  'team rank updates run through a dedicated rank command'
);

select is(
  (select json #>> '{title,0,#text}' from public.teams where id = '72000000-0000-0000-0000-000000000001'),
  'Primary Team Updated',
  'team rank updates do not overwrite the team profile json'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000008', true);

select is(
  public.cmd_user_update_contact(
    '71000000-0000-0000-0000-000000000008',
    '{"email":"review-member@example.com"}'::jsonb,
    '{"command":"user_update_contact"}'::jsonb
  )->>'ok',
  'true',
  'users can update their own contact data'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_user_update_contact(
    '71000000-0000-0000-0000-000000000008',
    '{"email":"blocked@example.com"}'::jsonb,
    '{"command":"user_update_contact"}'::jsonb
  )->>'code',
  'FORBIDDEN',
  'non review-admin users cannot update another actor contact data'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::text from public.qry_team_get_member_list('72000000-0000-0000-0000-000000000001', 1, 20, 'created_at', 'desc')),
  '4',
  'team member list query returns the full team membership view from one RPC'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*)::text from public.qry_team_get_member_list('72000000-0000-0000-0000-000000000001', 1, 20, 'created_at', 'desc')),
  '0',
  'team member list query is hidden from non-manager team members'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000005', true);

select is(
  (select count(*)::text from public.qry_system_get_member_list(1, 20, 'created_at', 'desc')),
  '3',
  'system member list query returns the system scope membership rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '71000000-0000-0000-0000-000000000007', true);

select is(
  (select count(*)::text from public.qry_review_get_member_list(1, 20, 'created_at', 'desc', 'review-admin')),
  '2',
  'review member list query can filter by review role'
);

select is(
  (
    select format('%s/%s', pending_count, reviewed_count)
    from public.qry_review_get_member_workload(1, 20, 'created_at', 'desc', 'review-member')
    where user_id = '71000000-0000-0000-0000-000000000008'
  ),
  '1/1',
  'review workload query returns reviewer pending and reviewed counts from one RPC'
);

select * from finish();
rollback;
