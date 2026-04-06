begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(13);

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
    '11000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'dataset-owner@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"11000000-0000-0000-0000-000000000001","email":"dataset-owner@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'team-member@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"11000000-0000-0000-0000-000000000002","email":"team-member@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '11000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'outsider@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"11000000-0000-0000-0000-000000000003","email":"outsider@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.teams (id, json, rank, is_public)
values
  ('21000000-0000-0000-0000-000000000001', '{"name":"Team A"}'::jsonb, 1, false),
  ('21000000-0000-0000-0000-000000000002', '{"name":"Team B"}'::jsonb, 2, false),
  ('21000000-0000-0000-0000-000000000003', '{"name":"Team C"}'::jsonb, 3, false),
  ('00000000-0000-0000-0000-000000000000', '{"name":"System Team"}'::jsonb, 0, false);

insert into public.roles (user_id, team_id, role)
values
  ('11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000001', 'owner'),
  ('11000000-0000-0000-0000-000000000001', '21000000-0000-0000-0000-000000000002', 'member'),
  ('11000000-0000-0000-0000-000000000002', '21000000-0000-0000-0000-000000000002', 'member');

insert into public.contacts (id, version, json_ordered, user_id, state_code, team_id, rule_verification)
values (
  '31000000-0000-0000-0000-000000000001',
  '01.00.000',
  '{
    "contactDataSet": {
      "administrativeInformation": {
        "publicationAndOwnership": {
          "common:dataSetVersion": "01.00.000"
        }
      }
    },
    "payload": {
      "name": "draft-contact"
    }
  }'::json,
  '11000000-0000-0000-0000-000000000001',
  0,
  '21000000-0000-0000-0000-000000000001',
  true
);

insert into public.sources (id, version, json_ordered, user_id, state_code, team_id, rule_verification)
values (
  '31000000-0000-0000-0000-000000000002',
  '01.00.000',
  '{
    "sourceDataSet": {
      "administrativeInformation": {
        "publicationAndOwnership": {
          "common:dataSetVersion": "01.00.000"
        }
      }
    },
    "payload": {
      "name": "review-source"
    }
  }'::json,
  '11000000-0000-0000-0000-000000000001',
  20,
  '21000000-0000-0000-0000-000000000001',
  true
);

alter table public.processes disable trigger "processes_json_sync_trigger";
alter table public.processes disable trigger "process_extract_md_trigger_insert";
alter table public.processes disable trigger "process_extract_md_trigger_update";
alter table public.processes disable trigger "process_extract_text_trigger_insert";
alter table public.processes disable trigger "process_extract_text_trigger_update";

insert into public.processes (
  id,
  version,
  json_ordered,
  user_id,
  state_code,
  team_id,
  model_id,
  rule_verification
)
values (
  '31000000-0000-0000-0000-000000000003',
  '01.00.000',
  '{
    "processDataSet": {
      "administrativeInformation": {
        "publicationAndOwnership": {
          "common:dataSetVersion": "01.00.000"
        }
      }
    },
    "payload": {
      "name": "draft-process"
    }
  }'::json,
  '11000000-0000-0000-0000-000000000001',
  0,
  '21000000-0000-0000-0000-000000000001',
  '41000000-0000-0000-0000-000000000001',
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_dataset_save_draft(
    'contacts',
    '31000000-0000-0000-0000-000000000001',
    '01.00.000',
    '{
      "contactDataSet": {
        "administrativeInformation": {
          "publicationAndOwnership": {
            "common:dataSetVersion": "01.00.000"
          }
        }
      },
      "payload": {
        "name": "draft-contact-updated"
      }
    }'::jsonb,
    null,
    false,
    '{"command":"dataset_save_draft"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can save a draft dataset through cmd_dataset_save_draft'
);

select is(
  (select json_ordered->'payload'->>'name'
   from public.contacts
   where id = '31000000-0000-0000-0000-000000000001'
     and version = '01.00.000'),
  'draft-contact-updated',
  'cmd_dataset_save_draft updates json_ordered'
);

select ok(
  (
    select rule_verification = false
    from public.contacts
    where id = '31000000-0000-0000-0000-000000000001'
      and version = '01.00.000'
  ),
  'cmd_dataset_save_draft updates rule_verification when provided'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000003', true);

select is(
  public.cmd_dataset_save_draft(
    'contacts',
    '31000000-0000-0000-0000-000000000001',
    '01.00.000',
    '{}'::jsonb,
    null,
    null,
    '{}'::jsonb
  )->>'code',
  'DATASET_OWNER_REQUIRED',
  'non-owners cannot save someone else''s draft dataset'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '11000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_dataset_save_draft(
    p_table => 'processes',
    p_id => '31000000-0000-0000-0000-000000000003',
    p_version => '01.00.000',
    p_json_ordered => '{
      "processDataSet": {
        "administrativeInformation": {
          "publicationAndOwnership": {
            "common:dataSetVersion": "01.00.000"
          }
        }
      }
    }'::jsonb,
    p_audit => '{}'::jsonb
  )->>'ok',
  'true',
  'process draft save works when modelId is omitted'
);

select is(
  (select model_id::text
   from public.processes
   where id = '31000000-0000-0000-0000-000000000003'
     and version = '01.00.000'),
  '41000000-0000-0000-0000-000000000001',
  'cmd_dataset_save_draft preserves the existing process model_id when modelId is omitted'
);

select is(
  (
    select case
      when rule_verification is null then 'null'
      else rule_verification::text
    end
    from public.processes
    where id = '31000000-0000-0000-0000-000000000003'
      and version = '01.00.000'
  ),
  'null',
  'cmd_dataset_save_draft clears existing process rule_verification when omitted'
);

select is(
  public.cmd_dataset_save_draft(
    'sources',
    '31000000-0000-0000-0000-000000000002',
    '01.00.000',
    '{
      "sourceDataSet": {
        "administrativeInformation": {
          "publicationAndOwnership": {
            "common:dataSetVersion": "01.00.000"
          }
        }
      }
    }'::jsonb,
    null,
    null,
    '{}'::jsonb
  )->>'code',
  'DATA_UNDER_REVIEW',
  'draft save is blocked when the dataset is already under review'
);

select is(
  public.cmd_dataset_assign_team(
    'contacts',
    '31000000-0000-0000-0000-000000000001',
    '01.00.000',
    '21000000-0000-0000-0000-000000000002',
    '{"command":"dataset_assign_team","teamId":"21000000-0000-0000-0000-000000000002"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can assign a draft dataset to a team they belong to'
);

select is(
  (select team_id::text
   from public.contacts
   where id = '31000000-0000-0000-0000-000000000001'
     and version = '01.00.000'),
  '21000000-0000-0000-0000-000000000002',
  'cmd_dataset_assign_team updates the dataset team_id'
);

select is(
  public.cmd_dataset_publish(
    'contacts',
    '31000000-0000-0000-0000-000000000001',
    '01.00.000',
    '{"command":"dataset_publish"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can publish a draft dataset through cmd_dataset_publish'
);

select is(
  public.cmd_dataset_publish(
    'sources',
    '31000000-0000-0000-0000-000000000002',
    '01.00.000',
    '{}'::jsonb
  )->>'code',
  'DATA_UNDER_REVIEW',
  'direct publish is blocked when the dataset is under review'
);

reset role;

select is(
  (select count(*)::text
   from public.command_audit_log
   where command in (
     'cmd_dataset_save_draft',
     'cmd_dataset_assign_team',
     'cmd_dataset_publish'
   )),
  '4',
  'successful dataset commands write command_audit_log entries'
);

select * from finish();
rollback;
