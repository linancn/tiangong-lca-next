begin;

create extension if not exists pgtap with schema extensions;
set local search_path = extensions, public, auth;

select plan(44);

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
    '12000000-0000-0000-0000-000000000010',
    'authenticated',
    'authenticated',
    'review-admin@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"12000000-0000-0000-0000-000000000010","email":"review-admin@example.com","display_name":"Review Admin"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '12000000-0000-0000-0000-000000000011',
    'authenticated',
    'authenticated',
    'reviewer-one@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"12000000-0000-0000-0000-000000000011","email":"reviewer-one@example.com","display_name":"Reviewer One"}'::jsonb,
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '12000000-0000-0000-0000-000000000012',
    'authenticated',
    'authenticated',
    'reviewer-two@example.com',
    'test-password-hash',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"sub":"12000000-0000-0000-0000-000000000012","email":"reviewer-two@example.com","display_name":"Reviewer Two"}'::jsonb,
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
    '12000000-0000-0000-0000-000000000010',
    '{"email":"review-admin@example.com","display_name":"Review Admin"}'::jsonb
  ),
  (
    '12000000-0000-0000-0000-000000000011',
    '{"email":"reviewer-one@example.com","display_name":"Reviewer One"}'::jsonb
  ),
  (
    '12000000-0000-0000-0000-000000000012',
    '{"email":"reviewer-two@example.com","display_name":"Reviewer Two"}'::jsonb
  );

insert into public.teams (id, json, rank, is_public)
values
  ('22000000-0000-0000-0000-000000000001', '{"title":"Review Team"}'::jsonb, 1, false);

insert into public.roles (user_id, team_id, role)
values
  ('12000000-0000-0000-0000-000000000001', '22000000-0000-0000-0000-000000000001', 'owner'),
  ('12000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000000', 'review-admin'),
  ('12000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000000', 'review-member'),
  ('12000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000000', 'review-member');

alter table public.sources disable trigger "sources_json_sync_trigger";
alter table public.flows disable trigger "flows_json_sync_trigger";
alter table public.processes disable trigger "processes_json_sync_trigger";
alter table public.lifecyclemodels disable trigger "lifecyclemodels_json_sync_trigger";

alter table public.processes disable trigger "process_extract_md_trigger_insert";
alter table public.processes disable trigger "process_extract_md_trigger_update";
alter table public.processes disable trigger "process_extract_text_trigger_insert";
alter table public.processes disable trigger "process_extract_text_trigger_update";
alter table public.flows disable trigger "flow_extract_md_trigger_insert";
alter table public.flows disable trigger "flow_extract_md_trigger_update";
alter table public.flows disable trigger "flow_extract_text_trigger_insert";
alter table public.flows disable trigger "flow_extract_text_trigger_update";
alter table public.lifecyclemodels disable trigger "lifecyclemodel_extract_md_trigger_insert";
alter table public.lifecyclemodels disable trigger "lifecyclemodel_extract_md_trigger_update";
alter table public.lifecyclemodels disable trigger "lifecyclemodels_extract_text_trigger_insert";
alter table public.lifecyclemodels disable trigger "lifecyclemodels_extract_text_trigger_update";

insert into public.flows (
  id,
  version,
  json,
  json_ordered,
  user_id,
  state_code,
  team_id,
  rule_verification,
  reviews
)
values
  (
    '32000000-0000-0000-0000-000000000212',
    '01.00.000',
    '{
      "flowDataSet": {
        "flowInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Comment Draft Flow" }
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
                { "@xml:lang": "en", "#text": "Comment Draft Flow" }
              ]
            }
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    0,
    '22000000-0000-0000-0000-000000000001',
    true,
    '[]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000213',
    '01.00.000',
    '{
      "flowDataSet": {
        "flowInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Approve Flow" }
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
                { "@xml:lang": "en", "#text": "Approve Flow" }
              ]
            }
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000203"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000214',
    '01.00.000',
    '{
      "flowDataSet": {
        "flowInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Reject Flow" }
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
                { "@xml:lang": "en", "#text": "Reject Flow" }
              ]
            }
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000204"}]'::jsonb
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
  rule_verification,
  reviews
)
values
  (
    '32000000-0000-0000-0000-000000000201',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Assignment Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Assignment Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    0,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000201',
    true,
    '[]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000202',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Comment Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Comment Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000202',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000202"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000203',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Approve Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": {
            "review": [
              {
                "common:scope": [
                  {
                    "@name": "Existing process review",
                    "common:method": { "@name": "Existing process method" }
                  }
                ]
              }
            ]
          },
          "complianceDeclarations": {
            "compliance": [
              { "common:approvalOfOverallCompliance": "Existing process compliance" }
            ]
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
                { "@xml:lang": "en", "#text": "Approve Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": {
            "review": [
              {
                "common:scope": [
                  {
                    "@name": "Existing process review",
                    "common:method": { "@name": "Existing process method" }
                  }
                ]
              }
            ]
          },
          "complianceDeclarations": {
            "compliance": [
              { "common:approvalOfOverallCompliance": "Existing process compliance" }
            ]
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000203',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000203"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000204',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Reject Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Reject Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000204',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000204"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000205',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Sparse Approve Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {}
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Sparse Approve Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {}
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000205',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000205"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000301',
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
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
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
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000301',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000301"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000302',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Model Secondary Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": {
            "review": [
              {
                "common:scope": [
                  {
                    "@name": "Old submodel review",
                    "common:method": { "@name": "Old submodel method" }
                  }
                ]
              }
            ]
          },
          "complianceDeclarations": {
            "compliance": [
              { "common:approvalOfOverallCompliance": "Old submodel compliance" }
            ]
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
                { "@xml:lang": "en", "#text": "Model Secondary Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {
          "validation": {
            "review": [
              {
                "common:scope": [
                  {
                    "@name": "Old submodel review",
                    "common:method": { "@name": "Old submodel method" }
                  }
                ]
              }
            ]
          },
          "complianceDeclarations": {
            "compliance": [
              { "common:approvalOfOverallCompliance": "Old submodel compliance" }
            ]
          }
        }
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000302',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000301"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000305',
    '01.00.000',
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Sparse Model Secondary Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {}
      }
    }'::jsonb,
    '{
      "processDataSet": {
        "processInformation": {
          "dataSetInformation": {
            "name": {
              "baseName": [
                { "@xml:lang": "en", "#text": "Sparse Model Secondary Process" }
              ]
            }
          }
        },
        "modellingAndValidation": {}
      }
    }'::json,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    '42000000-0000-0000-0000-000000000305',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000304"}]'::jsonb
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
  rule_verification,
  reviews
)
values
  (
    '32000000-0000-0000-0000-000000000301',
    '01.00.000',
    '{
      "lifeCycleModelDataSet": {
        "lifeCycleModelInformation": {
          "dataSetInformation": {
            "name": [
              { "@xml:lang": "en", "#text": "Approve Model" }
            ]
          }
        },
        "modellingAndValidation": {
          "validation": {
            "review": [
              {
                "common:scope": [
                  {
                    "@name": "Existing model review",
                    "common:method": { "@name": "Existing model method" }
                  }
                ]
              }
            ]
          },
          "complianceDeclarations": {
            "compliance": [
              { "common:approvalOfOverallCompliance": "Existing model compliance" }
            ]
          }
        }
      }
    }'::jsonb,
    '{
      "lifeCycleModelDataSet": {
        "lifeCycleModelInformation": {
          "dataSetInformation": {
            "name": [
              { "@xml:lang": "en", "#text": "Approve Model" }
            ]
          }
        },
        "modellingAndValidation": {
          "validation": {
            "review": [
              {
                "common:scope": [
                  {
                    "@name": "Existing model review",
                    "common:method": { "@name": "Existing model method" }
                  }
                ]
              }
            ]
          },
          "complianceDeclarations": {
            "compliance": [
              { "common:approvalOfOverallCompliance": "Existing model compliance" }
            ]
          }
        }
      }
    }'::json,
    '{
      "submodels": [
        { "id": "32000000-0000-0000-0000-000000000302", "type": "secondary" }
      ]
    }'::jsonb,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000301"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000303',
    '01.00.000',
    '{
      "lifeCycleModelDataSet": {
        "lifeCycleModelInformation": {
          "dataSetInformation": {
            "name": [
              { "@xml:lang": "en", "#text": "Broken Model" }
            ]
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::jsonb,
    '{
      "lifeCycleModelDataSet": {
        "lifeCycleModelInformation": {
          "dataSetInformation": {
            "name": [
              { "@xml:lang": "en", "#text": "Broken Model" }
            ]
          }
        },
        "modellingAndValidation": {
          "validation": { "review": [] },
          "complianceDeclarations": { "compliance": [] }
        }
      }
    }'::json,
    '{
      "submodels": [
        { "id": "32000000-0000-0000-0000-000000000304", "type": "secondary" }
      ]
    }'::jsonb,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000303"}]'::jsonb
  ),
  (
    '32000000-0000-0000-0000-000000000304',
    '01.00.000',
    '{
      "lifeCycleModelDataSet": {
        "lifeCycleModelInformation": {
          "dataSetInformation": {
            "name": [
              { "@xml:lang": "en", "#text": "Sparse Approve Model" }
            ]
          }
        },
        "modellingAndValidation": {}
      }
    }'::jsonb,
    '{
      "lifeCycleModelDataSet": {
        "lifeCycleModelInformation": {
          "dataSetInformation": {
            "name": [
              { "@xml:lang": "en", "#text": "Sparse Approve Model" }
            ]
          }
        },
        "modellingAndValidation": {}
      }
    }'::json,
    '{
      "submodels": [
        { "id": "32000000-0000-0000-0000-000000000305", "type": "secondary" }
      ]
    }'::jsonb,
    '12000000-0000-0000-0000-000000000001',
    20,
    '22000000-0000-0000-0000-000000000001',
    true,
    '[{"key":0,"id":"53000000-0000-0000-0000-000000000304"}]'::jsonb
  );

insert into public.reviews (
  id,
  data_id,
  data_version,
  state_code,
  reviewer_id,
  json
)
values
  (
    '53000000-0000-0000-0000-000000000201',
    '32000000-0000-0000-0000-000000000201',
    '01.00.000',
    0,
    '[]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000201", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000202',
    '32000000-0000-0000-0000-000000000202',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000202", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000203',
    '32000000-0000-0000-0000-000000000203',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000203", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000204',
    '32000000-0000-0000-0000-000000000204',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000204", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000205',
    '32000000-0000-0000-0000-000000000205',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000205", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000301',
    '32000000-0000-0000-0000-000000000301',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000301", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000303',
    '32000000-0000-0000-0000-000000000303',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000303", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  ),
  (
    '53000000-0000-0000-0000-000000000304',
    '32000000-0000-0000-0000-000000000304',
    '01.00.000',
    1,
    '["12000000-0000-0000-0000-000000000011"]'::jsonb,
    '{
      "data": { "id": "32000000-0000-0000-0000-000000000304", "version": "01.00.000" },
      "team": { "id": "22000000-0000-0000-0000-000000000001", "name": "Review Team" },
      "user": { "id": "12000000-0000-0000-0000-000000000001", "name": "Review Owner", "email": "review-owner@example.com" },
      "comment": { "message": "" },
      "logs": []
    }'::jsonb
  );

insert into public.comments (
  review_id,
  reviewer_id,
  json,
  state_code
)
values
  (
    '53000000-0000-0000-0000-000000000202',
    '12000000-0000-0000-0000-000000000011',
    '{}'::json,
    0
  ),
  (
    '53000000-0000-0000-0000-000000000203',
    '12000000-0000-0000-0000-000000000011',
    '{
      "modellingAndValidation": {
        "validation": {
          "reviewerValidationMarker": "Reviewer process validation marker",
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer process scope",
                  "common:method": { "@name": "Reviewer process method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "reviewerComplianceMarker": "Reviewer process compliance marker",
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer process compliance" }
          ]
        }
      }
    }'::json,
    1
  ),
  (
    '53000000-0000-0000-0000-000000000204',
    '12000000-0000-0000-0000-000000000011',
    '{
      "modellingAndValidation": {
        "validation": {
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer reject scope",
                  "common:method": { "@name": "Reviewer reject method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer reject compliance" }
          ]
        }
      }
    }'::json,
    1
  ),
  (
    '53000000-0000-0000-0000-000000000205',
    '12000000-0000-0000-0000-000000000011',
    '{
      "modellingAndValidation": {
        "validation": {
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer sparse process scope",
                  "common:method": { "@name": "Reviewer sparse process method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer sparse process compliance" }
          ]
        }
      }
    }'::json,
    1
  ),
  (
    '53000000-0000-0000-0000-000000000301',
    '12000000-0000-0000-0000-000000000011',
    '{
      "modellingAndValidation": {
        "validation": {
          "reviewerValidationMarker": "Reviewer model validation marker",
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer model scope",
                  "common:method": { "@name": "Reviewer model method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "reviewerComplianceMarker": "Reviewer model compliance marker",
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer model compliance" }
          ]
        }
      }
    }'::json,
    1
  ),
  (
    '53000000-0000-0000-0000-000000000303',
    '12000000-0000-0000-0000-000000000011',
    '{
      "modellingAndValidation": {
        "validation": {
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Broken model scope",
                  "common:method": { "@name": "Broken model method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "compliance": [
            { "common:approvalOfOverallCompliance": "Broken model compliance" }
          ]
        }
      }
    }'::json,
    1
  ),
  (
    '53000000-0000-0000-0000-000000000304',
    '12000000-0000-0000-0000-000000000011',
    '{
      "modellingAndValidation": {
        "validation": {
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer sparse model scope",
                  "common:method": { "@name": "Reviewer sparse model method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer sparse model compliance" }
          ]
        }
      }
    }'::json,
    1
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000010', true);

select is(
  public.cmd_review_save_assignment_draft(
    '53000000-0000-0000-0000-000000000201',
    '["12000000-0000-0000-0000-000000000011","12000000-0000-0000-0000-000000000012"]'::jsonb,
    '{"command":"review_save_assignment_draft"}'::jsonb
  )->>'ok',
  'true',
  'review admin can temporary-save reviewer assignments'
);

select is(
  (select reviewer_id::text from public.reviews where id = '53000000-0000-0000-0000-000000000201'),
  '["12000000-0000-0000-0000-000000000011", "12000000-0000-0000-0000-000000000012"]',
  'temporary assignment draft updates review.reviewer_id'
);

select is(
  public.cmd_review_assign_reviewers(
    '53000000-0000-0000-0000-000000000201',
    '["12000000-0000-0000-0000-000000000011","12000000-0000-0000-0000-000000000012"]'::jsonb,
    '2026-05-01T00:00:00Z'::timestamptz,
    '{"command":"review_assign_reviewers"}'::jsonb
  )->>'ok',
  'true',
  'review admin can finalize reviewer assignment'
);

select is(
  (select state_code::text from public.reviews where id = '53000000-0000-0000-0000-000000000201'),
  '1',
  'assigning reviewers moves the review into assigned state'
);

select is(
  (select count(*)::text from public.comments where review_id = '53000000-0000-0000-0000-000000000201' and state_code = 0),
  '2',
  'assigning reviewers creates draft comment rows for each reviewer'
);

select is(
  public.cmd_review_revoke_reviewer(
    '53000000-0000-0000-0000-000000000201',
    '12000000-0000-0000-0000-000000000012',
    '{"command":"review_revoke_reviewer"}'::jsonb
  )->>'ok',
  'true',
  'review admin can revoke an assigned reviewer'
);

select is(
  (select state_code::text from public.comments where review_id = '53000000-0000-0000-0000-000000000201' and reviewer_id = '12000000-0000-0000-0000-000000000012'),
  '-2',
  'revoking a reviewer marks their comment row as revoked'
);

select is(
  (select reviewer_id::text from public.reviews where id = '53000000-0000-0000-0000-000000000201'),
  '["12000000-0000-0000-0000-000000000011"]',
  'revoking a reviewer removes them from review.reviewer_id'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000011', true);

select is(
  public.cmd_review_save_comment_draft(
    '53000000-0000-0000-0000-000000000202',
    '{
      "modellingAndValidation": {
        "validation": {
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer draft scope",
                  "common:method": { "@name": "Reviewer draft method" }
                }
              ]
            }
          ]
        },
        "complianceDeclarations": {
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer draft compliance" }
          ]
        }
      }
    }'::jsonb,
    '{"command":"review_save_comment_draft"}'::jsonb
  )->>'ok',
  'true',
  'assigned reviewer can temporarily save review comments'
);

select is(
  (select state_code::text from public.reviews where id = '53000000-0000-0000-0000-000000000202'),
  '1',
  'saving a reviewer draft does not change the review state'
);

select is(
  (select reviewer_id::text from public.comments where review_id = '53000000-0000-0000-0000-000000000202' and reviewer_id = '12000000-0000-0000-0000-000000000011'),
  '12000000-0000-0000-0000-000000000011',
  'saving a reviewer draft does not change comment.reviewer_id'
);

select is(
  public.cmd_review_submit_comment(
    '53000000-0000-0000-0000-000000000202',
    '{
      "modellingAndValidation": {
        "validation": {
          "review": [
            {
              "common:scope": [
                {
                  "@name": "Reviewer submitted scope",
                  "common:method": { "@name": "Reviewer submitted method" }
                }
              ],
              "common:referenceToReviewDetails": {
                "@type": "flow data set",
                "@refObjectId": "32000000-0000-0000-0000-000000000212",
                "@version": "01.00.000"
              }
            }
          ]
        },
        "complianceDeclarations": {
          "compliance": [
            { "common:approvalOfOverallCompliance": "Reviewer submitted compliance" }
          ]
        }
      }
    }'::jsonb,
    '{"command":"review_submit_comment"}'::jsonb
  )->>'ok',
  'true',
  'assigned reviewer can submit review comments through one command'
);

select is(
  (select state_code::text from public.flows where id = '32000000-0000-0000-0000-000000000212' and version = '01.00.000'),
  '20',
  'submitting a reviewer comment promotes referenced draft data to under-review state'
);

select is(
  (select state_code::text from public.comments where review_id = '53000000-0000-0000-0000-000000000202' and reviewer_id = '12000000-0000-0000-0000-000000000011'),
  '1',
  'submitting a reviewer comment moves the reviewer comment row to submitted state'
);

reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', '12000000-0000-0000-0000-000000000010', true);

select is(
  public.cmd_review_approve(
    'processes',
    '53000000-0000-0000-0000-000000000203',
    '{"command":"review_approve"}'::jsonb
  )->>'ok',
  'true',
  'review admin can approve a process review in one command'
);

select is(
  (select state_code::text from public.processes where id = '32000000-0000-0000-0000-000000000203' and version = '01.00.000'),
  '100',
  'approving a process review publishes the root dataset'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,review,1,common:scope,0,@name}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000203'
     and version = '01.00.000'),
  'Reviewer process scope',
  'approving a process review merges reviewer validation content into the root process'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,complianceDeclarations,compliance,1,common:approvalOfOverallCompliance}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000203'
     and version = '01.00.000'),
  'Reviewer process compliance',
  'approving a process review merges reviewer compliance content into the root process'
);

select is(
  (select coalesce(
     json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,reviewerValidationMarker}',
     '__missing__'
   )
   from public.processes
   where id = '32000000-0000-0000-0000-000000000203'
     and version = '01.00.000'),
  '__missing__',
  'approving a process review does not merge validation-level object fields into the root process'
);

select is(
  (select coalesce(
     json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,complianceDeclarations,reviewerComplianceMarker}',
     '__missing__'
   )
   from public.processes
   where id = '32000000-0000-0000-0000-000000000203'
     and version = '01.00.000'),
  '__missing__',
  'approving a process review does not merge complianceDeclarations-level object fields into the root process'
);

select is(
  public.cmd_review_approve(
    'processes',
    '53000000-0000-0000-0000-000000000205',
    '{"command":"review_approve"}'::jsonb
  )->>'ok',
  'true',
  'review admin can approve a sparse process review when review and compliance fields are missing'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,review,0,common:scope,0,@name}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000205'
     and version = '01.00.000'),
  'Reviewer sparse process scope',
  'approving a sparse process review creates the missing validation.review field before merging comment content'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,complianceDeclarations,compliance,0,common:approvalOfOverallCompliance}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000205'
     and version = '01.00.000'),
  'Reviewer sparse process compliance',
  'approving a sparse process review creates the missing complianceDeclarations.compliance field before merging comment content'
);

select is(
  public.cmd_review_reject(
    'processes',
    '53000000-0000-0000-0000-000000000204',
    'Needs more evidence',
    '{"command":"review_reject"}'::jsonb
  )->>'ok',
  'true',
  'review admin can reject a review in one command'
);

select is(
  (select state_code::text from public.processes where id = '32000000-0000-0000-0000-000000000204' and version = '01.00.000'),
  '0',
  'rejecting a review rolls the root dataset back to draft state'
);

select is(
  (select state_code::text from public.reviews where id = '53000000-0000-0000-0000-000000000204'),
  '-1',
  'rejecting a review marks the review row as rejected'
);

select is(
  public.cmd_review_approve(
    'lifecyclemodels',
    '53000000-0000-0000-0000-000000000301',
    '{"command":"review_approve"}'::jsonb
  )->>'ok',
  'true',
  'review admin can approve a lifecycle model review in one command'
);

select is(
  (select json_ordered::jsonb #>> '{lifeCycleModelDataSet,modellingAndValidation,validation,review,1,common:scope,0,@name}'
   from public.lifecyclemodels
   where id = '32000000-0000-0000-0000-000000000301'
     and version = '01.00.000'),
  'Reviewer model scope',
  'approving a lifecycle model review merges reviewer validation content into the root lifecycle model'
);

select is(
  (select json_ordered::jsonb #>> '{lifeCycleModelDataSet,modellingAndValidation,complianceDeclarations,compliance,1,common:approvalOfOverallCompliance}'
   from public.lifecyclemodels
   where id = '32000000-0000-0000-0000-000000000301'
     and version = '01.00.000'),
  'Reviewer model compliance',
  'approving a lifecycle model review merges reviewer compliance content into the root lifecycle model'
);

select is(
  (select state_code::text from public.processes where id = '32000000-0000-0000-0000-000000000302' and version = '01.00.000'),
  '100',
  'approving a lifecycle model review publishes linked secondary processes'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,review,1,common:scope,0,@name}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000302'
     and version = '01.00.000'),
  'Reviewer model scope',
  'approving a lifecycle model review pushes reviewer validation content into submodel processes'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,review,0,common:scope,0,@name}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000302'
     and version = '01.00.000'),
  'Old submodel review',
  'approving a lifecycle model review keeps existing submodel validation content before appending reviewer review content'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,complianceDeclarations,compliance,1,common:approvalOfOverallCompliance}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000302'
     and version = '01.00.000'),
  'Reviewer model compliance',
  'approving a lifecycle model review merges reviewer compliance content into submodel processes'
);

select is(
  (select jsonb_array_length(json_ordered::jsonb #> '{processDataSet,modellingAndValidation,validation,review}')::text
   from public.processes
   where id = '32000000-0000-0000-0000-000000000302'
     and version = '01.00.000'),
  '2',
  'approving a lifecycle model review does not duplicate reviewer validation entries in submodel processes'
);

select is(
  (select coalesce(
     json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,reviewerValidationMarker}',
     '__missing__'
   )
   from public.processes
   where id = '32000000-0000-0000-0000-000000000302'
     and version = '01.00.000'),
  '__missing__',
  'approving a lifecycle model review does not merge validation-level object fields into submodel processes'
);

select is(
  (select coalesce(
     json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,complianceDeclarations,reviewerComplianceMarker}',
     '__missing__'
   )
   from public.processes
   where id = '32000000-0000-0000-0000-000000000302'
     and version = '01.00.000'),
  '__missing__',
  'approving a lifecycle model review does not merge complianceDeclarations-level object fields into submodel processes'
);

select is(
  public.cmd_review_approve(
    'lifecyclemodels',
    '53000000-0000-0000-0000-000000000304',
    '{"command":"review_approve"}'::jsonb
  )->>'ok',
  'true',
  'review admin can approve a sparse lifecycle model review when review and compliance fields are missing'
);

select is(
  (select json_ordered::jsonb #>> '{lifeCycleModelDataSet,modellingAndValidation,validation,review,0,common:scope,0,@name}'
   from public.lifecyclemodels
   where id = '32000000-0000-0000-0000-000000000304'
     and version = '01.00.000'),
  'Reviewer sparse model scope',
  'approving a sparse lifecycle model review creates the missing model validation.review field before merging comment content'
);

select is(
  (select json_ordered::jsonb #>> '{lifeCycleModelDataSet,modellingAndValidation,complianceDeclarations,compliance,0,common:approvalOfOverallCompliance}'
   from public.lifecyclemodels
   where id = '32000000-0000-0000-0000-000000000304'
     and version = '01.00.000'),
  'Reviewer sparse model compliance',
  'approving a sparse lifecycle model review creates the missing model complianceDeclarations.compliance field before merging comment content'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,validation,review,0,common:scope,0,@name}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000305'
     and version = '01.00.000'),
  'Reviewer sparse model scope',
  'approving a sparse lifecycle model review creates the missing submodel validation.review field before merging comment content'
);

select is(
  (select json_ordered::jsonb #>> '{processDataSet,modellingAndValidation,complianceDeclarations,compliance,0,common:approvalOfOverallCompliance}'
   from public.processes
   where id = '32000000-0000-0000-0000-000000000305'
     and version = '01.00.000'),
  'Reviewer sparse model compliance',
  'approving a sparse lifecycle model review creates the missing submodel complianceDeclarations.compliance field before merging comment content'
);

select is(
  public.cmd_review_approve(
    'lifecyclemodels',
    '53000000-0000-0000-0000-000000000303',
    '{"command":"review_approve"}'::jsonb
  )->>'code',
  'INVALID_PAYLOAD',
  'lifecycle model approval fails when a referenced submodel snapshot is missing'
);

select is(
  (select state_code::text from public.reviews where id = '53000000-0000-0000-0000-000000000303'),
  '1',
  'failed lifecycle model approval leaves the review state unchanged'
);

select is(
  (select state_code::text from public.lifecyclemodels where id = '32000000-0000-0000-0000-000000000303' and version = '01.00.000'),
  '20',
  'failed lifecycle model approval leaves the root dataset state unchanged'
);

select * from finish();
rollback;
