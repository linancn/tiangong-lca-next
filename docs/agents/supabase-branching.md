# Supabase Environment And Database Workflow

`tiangong-lca-next` is a Supabase consumer repository, not the database source-of-truth repository.

Database ownership now lives in `tiangong-lca/database-engine`, which owns:

- `supabase/config.toml`
- `supabase/migrations/*.sql`
- `supabase/seed.sql`
- `supabase/seeds/*`
- `supabase/tests/*.sql`
- the authoritative `database-engine/.github/workflows/supabase-dev.yml` workflow
- the canonical Supabase branching procedure

Use this repo for:

- frontend runtime env selection through `.env` and `.env.development`
- app-side Supabase clients under `src/services/**`
- frontend validation against local, preview, `dev`, or `main`

Do **not** use this repo for:

- authoring schema migrations
- changing Supabase branch config
- owning or editing the authoritative `database-engine` `supabase db push` automation
- keeping `.env.supabase.*.local(.example)` branch-binding files

## Environment contract

- `npm start` -> shared persistent Supabase `dev`
- `npm run start:dev` -> explicit alias for shared persistent Supabase `dev`
- `npm run start:main` -> explicit `main` connection for task-specific validation

Rules:

- GitHub default branch remains `main`, but the daily trunk is Git `dev`.
- Routine feature and fix branches start from `dev` and PR back into `dev`.
- Do not infer the working trunk from the GitHub default-branch UI alone.
- Do not create ad-hoc Supabase clients outside `src/services/**`.

## Which repo owns what?

- `tiangong-lca/database-engine`
  - schema, policy, SQL function, trigger, seed, config, preview-branch DB behavior, `.env.supabase.*.local(.example)` maintenance files, and the authoritative `supabase db push` workflow
- `tiangong-lca-next`
  - frontend runtime env files such as `.env` or `.env.development`, app-side Supabase clients, frontend validation
- `linancn/tiangong-lca-edge-functions`
  - Edge Function runtime code

If a task changes both schema and frontend behavior, the schema change still starts in `database-engine`.

## Day-to-day usage

### App-only change

1. Sync local Git `dev`.
2. Create a feature branch from `dev`.
3. Run `npm start`.
4. Develop against the shared persistent Supabase `dev` branch.
5. Open the PR into `dev`.
6. After merge, validate again in shared `dev`.

### Schema-related feature

1. Make the database change in `tiangong-lca/database-engine`.
2. Open the database PR into `database-engine` `dev`.
3. Validate the Supabase preview branch created from that database PR.
4. Point this frontend repo at the relevant environment and validate the app behavior.
5. Merge the frontend PR only after the dependent database behavior is ready or clearly staged.

### `main` verification

Use `npm run start:main` only when the task explicitly needs the `main` database, such as:

- production investigation
- behavior comparison
- hotfix validation

Default to read-only expectations when connected to `main`.

## Database-side webhook secrets

Database-triggered Edge Function calls do not read this repo's frontend env files.

They depend on branch-specific Vault secrets managed on the active Supabase branch:

- `project_url`
- `project_secret_key`
- `project_x_key` only for the legacy `generate_flow_embedding()` compatibility path

Do not hardcode branch URLs or service keys in app code, SQL, or dumped baseline files.

## Related docs

- Database source-of-truth workflow: `tiangong-lca/database-engine/docs/agents/supabase-branching.md`
- Workspace runbook: `lca-workspace/docs/runbooks/supabase-dev-branch-operations.md`
