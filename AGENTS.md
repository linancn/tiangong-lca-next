---
title: next Repo Contract
docType: contract
scope: repo
status: active
authoritative: true
owner: next
language: en
whenToUse:
  - when the task may change shipped frontend behavior, repo rules, validation, or documentation ownership
  - when routing work from the workspace root into this repo
  - when deciding which document owns a rule, command, or decision
whenToUpdate:
  - when repo facts, branch rules, quality gates, or documentation ownership change
  - when a command, environment rule, or repo boundary becomes inaccurate
  - when the current documentation system becomes redundant or ambiguous
checkPaths:
  - AGENTS.md
  - DEV.md
  - ai/**/*.md
  - ai/**/*.yaml
  - docs/agents/**
  - package.json
  - .nvmrc
  - .husky/pre-push
  - .github/workflows/**
lastReviewedAt: 2026-04-21
lastReviewedCommit: 25d9c1e2799929b4fb3f8a524b2a47931a7b0dc8
related:
  - ai/repo.yaml
  - ai/task-router.md
  - ai/validation.md
  - ai/architecture.md
  - DEV.md
---

## Repo Contract

`tiangong-lca-next` owns shipped frontend behavior for TianGong LCA: routes, pages, UI components, app-side services, static resource consumption, and local product packaging surfaces.

Start here when the task may change what users see, how the frontend talks to the backend, how the repo is validated, or how repo documentation is organized.

## Documentation System Principles

This repository treats documentation as an information system, not as narrative writing.

Required principles:

- single source of truth: one rule has one owning document
- one document, one job: each document solves one problem clearly
- conclusion first: put purpose, rules, steps, and boundaries before background
- no redundant prose: keep facts, rules, commands, exceptions, and validation; remove filler
- no ambiguity: prefer explicit conditions and exact actions over vague guidance
- executable commands: any documented command must run as written
- verifiable rules: readers must be able to tell whether they followed the rule correctly
- rules before explanation: operational content comes before rationale
- stable structure: same document type uses the same section order where practical
- reference instead of duplication: when a rule already has an owner, link to it instead of restating it

## Documentation Ownership

| Document | Owns | Does not own |
| --- | --- | --- |
| `AGENTS.md` | repo contract, documentation principles, runtime facts, branch facts, hard boundaries | deep implementation details, large reference material |
| `DEV.md` | local bootstrap and shortest repeatable work loop | repo contract, branch policy, proof matrix |
| `ai/repo.yaml` | machine-readable repo facts and document registry | prose explanations |
| `ai/task-router.md` | task-to-path and task-to-doc routing | runtime facts, proof rules |
| `ai/validation.md` | minimum proof by change type | bootstrap, business logic details |
| `ai/architecture.md` | compact repo mental model and stable path map | execution checklists |
| `docs/agents/ai-dev-guide.md` | development execution workflow | repo facts already owned by `AGENTS.md` |
| `docs/agents/ai-testing-guide.md` | testing execution workflow | deep test patterns and troubleshooting detail |
| `docs/agents/testing-patterns.md` | reusable testing patterns and templates | operational test state |
| `docs/agents/testing-troubleshooting.md` | failure diagnosis and recovery steps | strategy or backlog state |
| `docs/agents/test_todo_list.md` | current testing execution state | long-term testing strategy |
| `docs/agents/test_improvement_plan.md` | long-term testing strategy | current operational queue state |
| `docs/agents/prepush-gate-policy.md` | proposed gate policy and rollout contract | current runtime truth unless explicitly stated |
| `docs/agents/supabase-branching.md` | frontend environment selection and database ownership workflow | schema truth |
| `docs/agents/public-classifications-gz-usage.md` | classification asset read path and file mapping | general app architecture |
| `docs/agents/util_calculate.md` | life-cycle-model calculation reference | repo-wide workflow rules |
| `docs/agents/team_management.md` | team-management business reference | frontend execution workflow |
| `docs/agents/data_audit_instruction.md` | audit status and transition reference | testing or branch workflow |
| `docs/agents/contribution-path-analysis-design.md` | proposed contribution-path design | runtime contract |
| `docs/agents/lca-analysis-visualization-plan.md` | proposed analysis UI plan | runtime contract |
| `.github/PULL_REQUEST_TEMPLATE/*.md` | required PR facts and proof fields | repo policy explanation |

## Load Order

Read in this order:

1. `AGENTS.md`
2. `ai/repo.yaml`
3. `ai/task-router.md`
4. `ai/validation.md` or `ai/architecture.md`
5. the narrow document that owns the current subject

Do not start from a deep reference or design doc unless the task is already scoped to that subject.

## Runtime Facts

- package manager: `npm`
- Node baseline: `>=24` (`nvm use 24`; `.nvmrc` is pinned to `24`)
- default dev command: `npm start`
- explicit dev alias: `npm run start:dev`
- explicit main-env command: `npm run start:main`
- full protected-branch gate: `npm run prepush:gate`
- app-side Supabase access belongs only in `src/services/**`
- new npm dependencies require human approval
- repo-local AI doc maintenance is enforced by `.github/workflows/ai-doc-lint.yml`

## Ownership Boundaries

This repo owns:

- shipped product behavior under `src/**`
- route wiring under `config/routes.ts`
- app runtime setup under `config/**` and `src/app.tsx`
- app-side Supabase and API access under `src/services/**`
- shared UI and locale surfaces under `src/components/**` and `src/locales/**`
- static assets consumed by the app under `public/**`
- self-hosted sync helpers under `docker/**`
- desktop packaging under `electron/**`, `electron-builder.json`, and `icons/**`

This repo does not own:

- database schema, migrations, seeds, or Supabase branch governance
- Edge Function runtime behavior
- public docs-site content
- solver or compute-engine internals
- root workspace integration after merge

Route those tasks to:

- `database-engine` for schema truth and Supabase branch governance
- `edge-functions` for Edge runtime and API orchestration behavior
- `next-docs` for public docs-site content
- `calculator` for solver and compute behavior
- `lca-workspace` for root integration after merge

## Branch And Delivery Facts

- GitHub default branch: `main`
- true daily trunk: `dev`
- routine branch base: `dev`
- routine PR base: `dev`
- promote path: `dev -> main`
- `main` pushes deploy the web app
- `v*` tags build draft Electron releases

Do not infer daily workflow from GitHub default-branch UI alone.

## Authoritative Commands

Use these as the canonical repo commands:

```bash
npm install
npm start
npm run start:dev
npm run start:main
npm run lint
npm test
npm run test:coverage
npm run test:coverage:assert-full
npm run test:coverage:report
npm run build
npm run prepush:gate
```

## Documentation Update Rules

- if a repo fact changes, update `AGENTS.md` and `ai/repo.yaml`
- if task routing changes, update `ai/task-router.md`
- if proof requirements change, update `ai/validation.md`
- if local bootstrap changes, update `DEV.md`
- if dev workflow changes, update `docs/agents/ai-dev-guide.md`
- if testing workflow changes, update `docs/agents/ai-testing-guide.md` and `docs/agents/test_todo_list.md`
- if testing strategy changes, update `docs/agents/test_improvement_plan.md`
- if a narrow domain rule changes, update only the domain reference that owns it
- do not copy the same rule into multiple docs just to make it easier to find

## Hard Boundaries

- do not author schema or migration truth here
- do not hand-edit `docker/volumes/functions/**`; refresh it via `docker/pull-edge-functions.sh`
- do not create ad-hoc Supabase clients outside `src/services/**`
- do not treat a merged repo PR here as workspace-delivery complete if the root repo still needs a submodule bump

## Workspace Integration

A merged PR in `tiangong-lca-next` is repo-complete, not delivery-complete.

If the change must ship through the workspace:

1. merge the child PR into `tiangong-lca-next`
2. promote or select an eligible child SHA according to workspace policy
3. update the `lca-workspace` submodule pointer deliberately
