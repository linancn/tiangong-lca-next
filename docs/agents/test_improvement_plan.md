# Test Improvement Plan

> Snapshot date: March 14, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `npm run test:coverage`
- Current full run footprint: 276 suites / 2350 tests
- Current Jest coverage (full run):
  - Statements: 91.48%
  - Branches: 78.17%
  - Functions: 87.36%
  - Lines: 91.78%
- Current file inventory: 300 tracked source files, 115 fully covered, 185 still incomplete.
- Current branch buckets: `<50 = 2`, `50-70 = 46`, `70-90 = 101`, `90-<100 = 25`.
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **the suite is well past gate recovery; the strategic problem is now systematic closure of the ordered file queue, with page-layer clusters still dominating the remaining debt**.

## Principles

- Long-term target: 100% meaningful coverage across `src/**`.
- Use the coverage report queue as the ordering source of truth; do not re-rank by subjective “highest ROI” judgments.
- Execute one queue file at a time and try to close it to `100/100/100/100` before moving on.
- Allowed strategy exceptions are narrow: batch adjacent files that share the same mock/fixture/test harness, and fix shared test-infrastructure blockers first only when they block the current file or its immediate neighbors.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again until the current ordered queue has materially shrunk.

## Priority Backlog

- [x] Auth reset/forgot flows are covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [x] Recover branch coverage above the global threshold and grow a meaningful safety buffer (current branch coverage: 78.17%).
- [x] Expand tests around `src/pages/Utils/index.tsx`, `src/pages/Utils/review.tsx`, and `src/pages/Utils/updateReference.tsx`.
- [x] Cover contact/source/flow/flowproperty selector and drawer workflows plus lifecycle-model view/edit toolbars and the prior process/review workflow hotspots.
- [x] Add direct coverage for `Flows/Components/Property/*`, login top actions, lifecycle toolbar utility helpers, required-fields maps, and add-member modals.
- [x] Replace the old monolithic coverage dump workflow with a queue-first default report plus `--full` full-queue escape hatch.
- [ ] Close the two remaining `<50% branch` files in strict queue order: `src/components/TableFilter/index.tsx` then `src/pages/Unitgroups/Components/edit.tsx`.
- [ ] Clear the current `50%-70%` bucket in queue order, starting with the head snapshot in `docs/agents/test_todo_list.md`.
- [ ] Continue page-cluster closure with the largest shared-fixture groups: `src/pages/Review/Components`, `src/pages/LifeCycleModels/Components`, `src/pages/Processes/Components`, and `src/pages/Unitgroups/Components`.
- [ ] Continue service closure in queue order, led by `src/services/lifeCycleModels/util.ts`, `src/services/general/api.ts`, `src/services/lifeCycleModels/api.ts`, and `src/services/lifeCycleModels/util_allocate_supply_demand.ts`.
- [ ] Push from the current 78.17% branch baseline toward complete closure by repeatedly shrinking the ordered queue rather than redefining priorities.

## Execution Loop

1. Take the first file from the current ordered closure queue in `docs/agents/test_todo_list.md`.
2. If its immediate neighbors share the same mock/fixture/test harness, batch them under the same setup work; otherwise stay on the single file.
3. Add focused tests for uncovered branches and missing orchestration paths.
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
