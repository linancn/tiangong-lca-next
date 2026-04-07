begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(14);

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
    '12000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'review-owner@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"12000000-0000-0000-0000-000000000001","email":"review-owner@example.com","display_name":"Review Owner"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '12000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    'outsider@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"12000000-0000-0000-0000-000000000002","email":"outsider@example.com","display_name":"Outsider"}'::jsonb,
    now(),
    now(),
    false,
    false
  );

insert into public.users (id, raw_user_meta_data)
values
  (
    '12000000-0000-0000-0000-000000000001',
    '{"email":"review-owner@example.com","display_name":"Review Owner"}'::jsonb
  ),
  (
    '12000000-0000-0000-0000-000000000002',
    '{"email":"outsider@example.com","display_name":"Outsider"}'::jsonb
  );

insert into public.teams (id, json, rank, is_public)
values
  ('22000000-0000-0000-0000-000000000001', '{"title":"Review Team"}'::jsonb, 1, false);

insert into public.roles (user_id, team_id, role)
values
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'owner');

alter table public.sources disable trigger "sources_json_sync_trigger";
alter table public.flowproperties disable trigger "flowproperties_json_sync_trigger";
alter table public.flows disable trigger "flows_json_sync_trigger";
alter table public.processes disable trigger "processes_json_sync_trigger";
alter table public.lifecyclemodels disable trigger "lifecyclemodels_json_sync_trigger";

alter table public.processes disable trigger "process_extract_md_trigger_insert";
alter table public.processes disable trigger "process_extract_text_trigger_insert";
alter table public.flows disable trigger "flow_extract_md_trigger_insert";
alter table public.flows disable trigger "flow_extract_text_trigger_insert";
alter table public.lifecyclemodels disable trigger "lifecyclemodel_extract_md_trigger_insert";
alter table public.lifecyclemodels disable trigger "lifecyclemodels_extract_text_trigger_insert";

insert into public.flows (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000001',
  '01.00.000',
  '{
    "flowDataSet": {
      "flowInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Draft Flow" }
            ]
          }
        }
      },
      "flowProperties": {
        "flowProperty": [
          {
            "referenceToFlowPropertyDataSet": {
              "@type": "flow property data set",
              "@refObjectId": "32000000-0000-0000-0000-000000000004",
              "@version": "01.00.000"
            }
          }
        ]
      }
    }
  }'::jsonb,
  '{
    "flowDataSet": {
      "flowInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Draft Flow" }
            ]
          }
        }
      },
      "flowProperties": {
        "flowProperty": [
          {
            "referenceToFlowPropertyDataSet": {
              "@type": "flow property data set",
              "@refObjectId": "32000000-0000-0000-0000-000000000004",
              "@version": "01.00.000"
            }
          }
        ]
      }
    }
  }'::json,
  '12000000-0000-0000-0000-000000000001',
  0,
  '22000000-0000-0000-0000-000000000001',
  true
);

insert into public.flowproperties (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000004',
  '01.00.000',
  '{
    "flowPropertyDataSet": {
      "flowPropertiesInformation": {
        "dataSetInformation": {
          "common:name": [
            { "@xml:lang": "en", "#text": "Draft Flow Property" }
          ]
        }
      }
    }
  }'::jsonb,
  '{
    "flowPropertyDataSet": {
      "flowPropertiesInformation": {
        "dataSetInformation": {
          "common:name": [
            { "@xml:lang": "en", "#text": "Draft Flow Property" }
          ]
        }
      }
    }
  }'::json,
  '12000000-0000-0000-0000-000000000001',
  0,
  '22000000-0000-0000-0000-000000000001',
  true
);

insert into public.sources (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000002',
  '01.00.000',
  '{
    "sourceDataSet": {
      "sourceInformation": {
        "dataSetInformation": {
          "common:shortName": [
            { "@xml:lang": "en", "#text": "Published Source" }
          ]
        }
      }
    }
  }'::jsonb,
  '{
    "sourceDataSet": {
      "sourceInformation": {
        "dataSetInformation": {
          "common:shortName": [
            { "@xml:lang": "en", "#text": "Published Source" }
          ]
        }
      }
    }
  }'::json,
  '12000000-0000-0000-0000-000000000001',
  100,
  '22000000-0000-0000-0000-000000000001',
  true
);

insert into public.processes (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  model_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000003',
  '01.00.000',
  '{
    "processDataSet": {
      "processInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Draft Process" }
            ]
          }
        }
      },
      "exchanges": {
        "exchange": [
          {
            "referenceToFlowDataSet": {
              "@type": "flow data set",
              "@refObjectId": "32000000-0000-0000-0000-000000000001",
              "@version": "01.00.000"
            }
          },
          {
            "referencesToDataSource": {
              "referenceToDataSource": {
                "@type": "source data set",
                "@refObjectId": "32000000-0000-0000-0000-000000000002",
                "@version": "01.00.000"
              }
            }
          }
        ]
      }
    }
  }'::jsonb,
  '{
    "processDataSet": {
      "processInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Draft Process" }
            ]
          }
        }
      },
      "exchanges": {
        "exchange": [
          {
            "referenceToFlowDataSet": {
              "@type": "flow data set",
              "@refObjectId": "32000000-0000-0000-0000-000000000001",
              "@version": "01.00.000"
            }
          },
          {
            "referencesToDataSource": {
              "referenceToDataSource": {
                "@type": "source data set",
                "@refObjectId": "32000000-0000-0000-0000-000000000002",
                "@version": "01.00.000"
              }
            }
          }
        ]
      }
    }
  }'::json,
  '12000000-0000-0000-0000-000000000001',
  0,
  '22000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000001',
  true
);

insert into public.processes (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  model_id,
  rule_verification
)
values
  (
    '32000000-0000-0000-0000-000000000010',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Model Root Process" }
              ]
            }
          }
        }
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Model Root Process" }
              ]
            }
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    0,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000002',
    true
  ),
  (
    '32000000-0000-0000-0000-000000000011',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Secondary Submodel Process" }
              ]
            }
          }
        }
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Secondary Submodel Process" }
              ]
            }
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    0,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000002',
    true
  ),
  (
    '32000000-0000-0000-0000-000000000020',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Under Review Process" }
              ]
            }
          }
        }
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Under Review Process" }
              ]
            }
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000003',
    true
  );

insert into public.lifecyclemodels (
  id,
  version,
  json,
  json_ordered,
  json_tg,
  user_id,
  state_code,
  team_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000010',
  '01.00.000',
  '{
    "lifeCycleModelDataSet": {
      "lifeCycleModelInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Draft Lifecycle Model" }
            ]
          }
        },
        "technology": {
          "processes": {
            "processInstance": [
              {
                "referenceToProcess": {
                  "@type": "process data set",
                  "@refObjectId": "32000000-0000-0000-0000-000000000010",
                  "@version": "01.00.000"
                }
              }
            ]
          }
        }
      }
    }
  }'::jsonb,
  '{
    "lifeCycleModelDataSet": {
      "lifeCycleModelInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Draft Lifecycle Model" }
            ]
          }
        },
        "technology": {
          "processes": {
            "processInstance": [
              {
                "referenceToProcess": {
                  "@type": "process data set",
                  "@refObjectId": "32000000-0000-0000-0000-000000000010",
                  "@version": "01.00.000"
                }
              }
            ]
          }
        }
      }
    }
  }'::json,
  '{
    "submodels": [
      { "id": "32000000-0000-0000-0000-000000000011", "type": "secondary" }
    ]
  }'::jsonb,
  '12000000-0000-0000-0000-000000000001',
  0,
  '22000000-0000-0000-0000-000000000001',
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_review_submit(
    'processes',
    '32000000-0000-0000-0000-000000000003',
    '01.00.000',
    '{"command":"review_submit"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can submit a draft process for review through cmd_review_submit'
);

select is(
  (select state_code::text
   from public.processes
   where id = '32000000-0000-0000-0000-000000000003'
     and version = '01.00.000'),
  '20',
  'cmd_review_submit marks the root dataset under review'
);

select is(
  (select state_code::text
   from public.flows
   where id = '32000000-0000-0000-0000-000000000001'
     and version = '01.00.000'),
  '20',
  'cmd_review_submit marks draft referenced datasets under review'
);

select is(
  (select state_code::text
   from public.flowproperties
   where id = '32000000-0000-0000-0000-000000000004'
     and version = '01.00.000'),
  '20',
  'cmd_review_submit marks referenced flow properties under review'
);

select is(
  (select state_code::text
   from public.sources
   where id = '32000000-0000-0000-0000-000000000002'
     and version = '01.00.000'),
  '100',
  'cmd_review_submit leaves already published references unchanged'
);

select is(
  (select count(*)::text
   from public.reviews
   where data_id = '32000000-0000-0000-0000-000000000003'
     and data_version = '01.00.000'),
  '1',
  'cmd_review_submit creates one review row for the root dataset'
);

select ok(
  exists(
    select 1
    from public.reviews
    where data_id = '32000000-0000-0000-0000-000000000003'
      and data_version = '01.00.000'
      and json->'user'->>'id' = '12000000-0000-0000-0000-000000000001'
      and json->'team'->>'id' = '22000000-0000-0000-0000-000000000001'
  ),
  'cmd_review_submit records review json metadata for the submitter and team'
);

reset role;

select ok(
  exists(
    select 1
    from public.command_audit_log
    where command = 'cmd_review_submit'
      and target_id = '32000000-0000-0000-0000-000000000003'
      and target_version = '01.00.000'
  ),
  'cmd_review_submit writes a command audit log entry'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_review_submit(
    'lifecyclemodels',
    '32000000-0000-0000-0000-000000000010',
    '01.00.000',
    '{"command":"review_submit"}'::jsonb
  )->>'ok',
  'true',
  'dataset owner can submit a lifecycle model and its linked draft processes for review'
);

select is(
  (select state_code::text
   from public.lifecyclemodels
   where id = '32000000-0000-0000-0000-000000000010'
     and version = '01.00.000'),
  '20',
  'cmd_review_submit marks the root lifecycle model under review'
);

select ok(
  (
    select count(*)
    from public.processes
    where id in (
      '32000000-0000-0000-0000-000000000010',
      '32000000-0000-0000-0000-000000000011'
    )
      and version = '01.00.000'
      and state_code = 20
  ) = 2,
  'cmd_review_submit promotes linked lifecycle model process rows into under-review state'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000002', true);

select is(
  public.cmd_review_submit(
    'processes',
    '32000000-0000-0000-0000-000000000003',
    '01.00.000',
    '{}'::jsonb
  )->>'code',
  'DATASET_OWNER_REQUIRED',
  'non-owners cannot submit another user''s dataset for review'
);

reset role;

insert into public.flows (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000021',
  '01.00.000',
  '{
    "flowDataSet": {
      "flowInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Under Review Flow" }
            ]
          }
        }
      }
    }
  }'::jsonb,
  '{
    "flowDataSet": {
      "flowInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Under Review Flow" }
            ]
          }
        }
      }
    }
  }'::json,
  '12000000-0000-0000-0000-000000000001',
  20,
  '22000000-0000-0000-0000-000000000001',
  true
);

insert into public.processes (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  model_id,
  rule_verification
)
values (
  '32000000-0000-0000-0000-000000000022',
  '01.00.000',
  '{
    "processDataSet": {
      "processInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Blocked Process" }
            ]
          }
        }
      },
      "exchanges": {
        "exchange": [
          {
            "referenceToFlowDataSet": {
              "@type": "flow data set",
              "@refObjectId": "32000000-0000-0000-0000-000000000021",
              "@version": "01.00.000"
            }
          }
        ]
      }
    }
  }'::jsonb,
  '{
    "processDataSet": {
      "processInformation": {
        "dataSetInformation": {
          "name": {
            "baseName": [
              { "@xml:lang": "en", "#text": "Blocked Process" }
            ]
          }
        }
      },
      "exchanges": {
        "exchange": [
          {
            "referenceToFlowDataSet": {
              "@type": "flow data set",
              "@refObjectId": "32000000-0000-0000-0000-000000000021",
              "@version": "01.00.000"
            }
          }
        ]
      }
    }
  }'::json,
  '12000000-0000-0000-0000-000000000001',
  0,
  '22000000-0000-0000-0000-000000000001',
  '42000000-0000-0000-0000-000000000004',
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000001', true);

select is(
  public.cmd_review_submit(
    'processes',
    '32000000-0000-0000-0000-000000000022',
    '01.00.000',
    '{}'::jsonb
  )->>'code',
  'REFERENCED_DATA_UNDER_REVIEW',
  'review submission is blocked when a referenced dataset is already under review'
);

select is(
  (select count(*)::text
   from public.reviews
   where data_id = '32000000-0000-0000-0000-000000000022'
     and data_version = '01.00.000'),
  '0',
  'blocked review submission does not create a review row'
);

select * from finish();
rollback;
