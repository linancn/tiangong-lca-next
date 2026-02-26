# AGENTS – Tiangong LCA Next

Use this file as the single entry point for coding agents.

> Language contract: agents load English docs only (no `_CN` suffix). Every edited English doc must update its `_CN` mirror in the same change.

## Why This File Exists

- Minimize context/token usage: start here, then open only the docs needed for the current task.
- Keep requirements consistent across development, testing, and delivery.

## Runtime Baseline

- Node.js **>= 24** (`nvm use 24`; `.nvmrc` is `24`).
- Stack: React 18 + `@umijs/max` 4 + Ant Design Pro 5 + TypeScript.
- Supabase env keys are prewired via fallback `.env`; do not create ad-hoc Supabase clients outside `src/services/**`.
- Do not add npm dependencies without explicit human approval.

## Core Commands

```bash
npm install
npm start
npm run lint
npm test
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run build
```

Notes:

- `npm test` runs the CI-style runner (`scripts/test-runner.cjs`): unit first, then integration.
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
   - `docs/agents/test_todo_list.md` (actionable execution backlog)
   - `docs/agents/test_improvement_plan.md` (long-term context)
5. Team/data audit process tasks
   - `docs/agents/team_management.md`
   - `docs/agents/data_audit_instruction.md`

## Repo Landmarks

- `config/routes.ts`: mirrored route branches (`/tgdata`, `/codata`, `/mydata`, `/tedata`).
- `src/services/**`: only allowed boundary for Supabase calls.
- `src/pages/<Feature>/`: page entry + `Components/` drawers/modals.
- `src/components/**`, `src/contexts/**`, `types/**`: shared UI/context/types.
- `tests/{unit,integration}/**`: Jest suites + shared helpers in `tests/helpers/**`.

## Delivery Contract

- Investigate first (`rg`, nearest feature, existing tests).
- Keep business logic in services/utilities; React layers stay orchestration-focused.
- Add/adjust tests matching scope.
- `npm run lint` must pass.
- Run focused Jest suites relevant to the change.
- Keep diffs scoped; update docs when expectations or workflows change.

## Documentation Maintenance

When editing any English doc (`*.md` without `_CN`):

1. Update the corresponding `_CN` mirror in the same commit.
2. Keep command examples executable against current scripts.
3. Avoid duplicating long guidance across files; link back to the source doc.
4. If workflow changed, update this file first (entry-point accuracy).
