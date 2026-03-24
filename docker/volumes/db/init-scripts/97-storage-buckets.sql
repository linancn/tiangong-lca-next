DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
      AND column_name = 'public'
  ) THEN
    EXECUTE $sql$
      insert into storage.buckets (id, name, public)
      values ('lca_results', 'lca_results', false)
      on conflict (id) do update
      set
        name = excluded.name,
        public = excluded.public,
        updated_at = now()
    $sql$;
  ELSE
    insert into storage.buckets (id, name)
    values ('lca_results', 'lca_results')
    on conflict (id) do update
    set
      name = excluded.name,
      updated_at = now();
  END IF;
END
$$;
