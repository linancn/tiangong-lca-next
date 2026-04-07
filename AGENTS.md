# AGENTS – Tiangong LCA Next

Use this file as the single entry point for coding agents.

> Language contract: agents load English docs only (no `_CN` suffix). Every edited English doc must update its `_CN` mirror in the same change.

## Why This File Exists

- Minimize context/token usage: start here, then open only the docs needed for the current task.
- Keep requirements consistent across development, testing, and delivery.

## Runtime Baseline

- Node.js **>= 24** (`nvm use 24`; `.nvmrc` is `24`).
- Stack: React 18 + `@umijs/max` 4 + Ant Design Pro 5 + TypeScript.
- Supabase env keys are prewired via committed env files: use `npm start` as the default entry point for the persistent Supabase `dev` branch, keep `npm run start:dev` as the equivalent explicit dev alias, and use `npm run start:main` only when a task explicitly needs the `main` database. Do not create ad-hoc Supabase clients outside `src/services/**`.
- Database-side Edge Function SQL must read branch-specific Vault secrets. Standard webhook auth uses `project_url` and `project_secret_key`; legacy `generate_flow_embedding()` compatibility additionally uses `project_x_key`. Never hardcode branch URLs or service keys in SQL, migrations, or baseline dumps.
- Supabase Branching uses one shared `supabase/` directory: root config is the production baseline inherited by preview branches, while `[remotes.dev]` stores persistent-dev overrides. Do not clone per-branch `supabase/` directories or add a parallel `supabase db push` GitHub Action on top of Supabase GitHub integration.
- Do not add npm dependencies without explicit human approval.

## Development Workflow Summary

- This repository keeps GitHub default branch `main` as a platform exception, but the daily trunk is Git `dev`.
- Routine branch progression is `feature/* -> dev -> main`.
- Start normal work from the latest Git `dev`, then create a feature branch from `dev`.
- Open routine feature and fix PRs into Git `dev`, not directly into Git `main`.
- Use `npm start` for routine frontend work against the shared persistent Supabase `dev` branch; `npm run start:dev` remains the equivalent explicit alias.
- Create schema changes locally with the Supabase CLI and committed migration files. Do not use the shared remote `dev` database as the first place to author schema changes.
- After a PR merges into Git `dev`, verify the integrated result in the shared Supabase `dev` branch.
- Promote validated changes by opening a PR from Git `dev` into Git `main`.
- Use `main` only through the explicit `npm run start:main` workflow for task-specific verification, production investigation, or hotfix work.
- Branch from Git `main` only when the work must start from production, such as a hotfix. After that work merges to `main`, back-merge `main` into `dev`.
- Do not infer the daily trunk from GitHub default-branch UI alone; in this repository, routine work still starts from `dev`.
- `docs/agents/supabase-branching.md` is the canonical detailed procedure for branch and database workflow.

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

- `npm start` and `npm run start:dev` are equivalent dev-target commands. `npm run start:main` is the explicit main-target command.
- `npm test` runs the CI-style runner (`scripts/test-runner.cjs`): unit first, then integration.
- The unit/src phase is capped at `--maxWorkers=50%` in the shared runner to avoid intermittent Jest worker `SIGSEGV` crashes during full local gates and pre-push hooks.
- `npm run test:coverage` and `npm run test:coverage:report` already include `NODE_OPTIONS=--max-old-space-size=8192`; use the scripts directly for full coverage work.
- `npm run test:coverage:assert-full` reads the latest coverage artifact and fails unless the repo is still at `100%` statements / branches / functions / lines with zero remaining queue files.
- `npm run prepush:gate` is the local push gate: `lint + full coverage + strict 100% assertion`.
- `npm run test:coverage:report` is the default coverage review artifact. It prints the global summary, category summary, closure-queue summary, shared-fixture batches, and the next 25 ordered incomplete files using full project-relative paths (no `...` truncation for file/cluster labels).
- `node scripts/test-coverage-report.js --full` prints the full ordered incomplete-file queue. Use it to inspect the full file-by-file state or refresh the queue snapshot, not to subjectively re-rank by ROI.
- For focused suites with extra flags, prefer `npm run test:ci -- <jest-args>` instead of nesting flags after `npm test`.

## Token-Efficient Doc Routing

Read only what matches the current task:

1. Feature/page implementation
   - `docs/agents/ai-dev-guide.md`
2. Any test creation/debugging
   - `docs/agents/ai-testing-guide.md` (first)
   - `docs/agents/testing-patterns.md` (templates)
   - `docs/agents/testing-troubleshooting.md` (failures/timeouts/handles)
3. Lifecycle-model calculation changes
   - `docs/agents/util_calculate.md`
4. Test coverage backlog tracking
   - `docs/agents/test_todo_list.md` (actionable source of truth)
   - `docs/agents/test_improvement_plan.md` (long-term context and strategy)
5. Team/data audit process tasks
   - `docs/agents/team_management.md`
   - `docs/agents/data_audit_instruction.md`
6. Supabase Branching / environment configuration
   - `docs/agents/supabase-branching.md`

## Repo Landmarks

- `config/routes.ts`: mirrored route branches (`/tgdata`, `/codata`, `/mydata`, `/tedata`).
- `supabase/config.toml`: Supabase config-as-code baseline. Root settings apply to production and preview branches; `[remotes.dev]` holds the persistent dev branch overrides.
- `src/services/**`: only allowed boundary for Supabase calls.
- `src/pages/<Feature>/`: page entry + `Components/` drawers/modals.
- `src/components/**`, `src/contexts/**`, `types/**`: shared UI/context/types.
- `tests/{unit,integration}/**`: Jest suites + shared helpers in `tests/helpers/**`.
- `docker/volumes/functions/**`: synced self-hosted edge-functions mirror. Do not edit these files in `tiangong-lca-next`.
- `docker/pull-edge-functions.sh`: the only supported way to refresh `docker/volumes/functions/**` in this repo.

## UI Consistency / Ant Design First

For `tiangong-lca-next`, UI consistency is a hard product requirement.

When implementing or modifying frontend UI in this repository, follow these rules:

1. Reuse existing shared components and established project patterns first.
2. If no suitable shared abstraction exists, prefer Ant Design native components, documented props, built-in variants, and standard interaction patterns.
3. For visual decisions that affect product consistency, prefer Ant Design theme tokens, component tokens, or established project token abstractions over ad-hoc hard-coded values.
4. Avoid unnecessary custom visual styling. Custom CSS, inline styles, and local CSS modules are not the default path when Ant Design or existing shared abstractions can already satisfy the requirement.
5. Custom styling is allowed only when Ant Design props, tokens, or existing shared abstractions cannot reasonably satisfy the requirement. In such cases, keep the override minimal, preserve the established visual language, and explain the reason in the PR description or code comments when it is not obvious.
6. If a custom visual pattern starts repeating, extract it into a shared component or reusable abstraction instead of duplicating it locally.

Clarification:

- This rule targets product-facing visual styling and interaction consistency, not a total ban on layout code.
- Local layout styling is acceptable when appropriate, but prefer existing project patterns and Ant Design layout primitives for simple composition before introducing one-off visual treatments.

## Delivery Contract

- Investigate first (`rg`, nearest feature, existing tests).
- Keep business logic in services/utilities; React layers stay orchestration-focused.
- Add/adjust tests matching scope.
- Any code change is a hard requirement to keep repo-wide coverage at `100%` for statements, branches, functions, and lines.
- `npm run lint` must pass.
- Run focused Jest suites relevant to the change.
- Run `npm run test:coverage:assert-full` whenever you need to verify the hard gate without rerunning coverage.
- Before push, the repo must pass `npm run prepush:gate`; do not bypass the local full-coverage gate unless a human explicitly instructs you to.
- If `npm run test:coverage:report` shows gaps, follow the ordered closure queue in `docs/agents/test_todo_list.md` one file at a time. If it shows no gaps, stay in maintenance mode and keep the repo at full closure.
- Allowed queue exceptions: batch adjacent files that share the same mock/fixture/test harness, and fix blocking test-infrastructure issues first when they block the current file or its immediate neighbors.
- If a queued file contains a provably unreachable or business-invalid branch, remove the dead branch without changing behavior instead of inventing synthetic tests, then continue queue order.
- If test engineering changed (commands, coverage baseline, backlog status, workflow), sync `docs/agents/ai-testing-guide.md`, `docs/agents/test_todo_list.md`, and when strategic context changed also `docs/agents/test_improvement_plan.md`, plus all `_CN` mirrors.
- Keep diffs scoped; update docs when expectations or workflows change.
- Never hand-edit `docker/volumes/functions/**`; sync it via `./docker/pull-edge-functions.sh`.

## Documentation Maintenance

When editing any English doc (`*.md` without `_CN`):

1. Update the corresponding `_CN` mirror in the same commit.
2. Keep command examples executable against current scripts.
3. Avoid duplicating long guidance across files; link back to the source doc.
4. If workflow changed, update this file first (entry-point accuracy).
5. For testing-related changes, update `docs/agents/test_todo_list.md` first; if the long-term plan or baseline summary changed, update `docs/agents/test_improvement_plan.md` too.
