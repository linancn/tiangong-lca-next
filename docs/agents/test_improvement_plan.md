# Test Improvement Plan

> Snapshot date: March 18, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `npm run test:coverage`
- Current full run footprint: 286 suites / 2842 tests
- Current Jest coverage (full run):
  - Statements: 94.97%
  - Branches: 87.97%
  - Functions: 94.01%
  - Lines: 95.15%
- Current file inventory: 312 tracked source files, 197 fully covered, 115 still incomplete.
- Current branch buckets: `<50 = 1`, `50-70 = 8`, `70-90 = 68`, `90-<100 = 27`.
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **the suite is still well above the global gate, but the lifecycle-model persistence bundle sync reopened one `<50% branch` hotspot and eight `50%-70%` hotspots; the immediate strategic task is to re-clear those low buckets before continuing the wider `70%-90%` and branch-only closure work**.

## Principles

- Long-term target: 100% meaningful coverage across `src/**`.
- Use the coverage report queue as the ordering source of truth; do not re-rank by subjective “highest ROI” judgments.
- Execute one queue file at a time and try to close it to `100/100/100/100` before moving on.
- Allowed strategy exceptions are narrow: batch adjacent files that share the same mock/fixture/test harness, and fix shared test-infrastructure blockers first only when they block the current file or its immediate neighbors.
- If a queued branch is proven unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again until the current ordered queue has materially shrunk.

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
- [ ] Re-clear the reintroduced `<50% branch` hotspot in strict queue order, led by `src/services/lifeCycleModels/api.ts`.
- [ ] Re-clear the reintroduced `50%-70% branch` bucket in strict queue order, led by `src/pages/Processes/Components/lcaGroupedResults.ts`, `src/services/lifeCycleModels/persistencePlan.ts`, `src/pages/Processes/Components/lcaImpactCompareToolbar.tsx`, and `src/pages/Processes/Analysis/index.tsx`.
- [ ] Continue shrinking the current `70%-90%` bucket in strict queue order, starting with `src/pages/Processes/Components/lcaAnalysisShared.ts`, `src/pages/Processes/Components/lcaImpactHotspotToolbar.tsx`, `src/pages/Processes/Components/lcaContributionPath.ts`, `src/pages/Processes/Components/lcaProcessSelectionTable.tsx`, and `src/services/lca/api.ts`.
- [ ] Burn down the `line=100` but `branch<100` cluster in queue order, using dead-branch cleanup when behaviorally safe.
- [ ] Continue page-cluster closure with the largest shared-fixture groups: `src/pages/Processes/Components`, `src/pages/Review/Components`, `src/pages/Flows/Components`, and `src/pages/LifeCycleModels/Components`.
- [ ] Continue service closure in queue order, led by `src/services/processes/api.ts`, `src/services/lca/api.ts`, `src/services/flows/api.ts`, and the rest of the lifecycle-model bundle files after the reopened low buckets are cleared.
- [ ] Push from the current 87.97% branch baseline toward complete closure by repeatedly shrinking the ordered queue rather than redefining priorities.

## Execution Loop

1. Take the first file from the current ordered closure queue in `docs/agents/test_todo_list.md`.
2. If its immediate neighbors share the same mock/fixture/test harness, batch them under the same setup work; otherwise stay on the single file.
3. Add focused tests for uncovered branches and missing orchestration paths; if the remaining branch is provably dead, remove it without changing behavior and continue.
4. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
5. Run `npm run lint`.
6. Re-run full coverage (`npm run test:coverage`).
7. Review `npm run test:coverage:report`; expand to `node scripts/test-coverage-report.js --full` only to inspect the full remaining-file state or refresh the queue snapshot.
8. Record deltas in `docs/agents/test_todo_list.md`, and update this file only if the strategic execution rules or inventory summary changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`.
- The current queue file is closed, or any remaining uncovered branch has an explicit documented reason that it is unreachable or business-invalid.
- Update this file when the strategic execution rules, inventory summary, or queue-exception policy changes.
