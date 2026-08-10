---
title: next Supabase Environment And Database Workflow
docType: guide
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when choosing the correct environment for frontend validation
  - when deciding whether a change belongs here, in `database-engine`, or in `edge-functions`
  - when checking webhook secret rules
whenToUpdate:
  - when frontend environment-selection rules change
  - when repo ownership boundaries around Supabase behavior change
  - when the workflow for shared dev versus main validation changes
checkPaths:
  - docs/agents/supabase-branching.md
  - config/supabaseEnv.ts
  - src/services/**
  - docker/**
  - scripts/e2e/**
  - playwright.config.ts
  - tests/e2e/i18n/**
lastReviewedAt: 2026-08-10
lastReviewedCommit: 93821284b4ac9d4ed08ac6f42498e48bd2d15fda
lastReviewedNote: 'Reviewed the Issue #799 Dev regression follow-up: optimistic task retention is app-side merge behavior and does not change the database, authentication, or Edge ownership boundary.'
---

# Supabase Environment And Database Workflow

> Purpose: exact ownership and environment rules for frontend work that touches Supabase-related behavior.

## Use When

- choosing the correct environment for frontend validation
- deciding whether a change belongs here, in `database-engine`, or in `edge-functions`
- checking webhook secret rules

## Do Not Use For

- authoring schema migrations
- editing Supabase branch config
- defining database truth

## Ownership Split

| Repo | Owns |
| --- | --- |
| `database-engine` | schema truth, migrations, seeds, Supabase config, branch-governance workflow, database-side preview behavior |
| `tiangong-lca-next` | frontend env selection, app-side Supabase clients, frontend validation |
| `edge-functions` | Edge Function runtime code |

## Environment Contract

| Need                             | Command              |
| -------------------------------- | -------------------- |
| shared persistent `dev`          | `npm start`          |
| explicit shared persistent `dev` | `npm run start:dev`  |
| explicit `main` verification     | `npm run start:main` |

Rules:

- routine feature and fix work starts from Git `dev` and targets `dev`
- do not infer the working trunk from GitHub default-branch UI alone
- do not create ad-hoc Supabase clients outside `src/services/**`
- the shared shipped client defaults to `db.schema = api`; non-core reads use Database-owned query facades and mutations use established command/Edge boundaries
- direct relation access is fail-closed through `src/services/supabase/public.ts` and is limited to `processes`, `flows`, `contacts`, `sources`, `unitgroups`, `flowproperties`, `lciamethods`, `lifecyclemodels`, and `ilcd`; callers must not broaden this list to regain access to implementation tables
- test-only Supabase clients used by live data workflows must select `public` explicitly before reading a core entity; mocks must implement the same schema-selection step
- `docker/volumes/functions/**` does not transfer Edge runtime ownership to Next: it is generated only by `docker/pull-edge-functions.sh --ref <40-character-commit-sha>`, must match that exact Edge tree plus its source receipt, and must delete files absent from the source commit
- national-carbon process-flow graph cache reads go through `src/services/nationalCarbonGraphCache/objects.ts` and its signed object bundle; the frontend no longer owns a public cache base URL override and local direct-read debugging paths should not be reintroduced without a new runtime ownership decision
- ordered-dataset shaping in `src/services/**` stays an app-side boundary even when it mirrors backend schema names
- persisted Calculation Bundle and release readback go through `src/services/lcaReleases/**`: private bundle reads forward the current user session, public current-release and Process projections may be anonymous, and neither path accepts a service-role credential or exposes private object locators
- closure checks, closure artifacts, result-package commands, publication reads, and the unified data-product task feed go through `src/services/dataProducts/**` and authenticated `app_data_product_commands`; closure requests preserve exact LCIA method `{ id, version }` identities from the reviewed static catalog, and Next consumes actor-bound curated closure, artifact-lifecycle, signed-download, and `task-summary.v2` projections rather than worker rows or private artifact locators. Signed artifact responses are navigation targets only: Next must not proxy, fetch, or buffer the artifact bytes.
- Node-loaded smoke workflows may call shared service helpers; runtime fallbacks such as locale detection still belong in `src/services/**` and do not create database schema or Edge runtime ownership
- app-side service errors must remain distinguishable from successful empty results so localized pages can render truthful error and retry states; this presentation contract does not move schema, authorization, or Edge ownership into Next
- Contact, FlowProperty, Source, and UnitGroup keyword searches call only their exact allowlisted Hybrid Edge Functions through the shared app-side helper. Next forwards the current user JWT and optional state/team scope, but never decides team membership; the Edge layer validates and forwards request shape, and `database-engine` remains authoritative for `tg`/`co`/`my`/`te` visibility, Semantic/Hybrid RPCs, derivative queues, and HNSW indexes
- Process keyword searches call `search_processes_latest_v2` through `src/services/processes/api.ts`, pass explicit query terms, and use no app-side ILIKE field filter. The `public_plus_owner_draft` picker asks the database for strict personal drafts and public rows separately; database-engine owns the exact `state_code=0`, null-team, null-review, latest-version, and `extracted_md` index constraints
- LCA solve, result-query, and contribution-path requests use the shared `LcaScope` contract from `src/services/lca/scope.ts`. The default snapshot family is `full_library`; `data_product` is the only alternate value. Deployment names and cache namespaces are not valid LCA scope values, and persisted task recovery normalizes historical non-canonical values before resubmission
- the authenticated semantic localization E2E is an explicit test-only exception to the shipped `src/services/**` placement rule: direct development mode serves the worktree with `npm run start:main`, while release mode builds and serves the archived clean commit inside its isolated container; both verify the selected Supabase origin against tracked `main`, authenticate as the runtime test user, never use a service-role key, and may create/delete only the exact UUID/version `codex-e2e` process recorded in the primary plus externally mounted recovery ledger
- production-backed browser proof classifies only the exact reviewed `list_task_feed` and `list_publications` payloads as read-only data-product commands; the shared function path or a POST method alone never establishes a read-only boundary
- ordinary PR and `dev` browser jobs receive no production credentials and perform no writes; the production-backed closure is manual-only, requires `E2E_ALLOW_PRODUCTION_DATA=true`, and must finish with `created=cleaned` and `leaked=0`

## Common Scenarios

| Scenario | Correct workflow |
| --- | --- |
| app-only change | work in this repo, use `dev`, validate here |
| ordered-dataset shaping or validation normalization under `src/services/**` | keep the change in this repo, validate here, and escalate only if schema truth or Edge runtime behavior must change |
| foundation-dataset Hybrid Search entrypoint | change Next pages/services here, pair it with the matching Edge route and database RPC revisions, validate against a non-production environment, and preserve UUID/empty-query behavior |
| Process keyword search or strict calculation picker scope | change the app-side request here, pair it with the matching database v2 RPC revision, and validate public plus owner-draft results against a non-production environment; do not add direct app-side field filtering |
| translation-backed validation save flow such as `translate_text` retries, English supplementation, or save-while-checking continuity | keep the frontend control flow in this repo; escalate only if the Edge runtime contract itself must change |
| schema-related feature | start in `database-engine`, validate the database branch there, then validate this repo against the relevant environment |
| database schema-boundary cutover | pair the exact Database and Edge revisions, default shipped RPC calls to `api`, route only the nine public core entities through `publicEntity()`, audit every literal RPC against the Database facade catalog, and run the schema-boundary plus data-workflow proof |
| self-hosted Edge Function mirror refresh | first review and promote the owning Edge commit, then run the Next helper with that full SHA, verify byte-for-byte parity/source receipt/stale deletion, and require a no-diff second run |
| `main` investigation or hotfix verification | use `npm run start:main` only for that scoped task |
| semantic localization release evidence | run the local candidate with the tracked `main` backend only inside the guarded Playwright workflow; use user credentials and exact `codex-e2e` ledger cleanup, never schema/admin authority |

## Database-Side Webhook Secrets

Database-triggered Edge Function calls do not read this repo's frontend env files.

They depend on branch-specific Vault secrets on the active Supabase branch:

- `project_url`
- `project_secret_key`
- `project_x_key` only for legacy `generate_flow_embedding()` compatibility

Do not hardcode branch URLs or service keys in app code, SQL, or dumped baseline files.
