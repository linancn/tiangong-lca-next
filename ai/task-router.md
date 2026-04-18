---
title: next Task Router
docType: router
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when you already know the task belongs in tiangong-lca-next but need the right next file or next doc
  - when deciding whether a change belongs in routes, pages, services, static resources, deep docs, or another repo
  - when routing between frontend work and handoffs to database-engine, edge-functions, next-docs, calculator, or lca-workspace
whenToUpdate:
  - when new high-frequency UI or service areas appear
  - when cross-repo boundaries change
  - when validation routing becomes misleading
checkPaths:
  - AGENTS.md
  - ai/repo.yaml
  - ai/task-router.md
  - ai/validation.md
  - ai/architecture.md
  - config/**
  - src/**
  - public/**
  - docs/agents/**
lastReviewedAt: 2026-04-18
lastReviewedCommit: 002be46cbcb8a650c30a0b8962defa50a4c8be93
related:
  - ../AGENTS.md
  - ./repo.yaml
  - ./validation.md
  - ./architecture.md
  - ../docs/agents/ai-dev-guide.md
  - ../docs/agents/ai-testing-guide.md
  - ../docs/agents/supabase-branching.md
  - ../docs/agents/util_calculate.md
---

## Repo Load Order

When working inside `tiangong-lca-next`, load docs in this order:

1. `AGENTS.md`
2. `ai/repo.yaml`
3. this file
4. `ai/validation.md` or `ai/architecture.md`
5. the narrow deep doc that matches the task

## High-Frequency Task Routing

| Task intent | First code paths to inspect | Next docs to load | Notes |
| --- | --- | --- | --- |
| Change a page, route family, layout behavior, or shared UI flow | `config/routes.ts`, `src/app.tsx`, `src/pages/**`, `src/components/**` | `ai/validation.md`, `ai/architecture.md`, `docs/agents/ai-dev-guide.md` | This is the main shipped product surface. |
| Change app-side service logic or Supabase/env handling | `config/supabaseEnv.ts`, `src/services/**` | `ai/validation.md`, `ai/architecture.md`, `docs/agents/supabase-branching.md`, `docs/agents/ai-dev-guide.md` | App-side data access belongs only in `src/services/**`; keep the `tg` / `co` / `my` / `te` data-source semantics aligned with the service-first contract. |
| Change tests, coverage, or protected-branch gates | `tests/**`, `jest.config.cjs`, `.husky/pre-push`, `.github/workflows/**`, `scripts/test-runner.cjs`, `scripts/test-coverage-report.js` | `ai/validation.md`, `docs/agents/ai-testing-guide.md`, `docs/agents/test_todo_list.md` | Coverage remains a hard contract. |
| Change lifecycle-model or calculation-adjacent frontend behavior | `src/services/lifeCycleModels/**`, nearby pages or components | `ai/validation.md`, `ai/architecture.md`, `docs/agents/util_calculate.md` | Solver truth still belongs outside this repo. |
| Change LCA task-center, process-analysis, or result-view behavior | `src/services/lca/**`, `src/components/LcaTaskCenter/**`, `src/pages/Processes/Analysis/**` | `ai/validation.md`, `ai/architecture.md`, `docs/agents/ai-dev-guide.md` | Cross-check runtime expectations with `edge-functions` or `calculator` when needed. |
| Change team, review, or system-management frontend flows | `src/pages/Review/**`, `src/pages/ManageSystem/**`, `src/pages/Teams/**` and nearby services | `ai/validation.md`, `docs/agents/team_management.md`, `docs/agents/data_audit_instruction.md` | These are shipped UI flows, not public docs-site pages. |
| Change static classifications, locations, or LCIA bundles | `public/classifications/**`, `public/locations/**`, `public/lciamethods/**`, nearby service consumers | `ai/validation.md`, `ai/architecture.md`, `docs/agents/public-classifications-gz-usage.md` | Review both assets and consumers together. |
| Change public documentation only | `tiangong-lca-next-docs`, not this repo | root `ai/task-router.md` | Product docs-site content lives in `next-docs`. |
| Change schema, migration, or Supabase branch truth | `database-engine`, not this repo | root `ai/task-router.md`, `database-engine/AGENTS.md` | This repo consumes that truth. |
| Change Edge Function runtime or API orchestration | `edge-functions`, not this repo | root `ai/task-router.md`, `tiangong-lca-edge-functions/AGENTS.md` | Do not paper over runtime issues only in the frontend. |
| Decide whether work is delivery-complete after merge | root workspace docs, not repo code paths | root `AGENTS.md`, `_docs/workspace-branch-policy-contract.md` | Root integration remains a separate phase. |

## Wrong Turns To Avoid

### Editing schema or migration truth in the frontend repo

If the task is really about schema, migration, or branch-governance truth, route it to `database-engine`.

### Hand-editing synced edge-function mirrors

Do not hand-edit `docker/volumes/functions/**`. Refresh via `docker/pull-edge-functions.sh`.

### Creating ad-hoc data clients in UI code

App-side Supabase and API access belongs only in `src/services/**`.

## Cross-Repo Handoffs

Use these handoffs when work crosses boundaries:

1. frontend behavior depends on new schema or policy truth
   - start here for the UI
   - coordinate with `database-engine`
2. frontend behavior depends on changed Edge API runtime
   - start here for the UI
   - coordinate with `edge-functions`
3. frontend workflow change needs public docs refresh
   - update `tiangong-lca-next`
   - then update `tiangong-lca-next-docs`
4. merged repo PR still needs to ship through the workspace
   - return to `lca-workspace`
   - do the submodule pointer bump there
