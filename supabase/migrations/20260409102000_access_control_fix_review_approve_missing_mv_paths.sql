create or replace function public.cmd_review_apply_model_validation_to_process_json(
  p_process_json jsonb,
  p_model_json jsonb,
  p_comment_review jsonb default '[]'::jsonb,
  p_comment_compliance jsonb default '[]'::jsonb
)
returns jsonb
language sql
immutable
set search_path = public, pg_temp
as $$
  with base as (
    select
      coalesce(p_process_json, '{}'::jsonb) as process_json,
      public.cmd_review_json_array(
        coalesce(
          p_process_json #> '{processDataSet,modellingAndValidation,validation,review}',
          '[]'::jsonb
        )
      ) as existing_review_items,
      public.cmd_review_json_array(
        coalesce(
          p_process_json #> '{processDataSet,modellingAndValidation,complianceDeclarations,compliance}',
          '[]'::jsonb
        )
      ) as existing_compliance_items,
      public.cmd_review_json_array(coalesce(p_comment_review, '[]'::jsonb)) as comment_review_items,
      public.cmd_review_json_array(coalesce(p_comment_compliance, '[]'::jsonb))
        as comment_compliance_items
  ),
  prepared as (
    select
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              base.process_json,
              '{processDataSet}',
              case
                when jsonb_typeof(base.process_json->'processDataSet') = 'object'
                  then base.process_json->'processDataSet'
                else '{}'::jsonb
              end,
              true
            ),
            '{processDataSet,modellingAndValidation}',
            case
              when jsonb_typeof(
                base.process_json #> '{processDataSet,modellingAndValidation}'
              ) = 'object'
                then base.process_json #> '{processDataSet,modellingAndValidation}'
              else '{}'::jsonb
            end,
            true
          ),
          '{processDataSet,modellingAndValidation,validation}',
          case
            when jsonb_typeof(
              base.process_json #> '{processDataSet,modellingAndValidation,validation}'
            ) = 'object'
              then base.process_json #> '{processDataSet,modellingAndValidation,validation}'
            else '{}'::jsonb
          end,
          true
        ),
        '{processDataSet,modellingAndValidation,complianceDeclarations}',
        case
          when jsonb_typeof(
            base.process_json #> '{processDataSet,modellingAndValidation,complianceDeclarations}'
          ) = 'object'
            then base.process_json #> '{processDataSet,modellingAndValidation,complianceDeclarations}'
          else '{}'::jsonb
        end,
        true
      ) as prepared_process_json,
      base.existing_review_items,
      base.existing_compliance_items,
      base.comment_review_items,
      base.comment_compliance_items
    from base
  )
  select jsonb_set(
    jsonb_set(
      prepared.prepared_process_json,
      '{processDataSet,modellingAndValidation,validation,review}',
      prepared.existing_review_items || prepared.comment_review_items,
      true
    ),
    '{processDataSet,modellingAndValidation,complianceDeclarations,compliance}',
    prepared.existing_compliance_items || prepared.comment_compliance_items,
    true
  )
  from prepared
$$;

create or replace function public.cmd_review_apply_mv_payload(
  p_table text,
  p_id uuid,
  p_version text,
  p_review_items jsonb default '[]'::jsonb,
  p_compliance_items jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row jsonb;
  v_doc jsonb;
  v_dataset_path text[];
  v_mv_path text[];
  v_validation_object_path text[];
  v_compliance_object_path text[];
  v_review_path text[];
  v_compliance_path text[];
  v_review_items jsonb := coalesce(p_review_items, '[]'::jsonb);
  v_compliance_items jsonb := coalesce(p_compliance_items, '[]'::jsonb);
begin
  if p_table not in ('processes', 'lifecyclemodels') then
    return public.cmd_review_get_dataset_row(p_table, p_id, p_version, false);
  end if;

  v_row := public.cmd_review_get_dataset_row(p_table, p_id, p_version, true);

  if v_row is null then
    return null;
  end if;

  if p_table = 'processes' then
    v_dataset_path := array['processDataSet'];
    v_mv_path := array['processDataSet', 'modellingAndValidation'];
    v_validation_object_path := array[
      'processDataSet',
      'modellingAndValidation',
      'validation'
    ];
    v_compliance_object_path := array[
      'processDataSet',
      'modellingAndValidation',
      'complianceDeclarations'
    ];
    v_review_path := array['processDataSet', 'modellingAndValidation', 'validation', 'review'];
    v_compliance_path := array[
      'processDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance'
    ];
  else
    v_dataset_path := array['lifeCycleModelDataSet'];
    v_mv_path := array['lifeCycleModelDataSet', 'modellingAndValidation'];
    v_validation_object_path := array[
      'lifeCycleModelDataSet',
      'modellingAndValidation',
      'validation'
    ];
    v_compliance_object_path := array[
      'lifeCycleModelDataSet',
      'modellingAndValidation',
      'complianceDeclarations'
    ];
    v_review_path := array[
      'lifeCycleModelDataSet',
      'modellingAndValidation',
      'validation',
      'review'
    ];
    v_compliance_path := array[
      'lifeCycleModelDataSet',
      'modellingAndValidation',
      'complianceDeclarations',
      'compliance'
    ];
  end if;

  v_doc := coalesce(v_row->'json_ordered', v_row->'json', '{}'::jsonb);
  v_doc := jsonb_set(
    v_doc,
    v_dataset_path,
    case
      when jsonb_typeof(v_doc #> v_dataset_path) = 'object'
        then v_doc #> v_dataset_path
      else '{}'::jsonb
    end,
    true
  );
  v_doc := jsonb_set(
    v_doc,
    v_mv_path,
    case
      when jsonb_typeof(v_doc #> v_mv_path) = 'object'
        then v_doc #> v_mv_path
      else '{}'::jsonb
    end,
    true
  );
  v_doc := jsonb_set(
    v_doc,
    v_validation_object_path,
    case
      when jsonb_typeof(v_doc #> v_validation_object_path) = 'object'
        then v_doc #> v_validation_object_path
      else '{}'::jsonb
    end,
    true
  );
  v_doc := jsonb_set(
    v_doc,
    v_compliance_object_path,
    case
      when jsonb_typeof(v_doc #> v_compliance_object_path) = 'object'
        then v_doc #> v_compliance_object_path
      else '{}'::jsonb
    end,
    true
  );

  if jsonb_array_length(v_review_items) > 0 then
    v_doc := jsonb_set(
      v_doc,
      v_review_path,
      public.cmd_review_json_array(v_doc #> v_review_path) || v_review_items,
      true
    );
  end if;

  if jsonb_array_length(v_compliance_items) > 0 then
    v_doc := jsonb_set(
      v_doc,
      v_compliance_path,
      public.cmd_review_json_array(v_doc #> v_compliance_path) || v_compliance_items,
      true
    );
  end if;

  execute format(
    'update public.%I
        set json_ordered = $1::json,
            json = $1::jsonb,
            modified_at = now()
      where id = $2
        and version = $3',
    p_table
  )
    using v_doc, p_id, p_version;

  return public.cmd_review_get_dataset_row(p_table, p_id, p_version, false);
end;
$$;
