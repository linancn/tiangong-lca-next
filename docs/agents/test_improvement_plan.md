# Test Improvement Plan

> Snapshot date: March 20, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `npm run test:coverage`
- Current full run footprint: 288 suites / 3476 tests
- Current Jest coverage (full run):
  - Statements: 100.00%
  - Branches: 100.00%
  - Functions: 100.00%
  - Lines: 100.00%
- Current file inventory: 313 tracked source files, 313 fully covered, 0 still incomplete.
- Current branch buckets: `<50 = 0`, `50-70 = 0`, `70-90 = 0`, `90-<100 = 0`.
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **full closure has been achieved. The strategic task is now maintenance: keep every touched or newly added `src/**`file at`100/100/100/100`, and reopen the ordered queue immediately if a future regression appears.\*\*

## Principles

- Long-term target: 100% meaningful coverage across `src/**`.
- Use the coverage report queue as the ordering source of truth; do not re-rank by subjective “highest ROI” judgments.
- When the queue is non-empty, execute one queue file at a time and try to close it to `100/100/100/100` before moving on.
- When the queue is empty, stay in maintenance mode and keep every touched or newly added `src/**` file at `100/100/100/100`.
- Allowed strategy exceptions are narrow: batch adjacent files that share the same mock/fixture/test harness, and fix shared test-infrastructure blockers first only when they block the current file or its immediate neighbors.
- If a queued branch is proven unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again yet; first prove that full closure can be preserved under maintenance.

## Priority Backlog

- [x] Auth reset/forgot flows are covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [x] Recover branch coverage above the global threshold and grow a meaningful safety buffer (current branch coverage: 87.97%).
- [x] Expand tests around `src/pages/Utils/index.tsx`, `src/pages/Utils/review.tsx`, and `src/pages/Utils/updateReference.tsx`.
- [x] Cover contact/source/flow/flowproperty selector and drawer workflows plus lifecycle-model view/edit toolbars and the prior process/review workflow hotspots.
- [x] Add direct coverage for `Flows/Components/Property/*`, login top actions, lifecycle toolbar utility helpers, required-fields maps, and add-member modals.
- [x] Replace the old monolithic coverage dump workflow with a queue-first default report plus `--full` full-queue escape hatch.
- [x] Close the last `<50% branch` queue files in strict order (`src/components/TableFilter/index.tsx` and `src/pages/Unitgroups/Components/edit.tsx`).
- [x] Clear the former `50%-70%` bucket in strict queue order.
- [x] Re-clear the reintroduced `<50% branch` hotspot in strict queue order, led by `src/services/lifeCycleModels/api.ts`.
- [x] Re-clear the reintroduced `50%-70% branch` bucket in strict queue order, led by `src/pages/Processes/Components/lcaGroupedResults.ts`, `src/services/lifeCycleModels/persistencePlan.ts`, `src/pages/Processes/Components/lcaImpactCompareToolbar.tsx`, and `src/pages/Processes/Analysis/index.tsx`.
- [x] Continue shrinking the `70%-90%` bucket in strict queue order until it is empty.
- [x] Burn down the `line=100` but `branch<100` cluster in queue order, using dead-branch cleanup when behaviorally safe.
- [x] Continue page-cluster closure with the largest shared-fixture groups: `src/pages/Processes/Components`, `src/pages/Review/Components`, `src/pages/Flows/Components`, and `src/pages/LifeCycleModels/Components`.
- [x] Continue service closure in queue order until all service files reach `100/100/100/100`.
- [x] Push from the 87.97% branch baseline to complete closure by repeatedly shrinking the ordered queue rather than redefining priorities.
- [ ] Keep the repo in maintenance mode by preserving `100/100/100/100` on every touched or newly added `src/**` file.
- [ ] Re-run `npm run test:coverage:report` after meaningful test-engineering changes to confirm the queue remains empty.

## Execution Loop

1. Start from `npm run test:coverage:report`.
2. If the report shows no remaining gaps, stay in maintenance mode and keep all touched `src/**` files at `100/100/100/100`.
3. If the report shows gaps, take the first file from the ordered closure queue in `docs/agents/test_todo_list.md`.
4. If its immediate neighbors share the same mock/fixture/test harness, batch them under the same setup work; otherwise stay on the single file.
5. Add focused tests for uncovered branches and missing orchestration paths; if the remaining branch is provably dead, remove it without changing behavior and continue.
6. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
7. Run `npm run lint`.
8. Re-run full coverage (`npm run test:coverage`) and review `npm run test:coverage:report`; expand to `node scripts/test-coverage-report.js --full` only when the queue is non-empty and the full file-by-file state is needed.
9. Record deltas in `docs/agents/test_todo_list.md`, and update this file only if the strategic execution rules or inventory summary changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`.
- The current queue file is closed, or the repo remains in maintenance mode with no remaining gaps.
- Any remaining uncovered branch still requires an explicit documented reason that it is unreachable or business-invalid.
- Update this file when the strategic execution rules, inventory summary, or queue-exception policy changes.
