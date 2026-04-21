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

AI contract docs under `AGENTS.md`, `ai/**`, and `docs/agents/**` are maintained in English.

Chinese mirrors are retained only for README surfaces:

- `README_CN.md`
- `docker/README.zh-CN.md`

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

Do not start with long plans or GitHub default-branch UI.

## Runtime Baseline

- Node.js baseline: `>=24` (`nvm use 24`; `.nvmrc` is pinned to `24`)
- Tech stack: React 18 + `@umijs/max` 4 + Ant Design Pro 5 + TypeScript
- Package manager: `npm`
- Repo-local AI-doc maintenance is enforced by `.github/workflows/ai-doc-lint.yml` with the vendored `.github/scripts/ai-doc-lint.*` files
- `npm start` and `npm run start:dev` both target the shared persistent Supabase `dev` environment; use `npm run start:main` only when the task explicitly needs the `main` environment
- App-side Supabase access belongs only in `src/services/**`
- Schema truth, migrations, and database config live in `tiangong-lca/database-engine`, not here
- Edge Function SQL must read configuration from branch-level Vault secrets such as `project_url` and `project_secret_key`, plus legacy `project_x_key` when `generate_flow_embedding()` compatibility is required; never hardcode branch URLs or service keys into SQL, migrations, or baseline dumps
- No new npm dependencies without human approval

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

Development workflow summary:

- Sync the latest `dev` before cutting routine feature branches
- Routine feature and fix PRs target `dev`
- Validate integration on the shared Supabase `dev` environment after merging into `dev`
- Open release-promotion PRs from `dev` to `main` only after `dev` is verified
- Use `main` only for promotion, production verification, or hotfix work; if a hotfix starts from `main`, back-merge `main -> dev` afterward

Do not infer the daily trunk from GitHub UI defaults.

## Core Commands

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
npm run prepush:gate
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run build
```

Notes:

- `npm start` and `npm run start:dev` are equivalent `dev` targets; `npm run start:main` is the explicit `main` target
- `npm test` runs the CI-style runner in `scripts/test-runner.cjs`, with unit first and then integration
- The shared runner keeps the unit/src stage at `--maxWorkers=50%` to avoid intermittent local/pre-push Jest worker `SIGSEGV` failures
- `npm run test:coverage` and `npm run test:coverage:report` already set `NODE_OPTIONS=--max-old-space-size=8192`
- `npm run test:coverage:assert-full` reads the latest coverage artifacts and fails unless statements, branches, functions, and lines all remain at `100%`
- `npm run prepush:gate` is the authoritative full gate: `lint + full coverage + strict 100% assertion`
- `.husky/pre-push` auto-runs that heavy gate only on local `main` pushes; PRs targeting `dev` or `main` must pass the same command in GitHub Actions
- `npm run test:coverage:report` is the default coverage review artifact; it prints global summaries, category summaries, queue summaries, shared fixture batches, and the next uncovered files with full project-relative paths
- Use `npm run test:ci -- <jest-args>` instead of nesting extra flags after `npm test`

## Read-On-Demand Docs

Open only the narrow doc that matches the task:

1. Product or page development
   - `docs/agents/ai-dev-guide.md`
2. Any test writing or troubleshooting
   - `docs/agents/ai-testing-guide.md`
   - `docs/agents/testing-patterns.md`
   - `docs/agents/testing-troubleshooting.md`
3. Lifecycle-model calculation logic
   - `docs/agents/util_calculate.md`
4. Coverage gaps and testing backlog state
   - `docs/agents/test_todo_list.md`
   - `docs/agents/test_improvement_plan.md`
5. Team management or audit workflow
   - `docs/agents/team_management.md`
   - `docs/agents/data_audit_instruction.md`
6. Supabase environment and database workflow
   - `docs/agents/supabase-branching.md`
7. Static classification bundle usage
   - `docs/agents/public-classifications-gz-usage.md`

## Key Paths

- `config/routes.ts`: route-family entrypoints such as `/tgdata`, `/codata`, `/mydata`, and `/tedata`
- `tiangong-lca/database-engine/supabase/**`: source of truth for schema and database config inside the workspace; do not recreate that truth here
- `.env.supabase.*.local(.example)`: database-maintenance env files now live in `database-engine`; do not reintroduce or maintain them here
- `src/services/**`: the only allowed app-side Supabase boundary
- `src/pages/<Feature>/`: feature page entrypoints and nearby `Components/`
- `src/components/**`, `src/contexts/**`, `types/**`: shared UI, context, and type surfaces
- `tests/{unit,integration}/**`: Jest suites; reusable helpers live under `tests/helpers/**`
- `docker/volumes/functions/**`: synced edge-function mirror; do not hand-edit it in this repo
- `docker/pull-edge-functions.sh`: the only supported way to refresh `docker/volumes/functions/**`

## UI Consistency / Ant Design First

UI consistency is a product-level requirement in this repository.

When implementing or modifying frontend UI here:

1. Reuse existing shared components and established project patterns first.
2. If no shared abstraction fits, prefer native Ant Design components, documented props, built-in variants, and standard interaction patterns.
3. For visual-consistency decisions, prefer Ant Design theme tokens, component tokens, or existing project token abstractions instead of hardcoded colors or dimensions.
4. Avoid unnecessary custom visual styling. If Ant Design or an existing shared abstraction already solves the need, custom CSS, inline styles, and local CSS modules should not be the default path.
5. Use custom styling only when Ant Design props/tokens or the current shared abstractions cannot reasonably satisfy the requirement. Keep overrides small, stay inside the existing product language, and explain the reason in code comments or the PR when it is not obvious.
6. If a custom visual pattern starts repeating, extract it into a shared component or reusable abstraction instead of duplicating local overrides.

## Delivery Constraints

- Research first with `rg`, nearby implementations, and existing tests
- Keep business logic in services and utilities; React components should mainly orchestrate
- Code changes must ship with tests
- Repo-wide coverage must remain at `100%` for statements, branches, functions, and lines
- `npm run lint` must pass
- Run focused Jest suites relevant to the change
- If you only need the hard coverage assertion, run `npm run test:coverage:assert-full`
- Before a local `main` push, pass `npm run prepush:gate`
- PRs targeting `dev` or `main` must pass the same full gate in GitHub Actions before merge
- On non-`main` branches, run `npm run prepush:gate` manually when you need to preflight the protected-branch gate before opening or updating a PR
- If `npm run test:coverage:report` shows new gaps, work through the ordered queue in `docs/agents/test_todo_list.md`; if no gaps remain, keep the repo in maintenance mode
- The only allowed queue exceptions are adjacent files that share one mock/fixture/test harness batch, or files temporarily blocked by testing-infrastructure issues
- If a queued file contains a provably unreachable or business-invalid branch, remove that dead branch without changing behavior instead of inventing tests for it
- If test engineering changes (commands, baseline, workflow, or backlog state), update `docs/agents/ai-testing-guide.md` and `docs/agents/test_todo_list.md`; update `docs/agents/test_improvement_plan.md` and related testing docs only when long-term strategy or baseline context changes
- Keep diffs scoped; update docs whenever behavior, workflow, or command expectations change
- Do not hand-edit `docker/volumes/functions/**`; refresh it via `docker/pull-edge-functions.sh`

## Documentation Maintenance

- Command examples must stay runnable against the current scripts
- Avoid copying long explanations across docs; reference the source doc instead
- If workflow guidance changes, update this entry doc first
- For testing changes, update `docs/agents/test_todo_list.md` first; update `docs/agents/test_improvement_plan.md` only when the long-term strategy or baseline summary changes
- Only README surfaces keep Chinese mirrors; other repo docs are English-only

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
