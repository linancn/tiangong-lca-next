# AI Testing Guide – Tiangong LCA Next

> Read this first for any test task. Start from `AGENTS.md`, then use this file as the short execution checklist. Mirror requirement: update `docs/agents/ai-testing-guide_CN.md` together with this file.

## Environment

- Node.js **>= 24** (`nvm use 24`).
- Jest + Testing Library are preconfigured.
- Reuse existing helpers and mocks under `tests/helpers/**` and `tests/mocks/**`.
- Do not add test-only dependencies without approval.

## Fast Workflow (Required)

1. Parse task scope: feature, workflow, and test type (unit/integration/component).
2. Inspect existing code and tests (`src/pages/**`, `src/services/**`, `tests/**`) and review `docs/agents/test_todo_list.md` for the active backlog.
3. Reuse project patterns from `testing-patterns.md`.
4. Mock services before render.
5. Write semantic assertions (`getByRole`, `findByText`, `waitFor`).
6. Run focused suites + lint and report exact commands.

## Critical Guardrails

- Mock every network/service touch (`supabase`, `@/services/**`) before calling `render`.
- Prefer `mockResolvedValue` / `mockRejectedValue` for deterministic async behavior.
- Reset/clear mocks between tests.
- Never render first and mock later.
- Never leave async flows unresolved (missing `await` / `waitFor`).
- Avoid per-call object creation inside `mockImplementation` when it causes unstable references.

## Reliable Commands

```bash
# Full local gate (same as CI style)
npm test

# Focused integration suite
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# Focused unit/component suite
npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# Single-file open-handle debugging
npm run test:ci -- tests/integration/processes/ProcessesWorkflow.integration.test.tsx \
  --runInBand --testTimeout=20000 --detectOpenHandles

# Watch mode during development (direct Jest)
npx jest tests/unit/services/processes/ --watch

# Lint gate
npm run lint
```

## Coverage Expectations

- Directional goal: move toward near-100% meaningful coverage.
- Enforced gate (current): Jest global thresholds in `jest.config.cjs`.
- Latest verified full run on March 12, 2026 (`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`) is at 47.79% global branch coverage, so treat P0 in `docs/agents/test_todo_list.md` as an active blocker.
- Active execution backlog lives in `docs/agents/test_todo_list.md`; `docs/agents/test_improvement_plan.md` is the strategic companion doc.
- Use coverage runs to identify gaps:

```bash
npm run test:coverage
npm run test:coverage:report
```

- If local full coverage runs need more heap, use `NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage` and record the command you validated with.

## Related Docs

- `docs/agents/testing-patterns.md`: templates and reusable patterns.
- `docs/agents/testing-troubleshooting.md`: failure diagnosis matrix.
- `docs/agents/test_todo_list.md`: actionable backlog and current execution status.
- `docs/agents/test_improvement_plan.md`: longer-range context and priorities.

## Delivery Checklist

- Tests added/updated for every changed behavior.
- `npm run lint` passes.
- Focused Jest commands pass.
- No leaked handles in stubborn suites (`--detectOpenHandles` when needed).
- If test workflow/backlog changed, sync `test_todo_list.md`; if long-term plan or baseline summary changed, sync `test_improvement_plan.md` too, plus `_CN` mirrors.
