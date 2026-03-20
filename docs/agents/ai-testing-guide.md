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

# Full coverage
npm run test:coverage
npm run test:coverage:report

# Equivalent full unit/src phase used by the shared runner
npx jest tests/unit src --maxWorkers=50% --testTimeout=20000

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

- Directional goal: move toward 100% meaningful coverage across `src/**`.
- Enforced gate (current): Jest global thresholds in `jest.config.cjs`.
- Workflow stability note: the shared `npm test` runner caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker crashes observed in full local and pre-push runs on macOS.
- Latest verified full run on March 20, 2026 (`npm run test:coverage:report`, which reruns `npm run test:coverage`) is `288 suites / 3476 tests` with:
  - Statements: `100.00%` (20013/20013)
  - Branches: `100.00%` (11419/11419)
  - Functions: `100.00%` (4379/4379)
  - Lines: `100.00%` (19143/19143)
- Current all-file inventory from the same run:
  - Source files tracked: `313`
  - Fully covered files (`100/100/100/100`): `313`
  - Files with remaining gaps: `0`
  - Branch buckets: `<50 = 0`, `50-70 = 0`, `70-90 = 0`, `90-<100 = 0`
  - `line=100` but `branch<100`: `0`
- The closure queue is empty. The repo is now in maintenance mode: keep every touched or newly added `src/**` file at `100/100/100/100`, and only reopen queue execution when a future regression appears in the coverage report.
- Active execution backlog lives in `docs/agents/test_todo_list.md`; `docs/agents/test_improvement_plan.md` is the strategic companion doc.
- `npm run test:coverage` and `npm run test:coverage:report` already include the required heap setting; use manual `NODE_OPTIONS=...` prefixes only when debugging outside package scripts.
- Report detail policy:
  - `npm run test:coverage:report`: default review output. It prints the global summary, category summary, closure-queue summary, shared-fixture batches, and the next 25 ordered incomplete files using full project-relative paths (no `...` truncation for file or cluster labels).
  - `node scripts/test-coverage-report.js --full`: full ordered incomplete-file queue. Use this to inspect the entire file-by-file state or refresh the backlog snapshot.
  - When the repo is fully covered, both report commands explicitly print `No files with remaining coverage gaps.`; keep using them to verify maintenance-mode health after meaningful changes.
  - Queue order is deterministic: `branches asc -> lines asc -> statements asc -> functions asc -> path`.
- Queue strategy:
  - Do not re-rank work by ad hoc “highest ROI” judgments.
  - While the queue is empty, keep every touched or newly added `src/**` file at `100/100/100/100`.
  - If the queue reopens, pick the first file in the ordered closure queue and drive it toward `100/100/100/100` where meaningful before moving on.
  - Allowed queue exceptions are narrow: batch adjacent files that share the same mock/fixture/test harness, or fix a shared test-infrastructure blocker first if it blocks the current file or its immediate neighbors.
  - If a queued branch is provably unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests just to satisfy coverage.
- Do not raise coverage thresholds yet; the next quality gain should come from keeping full closure intact, not from moving the gate.

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
- If test workflow/backlog or baseline changed, sync `test_todo_list.md`; if long-term plan or baseline summary changed, sync `test_improvement_plan.md` too, plus `_CN` mirrors.
