---
title: next Task Router
docType: router
scope: repo
status: active
authoritative: false
owner: next
language: en
whenToUse:
  - when you already know the task belongs in this repo but need the right first path or next document
  - when deciding whether a change belongs in routes, pages, services, static assets, tests, or repo docs
  - when deciding which document owns the rule you need
whenToUpdate:
  - when high-frequency work areas change
  - when routing between docs becomes misleading
  - when repo boundaries move
checkPaths:
  - AGENTS.md
  - ai/repo.yaml
  - ai/task-router.md
  - ai/validation.md
  - ai/architecture.md
  - docs/agents/**
lastReviewedAt: 2026-04-21
lastReviewedCommit: 25d9c1e2799929b4fb3f8a524b2a47931a7b0dc8
related:
  - ../AGENTS.md
  - ./repo.yaml
  - ./validation.md
  - ./architecture.md
---

## Load Order

1. `AGENTS.md`
2. `ai/repo.yaml`
3. this file
4. `ai/validation.md` or `ai/architecture.md`
5. the narrow document that owns the current subject

## Task Routing

| Task intent | Inspect first | Next document |
| --- | --- | --- |
| change a page, route family, layout, or shared UI flow | `config/routes.ts`, `src/app.tsx`, `src/pages/**`, `src/components/**`, `src/locales/**` | `docs/agents/ai-dev-guide.md` |
| change app-side service logic or env selection | `config/supabaseEnv.ts`, `src/services/**` | `docs/agents/supabase-branching.md`, `docs/agents/ai-dev-guide.md` |
| change tests, coverage, or protected-branch gates | `tests/**`, `jest.config.cjs`, `.husky/pre-push`, `.github/workflows/**`, `scripts/test-runner.cjs`, `scripts/test-coverage-report.js` | `docs/agents/ai-testing-guide.md`, `docs/agents/test_todo_list.md` |
| change lifecycle-model calculation-adjacent behavior | `src/services/lifeCycleModels/**`, nearby pages and components | `docs/agents/util_calculate.md` |
| change task-center or process-analysis behavior | `src/services/lca/**`, `src/components/LcaTaskCenter/**`, `src/pages/Processes/Analysis/**` | `docs/agents/ai-dev-guide.md` |
| change team, review, or system-management flows | `src/pages/Review/**`, `src/pages/ManageSystem/**`, `src/pages/Teams/**`, nearby services | `docs/agents/team_management.md`, `docs/agents/data_audit_instruction.md` |
| change classification, location, or LCIA bundles | `public/**`, consuming services | `docs/agents/public-classifications-gz-usage.md` |
| change repo bootstrap or documentation rules | `AGENTS.md`, `DEV.md`, `ai/**`, `docs/agents/**` | `AGENTS.md` |
| decide minimum proof for a ready change | changed paths plus `package.json` and test scripts | `ai/validation.md` |
| understand repo shape before editing | stable path groups under `config/**`, `src/**`, `public/**`, `docker/**` | `ai/architecture.md` |

## Documentation Routing

| If you need...                     | Owning document                          |
| ---------------------------------- | ---------------------------------------- |
| repo facts and hard boundaries     | `AGENTS.md`                              |
| local setup and shortest work loop | `DEV.md`                                 |
| machine-readable repo facts        | `ai/repo.yaml`                           |
| routing by task                    | `ai/task-router.md`                      |
| proof requirements                 | `ai/validation.md`                       |
| repo mental model                  | `ai/architecture.md`                     |
| dev execution workflow             | `docs/agents/ai-dev-guide.md`            |
| testing execution workflow         | `docs/agents/ai-testing-guide.md`        |
| reusable test patterns             | `docs/agents/testing-patterns.md`        |
| test failure recovery              | `docs/agents/testing-troubleshooting.md` |
| current testing operational state  | `docs/agents/test_todo_list.md`          |
| long-term testing strategy         | `docs/agents/test_improvement_plan.md`   |

## Wrong Turns To Avoid

- editing schema or migration truth in the frontend repo
- hand-editing `docker/volumes/functions/**`
- creating app-side data clients outside `src/services/**`
- treating a design doc as runtime truth
- updating several docs with the same rule instead of updating the owner

## Cross-Repo Handoffs

1. frontend behavior depends on new schema or database policy
   - coordinate with `database-engine`
2. frontend behavior depends on Edge runtime changes
   - coordinate with `edge-functions`
3. product behavior changes need public docs updates
   - coordinate with `next-docs`
4. merged repo work still needs workspace delivery
   - continue in `lca-workspace`
