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
lastReviewedAt: 2026-06-04
lastReviewedCommit: da18c7ef7d4e3da77aa29ef419ad6301ca2b4972
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
- `PROCESS_FLOW_GRAPH_CACHE_BASE_URL` is the frontend public read URL for the national-carbon process-flow graph cache; it is loaded through `config/supabaseEnv.ts` with other frontend environment values and does not create a database schema, Supabase branch, or Edge runtime ownership change
- ordered-dataset shaping in `src/services/**` stays an app-side boundary even when it mirrors backend schema names
- Node-loaded smoke workflows may call shared service helpers; runtime fallbacks such as locale detection still belong in `src/services/**` and do not create database schema or Edge runtime ownership

## Common Scenarios

| Scenario | Correct workflow |
| --- | --- |
| app-only change | work in this repo, use `dev`, validate here |
| ordered-dataset shaping or validation normalization under `src/services/**` | keep the change in this repo, validate here, and escalate only if schema truth or Edge runtime behavior must change |
| translation-backed validation save flow such as `translate_text` retries, English supplementation, or save-while-checking continuity | keep the frontend control flow in this repo; escalate only if the Edge runtime contract itself must change |
| schema-related feature | start in `database-engine`, validate the database branch there, then validate this repo against the relevant environment |
| `main` investigation or hotfix verification | use `npm run start:main` only for that scoped task |

## Database-Side Webhook Secrets

Database-triggered Edge Function calls do not read this repo's frontend env files.

They depend on branch-specific Vault secrets on the active Supabase branch:

- `project_url`
- `project_secret_key`
- `project_x_key` only for legacy `generate_flow_embedding()` compatibility

Do not hardcode branch URLs or service keys in app code, SQL, or dumped baseline files.
