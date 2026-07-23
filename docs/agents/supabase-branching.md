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
lastReviewedAt: 2026-07-22
lastReviewedCommit: 30edf6e833ca69c80c765b76c893d84ad72d9634
lastReviewedNote: 'Updated for Issue #654: isolated release E2E consumes a read-only tracked-main environment proof and exact external recovery ledger without changing schema, Edge, role, or user-scoped cleanup ownership.'
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
- national-carbon process-flow graph cache reads go through `src/services/nationalCarbonGraphCache/objects.ts` and its signed object bundle; the frontend no longer owns a public cache base URL override and local direct-read debugging paths should not be reintroduced without a new runtime ownership decision
- ordered-dataset shaping in `src/services/**` stays an app-side boundary even when it mirrors backend schema names
- persisted Calculation Bundle and release readback go through `src/services/lcaReleases/**`: private bundle reads forward the current user session, public current-release and Process projections may be anonymous, and neither path accepts a service-role credential or exposes private object locators
- Node-loaded smoke workflows may call shared service helpers; runtime fallbacks such as locale detection still belong in `src/services/**` and do not create database schema or Edge runtime ownership
- app-side service errors must remain distinguishable from successful empty results so localized pages can render truthful error and retry states; this presentation contract does not move schema, authorization, or Edge ownership into Next
- the authenticated semantic localization E2E is an explicit test-only exception to the shipped `src/services/**` placement rule: direct development mode serves the worktree with `npm run start:main`, while release mode builds and serves the archived clean commit inside its isolated container; both verify the selected Supabase origin against tracked `main`, authenticate as the runtime test user, never use a service-role key, and may create/delete only the exact UUID/version `codex-e2e` process recorded in the primary plus externally mounted recovery ledger
- ordinary PR and `dev` browser jobs receive no production credentials and perform no writes; the production-backed closure is manual-only, requires `E2E_ALLOW_PRODUCTION_DATA=true`, and must finish with `created=cleaned` and `leaked=0`

## Common Scenarios

| Scenario | Correct workflow |
| --- | --- |
| app-only change | work in this repo, use `dev`, validate here |
| ordered-dataset shaping or validation normalization under `src/services/**` | keep the change in this repo, validate here, and escalate only if schema truth or Edge runtime behavior must change |
| translation-backed validation save flow such as `translate_text` retries, English supplementation, or save-while-checking continuity | keep the frontend control flow in this repo; escalate only if the Edge runtime contract itself must change |
| schema-related feature | start in `database-engine`, validate the database branch there, then validate this repo against the relevant environment |
| `main` investigation or hotfix verification | use `npm run start:main` only for that scoped task |
| semantic localization release evidence | run the local candidate with the tracked `main` backend only inside the guarded Playwright workflow; use user credentials and exact `codex-e2e` ledger cleanup, never schema/admin authority |

## Database-Side Webhook Secrets

Database-triggered Edge Function calls do not read this repo's frontend env files.

They depend on branch-specific Vault secrets on the active Supabase branch:

- `project_url`
- `project_secret_key`
- `project_x_key` only for legacy `generate_flow_embedding()` compatibility

Do not hardcode branch URLs or service keys in app code, SQL, or dumped baseline files.
