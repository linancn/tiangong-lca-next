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
- Latest verified full run on March 14, 2026 (`npm run test:coverage`) is `275 suites / 2248 tests` with:
  - Statements: `84.83%` (15617/18408)
  - Branches: `71.60%` (7689/10738)
  - Functions: `80.07%` (3138/3919)
  - Lines: `85.15%` (14965/17573)
- The branch gate is healthy. Execution is now a hotspot-ordered closure workflow rather than gate recovery.
- Active execution backlog lives in `docs/agents/test_todo_list.md`; `docs/agents/test_improvement_plan.md` is the strategic companion doc.
- `npm run test:coverage` and `npm run test:coverage:report` already include the required heap setting; use manual `NODE_OPTIONS=...` prefixes only when debugging outside package scripts.
- Report detail policy:
  - `npm run test:coverage:report`: default review output. It prints global summary, category summary, top branch hotspots, top line hotspots, and uncovered line ranges for each hotspot.
  - `node scripts/test-coverage-report.js --full`: full per-file listing. Use this only when the backlog order itself needs to change or when one hotspot bucket is nearly closed and the next bucket must be selected.
  - Keep future work ordered by the report itself, not by ad hoc “highest ROI” judgments: clear branch hotspots below 50% first, then 50%-70%, then remaining line hotspots and service/util files.
- Do not raise coverage thresholds yet; the next quality gain should come from shrinking the hotspot list, not from moving the gate.

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
