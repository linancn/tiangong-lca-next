# Supabase Branching

This repository is configured for one Supabase Branching source of truth:

- Git `main` -> production project
- Git `dev` -> persistent Supabase branch
- pull requests / feature branches -> ephemeral preview branches created by the Supabase GitHub integration

This document intentionally keeps branch topology, config ownership, and day-to-day workflow in one place so the branch model and the operating rules do not drift apart.

## Repo contract

- Keep one shared `supabase/` directory in Git.
- Treat committed files in `supabase/migrations/` as the schema source of truth for production, `dev`, and preview branches.
- Use local development plus committed migration files as the default schema workflow.
- Root settings in `supabase/config.toml` are the production baseline and are also inherited by preview branches.
- Put persistent dev-only overrides in `[remotes.dev]`.
- If the dashboard shows `dev` is not persistent, fix the branch state before relying on `[remotes.dev]`.
- Do not create a separate `supabase/` directory per Git branch.
- Do not add a second GitHub Actions flow that also runs `supabase db push` while the Supabase GitHub integration is managing branch sync.

## Files to maintain

- `supabase/config.toml`: shared baseline plus `[remotes.dev]`
- `supabase/migrations/*.sql`: committed migration history, including the initial baseline that anchors `main`
- `supabase/seed.sql`: shared seed data
- `supabase/seeds/dev.sql`: optional persistent-dev-only seed data
- `.env`: explicit main-target frontend Supabase URL + publishable key
- `.env.development`: routine frontend development target, currently pointed at the shared remote `dev` branch
- `.env.supabase.dev.local`: local-only CLI connection info for one-off remote `dev` operations; the frontend does not read this file
- `.env.supabase.main.local`: local-only CLI connection info for one-off remote `main` operations; the frontend does not read this file

## Values still to fill

1. In the Supabase dashboard for the production project, confirm Branching stays enabled and this GitHub repository remains connected.
2. Confirm the persistent `dev` branch remains mapped to the `project_id` configured under `[remotes.dev]`.
3. If you later add a dedicated dev frontend domain, replace `[remotes.dev.auth].site_url = "http://localhost:8000"` with that hosted URL.
4. If you later add per-PR frontend preview deployments, extend the root `additional_redirect_urls` with the real preview host wildcard.
5. Keep shared seed data in `supabase/seed.sql`. Put dev-only fixtures in `supabase/seeds/dev.sql`, or disable `[remotes.dev.db.seed]` if you do not want branch-specific seed data.
6. Decide how preview branches receive the Vault secrets `project_url` and `project_secret_key` if reviewer flows need database-triggered Edge Function webhooks. If a branch still exercises the legacy `generate_flow_embedding()` -> `flow_embedding` path, provide `project_x_key` there as well. Persistent `main` and persistent `dev` must already have the secrets they require.

## Auth notes

- Preview branches inherit the root auth config. Right now that allow-list covers the hosted production app plus local development on port `8000`.
- `[remotes.dev.auth]` exists only for the persistent `dev` branch, and it currently points to local development on `http://localhost:8000` because no dedicated hosted dev frontend domain was found in the repo.
- When you later add provider or SMTP secrets, prefer `env(...)` references in `supabase/config.toml` instead of hardcoding secrets.

## Database webhook secret notes

The database functions and triggers in this repo that invoke Edge Functions do not read the frontend `.env` files. They read Vault secrets from the active Supabase branch.

Required Vault secret names for the current webhook path:

- `project_url`: the base URL of the current Supabase branch or project, used to build `/functions/v1/<name>` requests.
- `project_secret_key`: the service-to-service API key that the branch's Edge Functions accept for `SERVICE_API_KEY` authentication.

Additional legacy compatibility secret:

- `project_x_key`: the legacy `X_KEY` value expected by the deprecated `/functions/v1/flow_embedding` endpoint that `public.generate_flow_embedding()` still calls.

Operational rules:

- Never hardcode these values in SQL, migrations, or dumped baseline files.
- Treat them as branch-specific. Production `main`, persistent `dev`, and any preview setup that must execute these webhook flows need their own values.
- Only configure `project_x_key` on branches that still exercise the legacy `flow_embedding` path.
- If a branch is recreated, re-linked, or copied, verify the relevant Vault entries before testing webhook-driven flows.
- Missing webhook secrets are an environment/config gap, not a reason to hand-edit SQL in the dashboard or commit literals back into Git.

Recommended configuration path:

- If you want config-as-code for these values, wire them through `supabase/config.toml` with `[db.vault]` plus `env(...)` references, then provide the actual env/branch secrets outside Git.
- If you manage them manually, keep the Vault secret names exactly `project_url`, `project_secret_key`, and `project_x_key` when the legacy path is retained, so the committed SQL keeps working across branches.

## Default development flow at a glance

This is the default repository workflow. Use it unless a task explicitly requires a production-only hotfix path.

1. Update local Git `dev`.
2. Create a feature branch from Git `dev`.
3. Choose the working mode:
   - App-only change: run `npm run start:dev` and develop against the shared persistent Supabase `dev` branch.
   - Schema change: run `npx supabase start`, make the change locally, generate a migration, and validate locally first.
4. Open the feature PR into Git `dev`.
5. Use the Supabase preview branch created for that PR to verify migration and config behavior before merge.
6. After the PR merges into Git `dev`, verify the integrated result again in the shared persistent Supabase `dev` branch.
7. When the change is ready to release, open a promotion PR from Git `dev` into Git `main`.
8. Use the explicit main-target flow only when the task requires `main`, such as production investigation, comparison, or hotfix work.

Default constraints:

- Do not manually `db push` to the shared Supabase `dev` branch during normal feature development.
- Do not author schema changes first in the remote `dev` branch and then try to reconstruct them in Git later.
- Do not open routine feature work directly against Git `main`.

## Which database should I use?

| Situation | Frontend should connect to | Schema changes should be made in | Default action |
| --- | --- | --- | --- |
| Routine page, component, or service development with no schema change | Shared remote `dev` via `.env.development` | Nowhere | Run `npm run start:dev` and develop normally |
| Schema, policy, function, or seed development | Local Supabase started by `npx supabase start` | Local only | Create and validate a migration locally first |
| QA after a feature merges into Git `dev` | Shared remote `dev` | Nowhere by hand | Test the integrated result in the shared `dev` environment |
| Task-specific verification against `main` | `main`, through the explicit `npm start` / `npm run start:main` workflow | Not as the first place to author schema changes | Run `npm run start:main`, then switch back to `npm run start:dev` when the task is done |

Important rules:

- Keep the default day-to-day local development target explicit. If the task requires `main`, switch deliberately rather than silently changing the normal target.
- Do not use the shared remote `dev` database as the place where you first invent schema changes.
- Do not manually edit production schema in the dashboard during normal work.

## Recommended workflow

### Default promotion path

- Because this repo keeps both Git `dev` and Git `main`, the default promotion path is:
- `feature/*` -> `dev` -> `main`
- In other words, a normal schema change should not be authored in the remote Supabase `dev` database first. It should be authored locally, committed in Git, merged to Git `dev`, and only then allowed to update the shared Supabase `dev` branch.

### 1. Keep `main` stable and migration-driven

- The checked-in migration history under `supabase/migrations/` is the contract that production, `dev`, and preview branches should all converge on.
- Keep the first baseline migration in Git after it is established. Do not casually delete or regenerate it.
- After the baseline exists, every schema change should arrive as a new migration file instead of a manual production edit.
- Production should receive schema changes only from migrations that have already been reviewed and merged through Git.

### 2. Normal schema change flow

1. Start from the latest Git `dev`.
2. Create a feature branch from `dev`.
3. Start the local stack with `npx supabase start`.
4. Make schema changes locally.
5. Create a migration with `npx supabase migration new <name>` or `npx supabase db diff -f <name>`.
6. Validate with `npx supabase db reset` and the relevant app tests.
7. Commit application code, tests, and the migration file together.
8. Open a PR from the feature branch into Git `dev`.
9. Let the Supabase GitHub integration create or update the preview branch for that PR.
10. After the PR merges into Git `dev`, use the shared persistent Supabase `dev` branch for QA and integration checks.
11. When the release is ready, open a PR from Git `dev` into Git `main`.
12. After the `dev` -> `main` merge, production applies the same committed migrations.

### 2a. Application change flow

Use this flow when changing pages, components, client logic, or service code without changing the database schema.

1. Checkout the latest Git `dev`.
2. Create a feature branch from `dev`.
3. Run `npm run start:dev`.
4. By default the app will read `.env.development` and connect to the shared remote `dev` branch.
5. Implement the change, add tests, and open a PR into Git `dev`.
6. After merge, verify the result again in shared `dev`.

### 2b. Schema change flow

Use this flow when adding or modifying tables, columns, policies, SQL functions, triggers, or seed data.

1. Checkout the latest Git `dev`.
2. Create a feature branch from `dev`.
3. Run `npx supabase start`.
4. Make the schema change locally.
5. Create a migration with `npx supabase migration new <name>` or `npx supabase db diff -f <name>`.
6. Run `npx supabase db reset` until the migration can rebuild the local database cleanly.
7. If you need the frontend to talk to the local Supabase stack, run:

```bash
eval "$(npx supabase status -o env --override-name api.url=SUPABASE_URL --override-name auth.anon_key=SUPABASE_PUBLISHABLE_KEY | rg '^(SUPABASE_URL|SUPABASE_PUBLISHABLE_KEY)=' | sed 's/^/export /')"
npm run start:dev
```

8. After that shell session is no longer needed, run `unset SUPABASE_URL SUPABASE_PUBLISHABLE_KEY` to return to the normal `.env.development` behavior.
9. Commit the migration, code, and tests together.
10. Open a PR into Git `dev`.
11. After merge, verify the integrated result in the shared remote `dev` branch.
12. Promote `dev` to `main` only after QA is complete.

### 2c. Main-connected flow

Use this flow when a task requires the frontend or CLI to connect to `main`, including production investigation, behavior comparison, or hotfix preparation.

1. Keep the main-target workflow explicit so it is always obvious when the app or CLI is talking to `main`.
2. Use `.env.supabase.main.local` for one-off CLI operations such as migration inspection.
3. If the frontend must connect to `main`, run `npm run start:main` (or `npm start`, which is the same path) instead of silently replacing the default `dev` target.
4. Treat `main` access as read-only unless you are executing an approved hotfix or recovery step.
5. If a code fix is required, branch from Git `main`, fix it, merge back to `main`, and then back-merge `main` into `dev`.

### 3. Role of `dev`

- Treat Git `dev` and the Supabase `dev` branch as the long-lived shared integration environment for QA and team testing.
- `.env.development` may point the frontend to shared `dev`, but schema authoring should still happen locally and flow through migrations.
- Keep `[remotes.dev].project_id` synchronized with the actual persistent `dev` branch returned by `npx supabase --experimental branches list --project-ref qgzvkongdjqiiamzbbts`.
- Do not hand-edit the shared Supabase `dev` schema and then expect Git to catch up later. If that happens, treat it as drift and recover it deliberately.

### 4. Role of preview branches

- Open PRs from feature branches and let the Supabase GitHub integration create or update preview branches automatically.
- Use preview branches to verify migrations, config, seed behavior, and reviewer flows before anything lands in shared `dev`.
- Do not treat preview branches as the primary place to author schema changes.
- If newer migrations land on `dev` while a PR is open, rebase or merge `dev` and keep migration timestamps in execution order.

### 5. Production release and hotfixes

- Merge to `main` only after local validation, preview checks, and shared `dev` validation pass.
- Let production apply the committed migrations from Git instead of relying on manual dashboard schema changes.
- For an emergency production-only fix, branch from `main`, patch it, merge back to `main`, and then back-merge `main` into `dev` so the migration history stays aligned.
- If the team has recurring workflows that require the frontend to connect to `main`, keep that entry path explicit and separate from the default `dev` command by using `npm run start:main`.
- Use remote dashboard edits only for emergency recovery or one-off inspection, then reconcile them back into Git immediately.

## When to use `db pull`

- Use `db pull` for two cases only:
- Baselining an existing remote schema that was not yet represented in `supabase/migrations/`.
- Pulling remote-only schema drift back into Git after someone changed the remote database outside the normal migration workflow.
- After a recovery `db pull`, verify alignment with `npx supabase migration list` and repair migration history if needed.
- Do not use `db pull` as the routine way to create new migrations during normal feature work.

## Recovery checklist

- If local and remote migration histories diverge, inspect them with `npx supabase migration list` before changing anything else.
- If history is wrong on the remote side, use `npx supabase migration repair` intentionally, then re-check the result.
- If `dev` or a preview branch reaches `MIGRATIONS_FAILED`, inspect the branch logs, fix the migration in Git, and prefer recreating the failed branch instead of hand-editing branch state.
- If `dev` is recreated, refresh any local branch credentials files and confirm `[remotes.dev].project_id` again.

## Local operations

- Use `npx supabase ...` inside this repo because the CLI is installed as a project dependency.
- `npm run start:dev` is the routine shared-`dev` frontend command.
- `npm start` and `npm run start:main` are the explicit main-target frontend commands.
- When you are validating schema or seed changes, prefer the local Supabase stack over the shared remote `dev` branch.
- Use `supabase link --project-ref <ref>` only for one-off manual operations against a specific remote project or branch.
- Open a PR and verify that Supabase creates the preview branch automatically.
