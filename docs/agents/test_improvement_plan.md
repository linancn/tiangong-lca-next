# Test Improvement Plan

> Snapshot date: March 12, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`
- Current full run footprint: 247 suites / 1920 tests
- Current Jest coverage (full run):
  - Statements: 80.56%
  - Branches: 66.86%
  - Functions: 74.31%
  - Lines: 80.84%
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **the suite is now well past gate recovery; the strategic problem is concentrated low-coverage lifecycle-model pages, thin wrapper pages, and the remaining lifecycle calculation utility debt**.

## Principles

- Prioritize branch-heavy pure logic before broad UI snapshots.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again until the current 66.86% branch baseline is stable across the lifecycle-model page stack and wrapper hotspots.

## Priority Backlog

- [x] Auth reset/forgot flows are covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [x] Recover branch coverage above the global threshold and grow a meaningful safety buffer (current branch coverage: 66.86%).
- [x] Expand tests around `src/pages/Utils/index.tsx`, `src/pages/Utils/review.tsx`, and `src/pages/Utils/updateReference.tsx`.
- [x] Cover contact/source/flow/flowproperty selector and drawer workflows plus lifecycle-model view/edit toolbars and the prior process/review workflow hotspots.
- [x] Add direct coverage for `Flows/Components/Property/*`, login top actions, lifecycle toolbar utility helpers, required-fields maps, and add-member modals.
- [ ] Focus next on the lifecycle-model page stack and thin wrappers: `src/pages/LifeCycleModels/Components/{create,edit,delete,form}.tsx`, `src/pages/LifeCycleModels/Components/modelResult/index.tsx`, and adjacent toolbar residual branch debt.
- [ ] Expand wrapper/create/edit coverage for `src/pages/Sources/Components/*`, `src/pages/Contacts/Components/*`, `src/pages/Flowproperties/Components/edit.tsx`, `src/pages/Flows/Components/edit.tsx`, `src/pages/Account/index.tsx`, and `src/pages/Unitgroups/Components/form.tsx`.
- [ ] Expand service hot spots: `src/services/lifeCycleModels/util_calculate.ts`, `src/services/unitgroups/util.ts`, `src/services/general/api.ts`, and adjacent lifecycle utilities.
- [ ] Continue targeted branch closure toward a higher-quality gate (next stabilization target: >= 70% branches, then push toward 75%).

## Execution Loop

1. Pick one module from the current highest branch-miss list in `docs/agents/test_todo_list.md`.
2. Add focused tests for uncovered branches.
3. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
4. Run `npm run lint`.
5. Re-run full coverage (`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`), record deltas in `docs/agents/test_todo_list.md`, and update this file if the strategic hotspot ordering changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`; update this file when the strategic plan or hotspot ordering changes.
