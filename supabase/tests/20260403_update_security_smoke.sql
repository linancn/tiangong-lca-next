begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(8);

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
    '10000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'team-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"10000000-0000-0000-0000-000000000001","email":"team-admin@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'dataset-owner@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"10000000-0000-0000-0000-000000000002","email":"dataset-owner@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    'reviewer-a@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"10000000-0000-0000-0000-000000000003","email":"reviewer-a@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    'reviewer-b@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"10000000-0000-0000-0000-000000000004","email":"reviewer-b@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000005',
    'authenticated',
    'authenticated',
    'review-submitter@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"10000000-0000-0000-0000-000000000005","email":"review-submitter@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-0000-0000-000000000006',
    'authenticated',
    'authenticated',
    'outsider@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"10000000-0000-0000-0000-000000000006","email":"outsider@example.com"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.teams (id, json, rank, is_public)
values
  ('20000000-0000-0000-0000-000000000001', '{"name":"Team A"}'::jsonb, 1, false),
  ('20000000-0000-0000-0000-000000000002', '{"name":"Team B"}'::jsonb, 2, false),
  ('00000000-0000-0000-0000-000000000000', '{"name":"System Team"}'::jsonb, 0, false);

insert into public.users (id, raw_user_meta_data, contact)
values
  (
    '10000000-0000-0000-0000-000000000001',
    '{"email":"team-admin@example.com"}'::jsonb,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '{"email":"dataset-owner@example.com"}'::jsonb,
    null
  ),
  (
    '10000000-0000-0000-0000-000000000006',
    '{"email":"outsider@example.com"}'::jsonb,
    null
  );

insert into public.roles (user_id, team_id, role)
values
  ('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'admin'),
  ('10000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'owner'),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'review-member');

insert into public.contacts (id, version, json_ordered, user_id, state_code, team_id)
values (
  '30000000-0000-0000-0000-000000000001',
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
      "name": "draft-a"
    }
  }'::json,
  '10000000-0000-0000-0000-000000000002',
  0,
  '20000000-0000-0000-0000-000000000001'
);

insert into public.reviews (id, data_id, data_version, reviewer_id, json, state_code)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    '01.00.000',
    '["10000000-0000-0000-0000-000000000003"]'::jsonb,
    '{
      "user": { "id": "10000000-0000-0000-0000-000000000005" },
      "data": { "id": "30000000-0000-0000-0000-000000000001", "version": "01.00.000" }
    }'::jsonb,
    0
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '01.00.000',
    '["10000000-0000-0000-0000-000000000003"]'::jsonb,
    '{
      "user": { "id": "10000000-0000-0000-0000-000000000005" },
      "data": { "id": "30000000-0000-0000-0000-000000000001", "version": "01.00.000" }
    }'::jsonb,
    0
  );

insert into public.comments (review_id, reviewer_id, json, state_code)
values (
  '40000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000003',
  '{"comment":"reviewer-a draft"}'::json,
  0
);

insert into public.notifications (
  id,
  recipient_user_id,
  sender_user_id,
  type,
  dataset_type,
  dataset_id,
  dataset_version,
  json
)
values (
  '50000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000001',
  'validation_issue',
  'contacts',
  '30000000-0000-0000-0000-000000000001',
  '01.00.000',
  '{"message":"check ownership"}'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

do $$
begin
  begin
    update public.teams
    set rank = 99
    where id = '20000000-0000-0000-0000-000000000002';
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select is(
  (select rank::text from public.teams where id = '20000000-0000-0000-0000-000000000002'),
  '2',
  'team-a admin cannot update team-b'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

do $$
begin
  begin
    update public.comments
    set reviewer_id = '10000000-0000-0000-0000-000000000004'
    where review_id = '40000000-0000-0000-0000-000000000001'
      and reviewer_id = '10000000-0000-0000-0000-000000000003';
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select ok(
  exists (
    select 1
    from public.comments
    where review_id = '40000000-0000-0000-0000-000000000001'
      and reviewer_id = '10000000-0000-0000-0000-000000000003'
  )
  and not exists (
    select 1
    from public.comments
    where review_id = '40000000-0000-0000-0000-000000000001'
      and reviewer_id = '10000000-0000-0000-0000-000000000004'
  ),
  'reviewer cannot transfer comment ownership to another reviewer'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

do $$
begin
  begin
    update public.reviews
    set state_code = 2
    where id = '40000000-0000-0000-0000-000000000001';
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select is(
  (select state_code::text from public.reviews where id = '40000000-0000-0000-0000-000000000001'),
  '0',
  'assigned reviewer cannot directly update review workflow row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

update public.contacts
set json_ordered = '{
  "contactDataSet": {
    "administrativeInformation": {
      "publicationAndOwnership": {
        "common:dataSetVersion": "01.00.000"
      }
    }
  },
  "payload": {
    "name": "draft-b"
  }
}'::json
where id = '30000000-0000-0000-0000-000000000001'
  and version = '01.00.000';

reset role;

select is(
  (select jsonb_extract_path_text(json, 'payload', 'name') from public.contacts where id = '30000000-0000-0000-0000-000000000001' and version = '01.00.000'),
  'draft-b',
  'draft owner can directly update own draft dataset during transition window'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);

do $$
begin
  begin
    update public.reviews
    set state_code = 1
    where id = '40000000-0000-0000-0000-000000000002';
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select is(
  (select state_code::text from public.reviews where id = '40000000-0000-0000-0000-000000000002'),
  '0',
  'non-submitter cannot directly update reviews row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);

do $$
begin
  begin
    delete from public.notifications
    where id = '50000000-0000-0000-0000-000000000001';
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select is(
  (select count(*)::text from public.notifications where id = '50000000-0000-0000-0000-000000000001'),
  '1',
  'arbitrary user cannot delete notification row'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000006', true);

do $$
begin
  begin
    insert into public.roles (user_id, team_id, role)
    values (
      '10000000-0000-0000-0000-000000000006',
      '20000000-0000-0000-0000-000000000001',
      'member'
    );
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select is(
  (
    select count(*)::text
    from public.roles
    where user_id = '10000000-0000-0000-0000-000000000006'
      and team_id = '20000000-0000-0000-0000-000000000001'
  ),
  '0',
  'authenticated user cannot directly insert roles rows'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

do $$
begin
  begin
    update public.users
    set contact = '{"phone":"13800000000"}'::jsonb
    where id = '10000000-0000-0000-0000-000000000002';
  exception
    when others then
      null;
  end;
end;
$$;

reset role;

select is(
  (
    select coalesce(contact::text, 'null')
    from public.users
    where id = '10000000-0000-0000-0000-000000000002'
  ),
  'null',
  'authenticated user cannot directly update users rows'
);

select * from finish();
rollback;
