begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(5);

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
    '14000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'comments-submitter@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"14000000-0000-0000-0000-000000000001","email":"comments-submitter@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '14000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'assigned-reviewer@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"14000000-0000-0000-0000-000000000002","email":"assigned-reviewer@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '14000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'unassigned-reviewer@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"14000000-0000-0000-0000-000000000003","email":"unassigned-reviewer@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '14000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'comments-review-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"14000000-0000-0000-0000-000000000004","email":"comments-review-admin@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '14000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'comments-outsider@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"14000000-0000-0000-0000-000000000005","email":"comments-outsider@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.roles (user_id, team_id, role)
values
  ('14000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'review-member'),
  ('14000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'review-member'),
  ('14000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'review-admin');

insert into public.reviews (
  id,
  data_id,
  data_version,
  state_code,
  reviewer_id,
  json
)
values (
  '54000000-0000-0000-0000-000000000001',
  '64000000-0000-0000-0000-000000000001',
  '01.00.000',
  1,
  '["14000000-0000-0000-0000-000000000002"]'::jsonb,
  '{
    "user": { "id": "14000000-0000-0000-0000-000000000001" },
    "data": { "id": "64000000-0000-0000-0000-000000000001", "version": "01.00.000" }
  }'::jsonb
);

insert into public.comments (
  review_id,
  reviewer_id,
  json,
  state_code
)
values (
  '54000000-0000-0000-0000-000000000001',
  '14000000-0000-0000-0000-000000000002',
  '{"comment":"assigned reviewer draft"}'::json,
  0
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000001', true);

select is(
  (
    select count(*)::text
    from public.comments
    where review_id = '54000000-0000-0000-0000-000000000001'
  ),
  '1',
  'review submitter can read comments for the submitted review'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000002', true);

select is(
  (
    select count(*)::text
    from public.comments
    where review_id = '54000000-0000-0000-0000-000000000001'
  ),
  '1',
  'assigned review-member can read comments for the assigned review'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000003', true);

select is(
  (
    select count(*)::text
    from public.comments
    where review_id = '54000000-0000-0000-0000-000000000001'
  ),
  '0',
  'unassigned review-member cannot read comments for another review'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000004', true);

select is(
  (
    select count(*)::text
    from public.comments
    where review_id = '54000000-0000-0000-0000-000000000001'
  ),
  '1',
  'review-admin can read comments for any review'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '14000000-0000-0000-0000-000000000005', true);

select is(
  (
    select count(*)::text
    from public.comments
    where review_id = '54000000-0000-0000-0000-000000000001'
  ),
  '0',
  'unrelated authenticated user cannot read review comments'
);

select * from finish();

rollback;
