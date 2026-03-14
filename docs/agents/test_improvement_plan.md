# Test Improvement Plan

> Snapshot date: March 14, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `npm run test:coverage`
- Current full run footprint: 275 suites / 2248 tests
- Current Jest coverage (full run):
  - Statements: 84.83%
  - Branches: 71.60%
  - Functions: 80.07%
  - Lines: 85.15%
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **the suite is well past gate recovery; the strategic problem is now systematic closure of the ordered hotspot list, with page-layer orchestration still dominating the remaining debt**.

## Principles

- Long-term target: 100% meaningful coverage across `src/**`.
- Use the coverage report as the ordering source of truth; avoid subjective reprioritization unless the hotspot list itself changes.
- Prioritize branch-heavy pure logic and page orchestration gaps before broad UI snapshots.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again until the current hotspot list has materially shrunk.

## Priority Backlog

- [x] Auth reset/forgot flows are covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [x] Recover branch coverage above the global threshold and grow a meaningful safety buffer (current branch coverage: 71.60%).
- [x] Expand tests around `src/pages/Utils/index.tsx`, `src/pages/Utils/review.tsx`, and `src/pages/Utils/updateReference.tsx`.
- [x] Cover contact/source/flow/flowproperty selector and drawer workflows plus lifecycle-model view/edit toolbars and the prior process/review workflow hotspots.
- [x] Add direct coverage for `Flows/Components/Property/*`, login top actions, lifecycle toolbar utility helpers, required-fields maps, and add-member modals.
- [x] Replace the old monolithic coverage dump workflow with a hotspot-oriented default report plus `--full` escape hatch.
- [ ] Clear the current branch hotspot bucket below 50% in report order: `toolbar/editIndex.tsx`, `Flowproperties/edit.tsx`, `Flows/edit.tsx`, `password_reset.tsx`, `AISuggestion/index.tsx`, `Sources/edit.tsx`, `RejectReview/index.tsx`, `Contacts/edit.tsx`, `toolbar/eidtInfo.tsx`, and the remaining page wrappers immediately behind them.
- [ ] Clear the 50%-70% hotspot bucket next, including `Flows/Components/Property/create.tsx`, `Processes/form.tsx`, `Processes/edit.tsx`, selector drawers, `global.tsx`, and the leading lifecycle service/util files.
- [ ] Continue service closure in report order with `src/services/lifeCycleModels/util_calculate.ts`, `src/services/lifeCycleModels/util.ts`, `src/services/general/api.ts`, `src/services/unitgroups/util.ts`, `src/services/lifeCycleModels/api.ts`, and `src/services/lifeCycleModels/util_allocate_supply_demand.ts`.
- [ ] Push from the current 71.60% branch baseline toward complete closure by repeatedly shrinking the ordered hotspot list rather than redefining ad hoc priorities.

## Execution Loop

1. Pick one module from the current ordered hotspot list in `docs/agents/test_todo_list.md`.
2. Add focused tests for uncovered branches.
3. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
4. Run `npm run lint`.
5. Re-run full coverage (`npm run test:coverage`).
6. Review `npm run test:coverage:report`; only expand to `node scripts/test-coverage-report.js --full` if the hotspot ordering needs to change.
7. Record deltas in `docs/agents/test_todo_list.md`, and update this file if the strategic hotspot ordering changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`; update this file when the strategic plan or hotspot ordering changes.
