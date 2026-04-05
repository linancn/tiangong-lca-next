begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(9);

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
    '91000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'dataset-owner@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"91000000-0000-0000-0000-000000000001","email":"dataset-owner@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'outsider@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"91000000-0000-0000-0000-000000000002","email":"outsider@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '91000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'system-review-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"91000000-0000-0000-0000-000000000003","email":"system-review-admin@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.users (id, raw_user_meta_data, contact)
values
  ('91000000-0000-0000-0000-000000000001', '{"email":"dataset-owner@example.com"}'::jsonb, null),
  ('91000000-0000-0000-0000-000000000002', '{"email":"outsider@example.com"}'::jsonb, null),
  ('91000000-0000-0000-0000-000000000003', '{"email":"system-review-admin@example.com"}'::jsonb, null);

insert into public.teams (id, json, rank, is_public)
values
  ('92000000-0000-0000-0000-000000000001', '{"name":"Review Team"}'::jsonb, 1, false),
  ('00000000-0000-0000-0000-000000000000', '{"name":"System Team"}'::jsonb, 0, false);

insert into public.roles (user_id, team_id, role)
values
  ('91000000-0000-0000-0000-000000000001', '92000000-0000-0000-0000-000000000001', 'owner'),
  ('91000000-0000-0000-0000-000000000002', '92000000-0000-0000-0000-000000000001', 'review-admin'),
  ('91000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'review-admin');

insert into public.sources (id, version, json_ordered, user_id, state_code, team_id, rule_verification)
values (
  '93000000-0000-0000-0000-000000000001',
  '01.00.000',
  '{
    "sourceDataSet": {
      "administrativeInformation": {
        "publicationAndOwnership": {
          "common:dataSetVersion": "01.00.000"
        }
      }
    }
  }'::json,
  '91000000-0000-0000-0000-000000000001',
  20,
  '92000000-0000-0000-0000-000000000001',
  true
);

alter table public.processes disable trigger "process_extract_md_trigger_insert";
alter table public.processes disable trigger "process_extract_text_trigger_insert";

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_dataset_create(
    'contacts',
    '94000000-0000-0000-0000-000000000001',
    '{
      "contactDataSet": {
        "administrativeInformation": {
          "publicationAndOwnership": {
            "common:dataSetVersion": "01.00.000"
          }
        }
      },
      "payload": {
        "name": "created-contact"
      }
    }'::jsonb,
    null,
    false,
    '{"command":"dataset_create"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can create a contact dataset through cmd_dataset_create'
);

select is(
  (
    select jsonb_build_object(
      'version', version,
      'user_id', user_id,
      'rule_verification', rule_verification
    )::text
    from public.contacts
    where id = '94000000-0000-0000-0000-000000000001'
      and version = '01.00.000'
  ),
  jsonb_build_object(
    'version', '01.00.000',
    'user_id', '91000000-0000-0000-0000-000000000001',
    'rule_verification', false
  )::text,
  'cmd_dataset_create persists version, owner, and rule_verification'
);

select is(
  public.cmd_dataset_create(
    'processes',
    '94000000-0000-0000-0000-000000000002',
    '{
      "processDataSet": {
        "administrativeInformation": {
          "publicationAndOwnership": {
            "common:dataSetVersion": "01.00.000"
          }
        }
      }
    }'::jsonb,
    null,
    true,
    '{}'::jsonb
  )->>'ok',
  'true',
  'process creation works without modelId for standalone datasets'
);

select ok(
  (select model_id is null
   from public.processes
   where id = '94000000-0000-0000-0000-000000000002'
     and version = '01.00.000'),
  'cmd_dataset_create keeps model_id null when modelId is omitted'
);

select is(
  public.cmd_dataset_create(
    'lifecyclemodels',
    '94000000-0000-0000-0000-000000000003',
    '{}'::jsonb,
    null,
    true,
    '{}'::jsonb
  )->>'code',
  'LIFECYCLEMODEL_BUNDLE_REQUIRED',
  'lifecycle model creation stays on bundle-specific commands'
);

select is(
  public.cmd_dataset_delete(
    'contacts',
    '94000000-0000-0000-0000-000000000001',
    '01.00.000',
    '{"command":"dataset_delete"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can delete a draft dataset through cmd_dataset_delete'
);

select is(
  (
    select count(*)::text
    from public.contacts
    where id = '94000000-0000-0000-0000-000000000001'
      and version = '01.00.000'
  ),
  '0',
  'cmd_dataset_delete removes the draft dataset row'
);

select is(
  public.cmd_dataset_delete(
    'sources',
    '93000000-0000-0000-0000-000000000001',
    '01.00.000',
    '{}'::jsonb
  )->>'code',
  'DATASET_DELETE_REQUIRES_DRAFT',
  'under-review datasets cannot be deleted'
);

select is(
  jsonb_build_object(
    'team_role_review_admin', public.cmd_review_is_review_admin('91000000-0000-0000-0000-000000000002'),
    'system_review_admin', public.cmd_review_is_review_admin('91000000-0000-0000-0000-000000000003')
  )::text,
  jsonb_build_object(
    'team_role_review_admin', false,
    'system_review_admin', true
  )::text,
  'cmd_review_is_review_admin only recognizes the system-team review-admin scope'
);

select * from finish();
rollback;
