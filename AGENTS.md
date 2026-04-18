---
title: next AI Working Guide
docType: contract
scope: repo
status: active
authoritative: true
owner: next
language: en
whenToUse:
  - when a task may change shipped frontend behavior, route wiring, app-side service integration, or the repo test and release gates
  - when routing work from the workspace root into tiangong-lca-next
  - when deciding whether a change belongs here, in database-engine, in edge-functions, in next-docs, or in lca-workspace
whenToUpdate:
  - when branch, deploy, coverage, or ownership boundaries change
  - when the app-side data-access contract changes
  - when the repo-local AI bootstrap docs under ai/ change
checkPaths:
  - AGENTS.md
  - README.md
  - docs/agents/**
  - ai/**/*.md
  - ai/**/*.yaml
  - package.json
  - .nvmrc
  - jest.config.cjs
  - .husky/pre-push
  - .github/workflows/**
  - config/**
  - src/**
  - public/**
  - docker/**
lastReviewedAt: 2026-04-18
lastReviewedCommit: 002be46cbcb8a650c30a0b8962defa50a4c8be93
related:
  - ai/repo.yaml
  - ai/task-router.md
  - ai/validation.md
  - ai/architecture.md
  - docs/agents/ai-dev-guide.md
  - docs/agents/ai-testing-guide.md
  - docs/agents/supabase-branching.md
  - docs/agents/util_calculate.md
---

## Repo Contract

`tiangong-lca-next` owns shipped frontend behavior for TianGong LCA: routes, pages, shared UI components, app-side services, caches, and local product packaging surfaces. Start here when the task may change what users see or how the frontend talks to the backend.

## AI Language And Load Order

AI contract docs under `AGENTS.md` and `ai/**` are English-only canonical.

For legacy deep docs under `docs/agents/**`, keep this rule:

- if you edit an English file that already has a `_CN` mirror, update the mirror in the same change

Load docs in this order:

1. `AGENTS.md`
2. `ai/repo.yaml`
3. `ai/task-router.md`
4. `ai/validation.md`
5. `ai/architecture.md`
6. only then load the deep doc that matches the task, such as:
   - `docs/agents/ai-dev-guide.md`
   - `docs/agents/ai-testing-guide.md`
   - `docs/agents/supabase-branching.md`
   - `docs/agents/util_calculate.md`

Do not start with long plans, Chinese mirrors, or GitHub default-branch UI.

## Repo Ownership

This repo owns:

- shipped product behavior under `src/**`
- route wiring under `config/routes.ts`
- app runtime setup under `config/**` and `src/app.tsx`
- app-side Supabase and API access under `src/services/**`
- shared UI, locale, and static-resource consumption under `src/components/**`, `src/locales/**`, and `public/**`
- self-hosted mirror assets under `docker/**`
- desktop packaging files under `electron/**`, `electron-builder.json`, and `icons/**`

This repo does not own:

- database schema, migrations, seeds, or Supabase branch governance
- Edge Function runtime behavior
- public docs-site content
- solver or compute-engine internals
- workspace integration state after merge

Route those tasks to:

- `database-engine` for schema truth and Supabase branch governance
- `edge-functions` for Edge runtime and API orchestration behavior
- `next-docs` for public docs-site content
- `calculator` for solver and compute behavior
- `lca-workspace` for root integration after merge

## Branch And Deploy Facts

- GitHub default branch: `main`
- True daily trunk: `dev`
- Routine branch base: `dev`
- Routine PR base: `dev`
- Promote path: `dev -> main`
- `main` pushes build and deploy the web app
- `v*` tags build draft Electron releases

Do not infer the daily trunk from GitHub UI defaults.

## Runtime Facts

- Package manager: `npm`
- Node baseline: `>=24`
- Default local app target: `npm start` or `npm run start:dev` against the shared `dev` environment
- Explicit main-target command: `npm run start:main`
- App-side Supabase access belongs only in `src/services/**`
- The authoritative full gate is `npm run prepush:gate`
- Repo-wide coverage is expected to stay at `100%` for statements, branches, functions, and lines

## Hard Boundaries

- Do not author schema or migration truth here
- Do not hand-edit `docker/volumes/functions/**`; refresh it via `docker/pull-edge-functions.sh`
- Do not create ad-hoc Supabase clients outside `src/services/**`
- Do not treat a merged repo PR here as workspace-delivery complete if the root repo still needs a submodule bump

## Workspace Integration

A merged PR in `tiangong-lca-next` is repo-complete, not delivery-complete.

If the change must ship through the workspace:

1. merge the child PR into `tiangong-lca-next`
2. promote or select an eligible child SHA according to workspace policy
3. update the `lca-workspace` submodule pointer deliberately
