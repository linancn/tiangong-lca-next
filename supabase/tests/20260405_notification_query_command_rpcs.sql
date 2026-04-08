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
    '91000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'sender@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"91000000-0000-0000-0000-000000000001","email":"sender@example.com","display_name":"Sender User"}'::jsonb,
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
    'recipient@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"91000000-0000-0000-0000-000000000002","email":"recipient@example.com","display_name":"Recipient User"}'::jsonb,
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
    'invitee@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"91000000-0000-0000-0000-000000000003","email":"invitee@example.com","display_name":"Invitee User"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.users (id, raw_user_meta_data)
values
  (
    '91000000-0000-0000-0000-000000000001',
    '{"email":"sender@example.com","display_name":"Sender User"}'::jsonb
  ),
  (
    '91000000-0000-0000-0000-000000000002',
    '{"email":"recipient@example.com","display_name":"Recipient User"}'::jsonb
  ),
  (
    '91000000-0000-0000-0000-000000000003',
    '{"email":"invitee@example.com","display_name":"Invitee User"}'::jsonb
  );

insert into public.teams (id, json, rank, is_public, modified_at)
values (
  '92000000-0000-0000-0000-000000000001',
  '{"title":[{"@xml:lang":"en","#text":"Notification Team"}]}'::jsonb,
  1,
  false,
  now()
);

insert into public.roles (user_id, team_id, role, modified_at)
values (
  '91000000-0000-0000-0000-000000000003',
  '92000000-0000-0000-0000-000000000001',
  'is_invited',
  now() - interval '1 day'
);

alter table public.sources disable trigger "sources_json_sync_trigger";
alter table public.processes disable trigger "processes_json_sync_trigger";
alter table public.processes disable trigger "process_extract_md_trigger_insert";
alter table public.processes disable trigger "process_extract_text_trigger_insert";

insert into public.sources (
  id,
  version,
  json_ordered,
  user_id,
  state_code,
  team_id,
  rule_verification
)
values
  (
    '94000000-0000-0000-0000-000000000011',
    '01.00.000',
    '{
      "sourceDataSet": {
        "sourceInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Target Source Dataset" }
              ]
            }
          }
        }
      }
    }'::jsonb,
    '91000000-0000-0000-0000-000000000002',
    0,
    '92000000-0000-0000-0000-000000000001',
    true
  ),
  (
    '94000000-0000-0000-0000-000000000012',
    '01.00.000',
    '{
      "sourceDataSet": {
        "sourceInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Unreferenced Source Dataset" }
              ]
            }
          }
        }
      }
    }'::jsonb,
    '91000000-0000-0000-0000-000000000002',
    0,
    '92000000-0000-0000-0000-000000000001',
    true
  );

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
  '94000000-0000-0000-0000-000000000010',
  '01.00.000',
  '{
    "processDataSet": {
      "processInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Source Process Dataset" }
            ]
          }
        }
      },
      "exchanges": {
        "exchange": [
          {
            "referencesToDataSource": {
              "referenceToDataSource": {
                "@type": "source data set",
                "@refObjectId": "94000000-0000-0000-0000-000000000011",
                "@version": "01.00.000"
              }
            }
          }
        ]
      }
    }
  }'::jsonb,
  '91000000-0000-0000-0000-000000000001',
  0,
  '92000000-0000-0000-0000-000000000001',
  '94000000-0000-0000-0000-000000000099',
  true
);

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
    '93000000-0000-0000-0000-000000000001',
    '94000000-0000-0000-0000-000000000001',
    '01.00.000',
    -1,
    '["91000000-0000-0000-0000-000000000002"]'::jsonb,
    '{
      "data": {
        "id": "94000000-0000-0000-0000-000000000001",
        "version": "01.00.000",
        "name": {
          "baseName": { "en": "Recent Review" },
          "treatmentStandardsRoutes": { "en": "Route" },
          "mixAndLocationTypes": { "en": "Mix" },
          "functionalUnitFlowProperties": { "en": "Unit" }
        }
      },
      "team": { "name": { "en": "Notification Team" } },
      "user": {
        "id": "91000000-0000-0000-0000-000000000001",
        "name": "Sender User",
        "email": "sender@example.com"
      },
      "comment": { "message": "Need changes" }
    }'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    '93000000-0000-0000-0000-000000000002',
    '94000000-0000-0000-0000-000000000002',
    '02.00.000',
    2,
    '["91000000-0000-0000-0000-000000000002"]'::jsonb,
    '{
      "data": {
        "id": "94000000-0000-0000-0000-000000000002",
        "version": "02.00.000",
        "name": {
          "baseName": { "en": "Old Review" },
          "treatmentStandardsRoutes": { "en": "Route" },
          "mixAndLocationTypes": { "en": "Mix" },
          "functionalUnitFlowProperties": { "en": "Unit" }
        }
      },
      "team": { "name": { "en": "Notification Team" } },
      "user": {
        "id": "91000000-0000-0000-0000-000000000001",
        "name": "Sender User",
        "email": "sender@example.com"
      }
    }'::jsonb,
    now() - interval '10 days',
    now() - interval '10 days'
  );

insert into public.notifications (
  id,
  recipient_user_id,
  sender_user_id,
  type,
  dataset_type,
  dataset_id,
  dataset_version,
  json,
  created_at,
  modified_at
)
values
  (
    '95000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000002',
    'validation_issue',
    'process data set',
    '94000000-0000-0000-0000-000000000003',
    '01.00.000',
    '{"issueCodes":["ruleVerificationFailed"],"senderName":"Recipient User","tabNames":["processInformation"]}'::jsonb,
    now() - interval '1 day',
    now() - interval '1 day'
  ),
  (
    '95000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000003',
    'validation_issue',
    'source data set',
    '94000000-0000-0000-0000-000000000004',
    '02.00.000',
    '{"issueCodes":["sdkInvalid"],"senderName":"Invitee User","tabNames":["modellingAndValidation"]}'::jsonb,
    now() - interval '5 days',
    now() - interval '5 days'
  ),
  (
    '95000000-0000-0000-0000-000000000003',
    '91000000-0000-0000-0000-000000000001',
    '91000000-0000-0000-0000-000000000002',
    'validation_issue',
    'flow data set',
    '94000000-0000-0000-0000-000000000005',
    '03.00.000',
    '{"issueCodes":["underReview"],"senderName":"Recipient User","tabNames":["flows"]}'::jsonb,
    now() - interval '10 days',
    now() - interval '10 days'
  ),
  (
    '95000000-0000-0000-0000-000000000010',
    '91000000-0000-0000-0000-000000000002',
    '91000000-0000-0000-0000-000000000001',
    'validation_issue',
    'source data set',
    '94000000-0000-0000-0000-000000000011',
    '01.00.000',
    '{"issueCodes":["underReview"],"senderName":"Sender User","tabNames":["legacy"]}'::jsonb,
    now() - interval '6 days',
    now() - interval '6 days'
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*)::text from public.qry_notification_get_my_team_items(3)),
  '1',
  'team notification query returns the current user invitation rows'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000003', true);

select is(
  public.qry_notification_get_my_team_count(3, now() - interval '2 days')::text,
  '1',
  'team notification count honors the last-view cutoff'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::text from public.qry_notification_get_my_data_items(1, 10, 3)),
  '1',
  'data notification query filters review rows by actor and time window'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select is(
  public.qry_notification_get_my_data_count(7, now() - interval '2 days')::text,
  '1',
  'data notification count uses last-view cutoff'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select is(
  (select total_count::text from public.qry_notification_get_my_issue_items(1, 10, 7) limit 1),
  '2',
  'issue notification query returns filtered total counts for the recipient'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select is(
  public.qry_notification_get_my_issue_count(30, now() - interval '2 days')::text,
  '1',
  'issue notification count uses last-view cutoff'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

select is(
  (
    public.cmd_notification_send_validation_issue(
      '91000000-0000-0000-0000-000000000002',
      'source data set',
      '94000000-0000-0000-0000-000000000011',
      '01.00.000',
      ' https://example.com/issues/1 ',
      array['ruleVerificationFailed', 'sdkInvalid', 'ruleVerificationFailed', ' '],
      array['processInformation', 'modellingAndValidation', 'processInformation', ' '],
      3,
      '{"source":"pgtap"}'::jsonb
    ) ->> 'ok'
  ),
  'true',
  'notification command writes through the explicit command boundary'
);

select ok(
  (
    select
      json -> 'issueCodes' = '["ruleVerificationFailed","sdkInvalid"]'::jsonb and
      json -> 'tabNames' = '["processInformation","modellingAndValidation"]'::jsonb and
      json ->> 'senderName' = 'Sender User' and
      json ->> 'link' = 'https://example.com/issues/1'
    from public.notifications
    where recipient_user_id = '91000000-0000-0000-0000-000000000002'
      and sender_user_id = '91000000-0000-0000-0000-000000000001'
      and dataset_id = '94000000-0000-0000-0000-000000000011'
      and dataset_version = '01.00.000'
  ),
  'notification command upsert normalizes issue payload and sender metadata'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000002', true);

select is(
  public.qry_notification_get_my_issue_count(30, null::timestamptz)::text,
  '1',
  'recipient-only issue notification query exposes the command-created notification to the recipient'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000001', true);

do $$
begin
  begin
    insert into public.notifications (
      recipient_user_id,
      sender_user_id,
      type,
      dataset_type,
      dataset_id,
      dataset_version,
      json
    )
    values (
      '91000000-0000-0000-0000-000000000002',
      '91000000-0000-0000-0000-000000000001',
      'validation_issue',
      'process data set',
      '94000000-0000-0000-0000-000000000099',
      '01.00.000',
      '{}'::jsonb
    );
  exception
    when others then
      null;
  end;
end;
$$;

select is(
  (
    select count(*)::text
    from public.notifications
    where dataset_id = '94000000-0000-0000-0000-000000000099'
  ),
  '0',
  'authenticated users cannot directly insert notifications rows after command cutover'
);

select is(
  (
    public.cmd_notification_send_validation_issue(
      '91000000-0000-0000-0000-000000000003',
      'source data set',
      '94000000-0000-0000-0000-000000000011',
      '01.00.000',
      null,
      array['ruleVerificationFailed'],
      array['processInformation'],
      1,
      '{}'::jsonb
    ) ->> 'code'
  ),
  'RECIPIENT_NOT_TARGET_OWNER',
  'notification command requires the recipient to match the target dataset owner'
);

select is(
  (
    public.cmd_notification_send_validation_issue(
      '91000000-0000-0000-0000-000000000001',
      'source data set',
      '94000000-0000-0000-0000-000000000011',
      '01.00.000',
      null,
      array['ruleVerificationFailed'],
      array['processInformation'],
      1,
      '{}'::jsonb
    ) ->> 'code'
  ),
  'NOTIFICATION_SELF_TARGET',
  'notification command blocks self-target notifications'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '91000000-0000-0000-0000-000000000003', true);

select is(
  (
    public.cmd_notification_send_validation_issue(
      '91000000-0000-0000-0000-000000000002',
      'source data set',
      '94000000-0000-0000-0000-000000000011',
      '01.00.000',
      null,
      array['ruleVerificationFailed'],
      array['processInformation'],
      1,
      '{}'::jsonb
    ) ->> 'ok'
  ),
  'true',
  'notification command no longer requires the actor to own a source dataset'
);

reset role;

select * from finish();
rollback;
