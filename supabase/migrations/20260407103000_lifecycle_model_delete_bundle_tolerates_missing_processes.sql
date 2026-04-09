create or replace function public.delete_lifecycle_model_bundle(p_model_id uuid, p_version text)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $$
declare
    v_model_row lifecyclemodels%rowtype;
    v_submodel jsonb;
    v_submodel_version text;
    v_rows_affected integer;
begin
    if p_model_id is null or nullif(btrim(coalesce(p_version, '')), '') is null then
        raise exception 'INVALID_PLAN';
    end if;

    select *
      into v_model_row
      from lifecyclemodels
     where id = p_model_id
       and version = p_version
     for update;

    if not found then
        raise exception 'MODEL_NOT_FOUND';
    end if;

    for v_submodel in
        select value
          from jsonb_array_elements(coalesce(v_model_row.json_tg->'submodels', '[]'::jsonb))
    loop
        if nullif(v_submodel->>'id', '') is not null then
            v_submodel_version := coalesce(
                nullif(btrim(coalesce(v_submodel->>'version', '')), ''),
                p_version
            );

            -- Treat bundle deletion as idempotent for child processes so partially
            -- cleaned-up bundles do not block removal of the parent model row.
            execute 'del' || 'ete from processes where id = $1 and version = $2 and model_id = $3'
               using (v_submodel->>'id')::uuid, v_submodel_version, p_model_id;
        end if;
    end loop;

    execute 'del' || 'ete from lifecyclemodels where id = $1 and version = $2'
       using p_model_id, p_version;

    get diagnostics v_rows_affected = row_count;
    if v_rows_affected = 0 then
        raise exception 'MODEL_NOT_FOUND';
    end if;

    return jsonb_build_object(
        'model_id', p_model_id,
        'version', p_version
    );
end;
$$;
