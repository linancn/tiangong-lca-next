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
npm run test:coverage:assert-full
npm run test:coverage:report
npm run prepush:gate

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
- Hard requirement: any code change must leave repo-wide statements, branches, functions, and lines at `100%`.
- Enforced gate (current): Jest global thresholds in `jest.config.cjs`.
- Workflow stability note: the shared `npm test` runner caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker crashes observed in full local and pre-push runs on macOS.
- Latest verified full run on March 24, 2026 (`npm run test:coverage:report`, followed by `npm run test:coverage:assert-full`) is `309 suites / 3689 tests` with:
  - Statements: `100.00%` (21875/21875)
  - Branches: `100.00%` (12565/12565)
  - Functions: `100.00%` (4750/4750)
  - Lines: `100.00%` (20967/20967)
- Current all-file inventory from the same run:
  - Source files tracked: `334`
  - Fully covered files (`100/100/100/100`): `334`
  - Files with remaining gaps: `0`
  - Branch buckets: `<50 = 0`, `50-70 = 0`, `70-90 = 0`, `90-<100 = 0`
  - `line=100` but `branch<100`: `0`
- The closure queue is empty. The repo is now in maintenance mode: keep every touched or newly added `src/**` file at `100/100/100/100`, and only reopen queue execution when a future regression appears in the coverage report.
- Push gate: `.husky/pre-push` now runs `npm run prepush:gate`, which means `lint + npm run test:coverage + npm run test:coverage:assert-full`. If coverage drops below full closure, push is blocked locally.
- Active execution backlog lives in `docs/agents/test_todo_list.md`; `docs/agents/test_improvement_plan.md` is the strategic companion doc.
- `npm run test:coverage` and `npm run test:coverage:report` already include the required heap setting; use manual `NODE_OPTIONS=...` prefixes only when debugging outside package scripts.
- Report detail policy:
  - `npm run test:coverage:report`: default review output. It prints the global summary, category summary, closure-queue summary, shared-fixture batches, and the next 25 ordered incomplete files using full project-relative paths (no `...` truncation for file or cluster labels).
  - `npm run test:coverage:assert-full`: strict assertion mode for the latest coverage artifact. It fails unless every tracked source file remains at `100/100/100/100`.
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
- Use `npm run prepush:gate` when you want to emulate the exact local push gate before an actual push.

## Integration Completion Standard

- Do not treat integration testing as a code-coverage race. Keep the repo-wide `100/100/100/100` gate, but measure integration depth by workflow confidence rather than by forcing `tests/integration` alone to hit `100%` code coverage.
- Use this 100-point scorecard for large integration programs:
  - Functional workflow coverage: `40` points.
    - The page loads, the primary user action completes, the visible UI refreshes, and the relevant `@/services/**` boundary is asserted.
  - Variant matrix coverage: `25` points.
    - Cover route/data-source prefixes, role/permission states, and URL/query initialization states.
  - Error and fallback coverage: `15` points.
    - Cover list-load failure, create/update failure, delete failure or cancel, empty state, and user-visible recovery.
  - Navigation and side-effect coverage: `10` points.
    - Cover `history.push`, `history.replace`, `window.location.href`, `window.location.reload`, and similar browser-owned transitions.
  - Engineering quality: `10` points.
    - Keep mocks deterministic, assertions semantic, file scope maintainable, and skipped tests explicitly justified.
- Suggested readiness thresholds:
  - `85-100`: release-ready integration coverage for that workflow.
  - `70-84`: solid base, but matrix or fallback gaps still exist.
  - `50-69`: mostly happy-path coverage; risky for refactors.
  - `<50`: smoke-only confidence.
- Repository-specific default priority order for new integration work:
  1. Route/data-source matrix on pathname-driven pages (`LifeCycleModels`, `Processes`, `Flows`, `Flowproperties`, `Unitgroups`, `Sources`, `Contacts`).
  2. Permission and role matrices (`Teams`, `ManageSystem`, `Review`).
  3. URL/query-driven and cross-page flows (`Login`, `Welcome`, `Processes/Analysis`, deep-link drawers).
  4. Failure/fallback behavior on the same workflows.
  5. Thin browser-real smoke only when integration tests cannot credibly model the behavior.
- Current checkpoint (March 21, 2026): phases 1-3 are complete and Phase 4 is now in progress. The repo already covers welcome-modal empty responses plus thumbnail-failure fallback, login registration fallback states, processes empty-result and thrown-request recovery, and account credential/load/email failure flows; the default next increment is the remaining create/update/delete and cancel anchors on the same workflows.
- E2E rule: prefer integration tests first. Escalate only a very thin smoke layer to future E2E for browser-real behaviors such as redirect chains, file upload/preview, reloads, or window-level navigation.

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
