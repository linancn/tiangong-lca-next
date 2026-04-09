begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(3);

alter table public.lifecyclemodels disable trigger "lifecyclemodel_extract_md_trigger_insert";
alter table public.lifecyclemodels disable trigger "lifecyclemodels_extract_text_trigger_insert";
alter table public.processes disable trigger "process_extract_md_trigger_insert";
alter table public.processes disable trigger "process_extract_text_trigger_insert";

insert into public.lifecyclemodels (id, version, user_id, json_ordered, json_tg, rule_verification)
values (
  '95000000-0000-0000-0000-000000000001',
  '01.00.000',
  '95000000-0000-0000-0000-0000000000aa',
  '{
    "lifeCycleModelDataSet": {
      "administrativeInformation": {
        "publicationAndOwnership": {
          "common:dataSetVersion": "01.00.000"
        }
      }
    }
  }'::json,
  '{
    "submodels": [
      {
        "id": "95000000-0000-0000-0000-000000000101",
        "version": "01.00.000"
      },
      {
        "id": "95000000-0000-0000-0000-000000000102",
        "version": "01.00.000"
      }
    ]
  }'::jsonb,
  true
);

insert into public.processes (
  id,
  version,
  user_id,
  model_id,
  json_ordered,
  rule_verification
)
values (
  '95000000-0000-0000-0000-000000000101',
  '01.00.000',
  '95000000-0000-0000-0000-0000000000aa',
  '95000000-0000-0000-0000-000000000001',
  '{
    "processDataSet": {
      "administrativeInformation": {
        "publicationAndOwnership": {
          "common:dataSetVersion": "01.00.000"
        }
      }
    }
  }'::json,
  true
);

select is(
  public.delete_lifecycle_model_bundle(
    '95000000-0000-0000-0000-000000000001',
    '01.00.000'
  )::text,
  jsonb_build_object(
    'model_id', '95000000-0000-0000-0000-000000000001',
    'version', '01.00.000'
  )::text,
  'delete_lifecycle_model_bundle succeeds even when some referenced submodel processes are already missing'
);

select is(
  (
    select count(*)::text
    from public.processes
    where model_id = '95000000-0000-0000-0000-000000000001'
  ),
  '0',
  'delete_lifecycle_model_bundle removes remaining persisted submodel processes'
);

select is(
  (
    select count(*)::text
    from public.lifecyclemodels
    where id = '95000000-0000-0000-0000-000000000001'
      and version = '01.00.000'
  ),
  '0',
  'delete_lifecycle_model_bundle removes the lifecycle model row after tolerant child cleanup'
);

select * from finish();
rollback;
