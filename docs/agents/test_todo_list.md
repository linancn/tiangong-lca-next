# Test Todo List

> Source of truth for **actionable** testing backlog. Use this file for execution planning; keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 12, 2026)

Latest verified full run (`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`):

- Test suites: 196 passed
- Tests: 1718 passed
- Coverage:
  - Statements: 72.79% (13069/17954)
  - Branches: 58.11% (6104/10504)
  - Functions: 63.29% (2457/3882)
  - Lines: 73.02% (12511/17133)
- Delta vs previous documented baseline:
  - Test suites: +35
  - Tests: +202
  - Statements: +9.91
  - Branches: +10.32
  - Functions: +11.00
  - Lines: +9.97
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+8.11% buffer above threshold)

## Gap Assessment

1. Branch gate recovery is complete; the main problem is no longer threshold failure but concentrated page-level workflow debt.
2. The biggest remaining branch gaps are now led by `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx`, `src/pages/Review/Components/reviewProcess/tabsDetail.tsx`, `src/pages/Processes/Components/edit.tsx`, `src/pages/Utils/review.tsx`, and `src/pages/Review/Components/ReviewProgress.tsx`.
3. `src/pages/Review/**`, lifecycle-model editing, and process editing/view flows still represent the highest regression-risk UI area.
4. Service-layer branch coverage is now broadly healthy; the main service hotspot that still deserves dedicated work is `src/services/lifeCycleModels/util_calculate.ts`.
5. Contact/source reference selector form+drawer flows and lifecycle-model view toolbars are now covered enough to move out of the immediate blocker list.

## Priority Backlog

### P0 – Recover Branch Coverage Gate (completed)

- [x] Add branch-focused tests for `src/services/reviews/api.ts` (latest branch 67.45%).
  - Completed: covered review member/admin table branches, rejected/process filters, notify count filters, and lifecycle subtable batch branches in `tests/unit/services/reviews/api.test.ts`.
- [x] Add branch-focused tests for `src/services/lciaMethods/util.ts` (latest branch 94.91%).
  - Completed: covered IndexedDB cursor success/error, cache miss/hit, stale-list refresh, and fallback paths in `tests/unit/services/lciaMethods/util.test.ts`.
- [x] Add branch-focused tests for `src/services/general/api.ts` (latest branch 72.95%).
  - Completed: covered additional data access, version list mapping, edge-function failure, and fallback branches in `tests/unit/services/general/api.test.ts`.
- [x] Add branch-focused tests for `src/services/processes/api.ts` (latest branch 87.64%).
  - Completed: covered validation-failure paths, datasource filtering branches, connectable-process filtering branches, hybrid/pgroonga error paths, and optional mapping fallbacks in `tests/unit/services/processes/api.test.ts`.
- [x] Add branch-focused tests for `src/services/unitgroups/api.ts` (latest branch 82.96%).
  - Completed: covered datasource filters, rpc/edge error branches, zh/en mapping fallback and catch branches, and reference lookup fallbacks in `tests/unit/services/unitgroups/api.test.ts`.
- [x] Add branch-focused tests for `src/services/auth/api.ts` (latest branch 96.00%).
  - Completed: covered empty credential fallbacks, reauthenticate guest fallback, and fresh metadata retrieval branches in `tests/unit/services/auth/api.test.ts`.
- [x] Add focused tests for `src/pages/Utils/index.tsx` (small helper-branch file, low-cost buffer gain).
  - Completed in `tests/unit/pages/Utils/index.test.tsx`; file coverage is now 100% statements / 100% branches / 100% functions / 100% lines.
- [x] Add focused tests for `src/pages/Utils/updateReference.tsx` as an adjacent low-risk utility branch target.
  - Completed in `tests/unit/pages/Utils/updateReference.test.ts`; file coverage is now 99.18% statements / 83.33% branches / 100% functions / 100% lines.
- [x] Add focused tests for `src/pages/Contacts/Components/select/form.tsx` (BRF 84).
  - Completed in `tests/unit/pages/Contacts/Components/select/form.test.tsx`; nested clear/update/ref-check branches are now covered.
- [x] Add focused tests for `src/pages/Flows/Components/edit.tsx` (BRF 85).
  - Completed in `tests/unit/pages/Flows/Components/edit.test.tsx`; edit, refs, and rejection-state paths are now covered.
- [x] Add focused tests for `src/pages/Flows/Components/select/form.tsx` (BRF 62).
  - Completed in `tests/unit/pages/Flows/Components/select/form.test.tsx`; select/reselect/update/clear branches are covered.
- [x] Add focused tests for `src/pages/Sources/Components/select/form.tsx` and `src/pages/Sources/Components/select/drawer.tsx`.
  - Completed in `tests/unit/pages/Sources/Components/select/form.test.tsx` and `tests/unit/pages/Sources/Components/select/drawer.test.tsx`; default-source, review-report tab restrictions, search, and nested clear flows are covered.
- [x] Expand lifecycle-model view toolbar coverage (`src/pages/LifeCycleModels/Components/toolbar/viewInfo.tsx`, `src/pages/LifeCycleModels/Components/toolbar/viewIndex.tsx`).
  - Completed in `tests/unit/pages/LifeCycleModels/Components/toolbar/viewInfo.test.tsx` and `tests/unit/pages/LifeCycleModels/Components/toolbar/viewIndex.test.tsx`; view-state fallback, tab switching, close flows, and selection handlers are covered.

Definition of done for P0:

- achieved: global branches are back above 50% with measurable safety buffer (current 58.11%)
- `npm run lint` passes
- focused suites for touched modules pass

### P1 – Current Page/Workflow Hotspots

- [ ] Add focused tests for `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` (largest branch gap in the repo; current branch 14.36%).
- [ ] Add focused tests for `src/pages/Review/Components/reviewProcess/tabsDetail.tsx` (current branch/line coverage 0%).
- [ ] Expand tests for `src/pages/Processes/Components/edit.tsx` and `src/pages/Processes/Components/view.tsx`.
- [ ] Expand tests for `src/pages/Utils/review.tsx` recursive/reference-heavy branch logic.
- [ ] Add focused tests for `src/pages/Review/Components/ReviewProgress.tsx`.
- [ ] Add focused tests for `src/pages/Unitgroups/Components/select/form.tsx`, `src/pages/Unitgroups/Components/select/formMini.tsx`, and `src/pages/Unitgroups/Components/edit.tsx`.
- [ ] Add focused tests for `src/pages/Processes/Components/Exchange/view.tsx`.

Definition of done for P1:

- the highest-risk workflow pages above are no longer zero-line / near-zero-branch
- the top five page-level branch-miss files trend down release-over-release

### P2 – Service/Utility Hotspots

- [ ] Expand branch coverage for `src/services/lifeCycleModels/util_calculate.ts` (current branch 64.01%; largest remaining service hotspot).
- [ ] Continue targeted branch closure in recursive lifecycle/reference helpers after page-level workflow hotspots start to shrink.

### P3 – Test Engineering Quality Upgrades

- [ ] Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`).
- [ ] Remove or refactor noisy console-only assertions into behavior assertions where possible.
- [ ] Ensure every new feature PR includes:
  - service-level unit tests for branch logic,
  - at least one integration workflow test when UI orchestration changes.
- [ ] Keep this file and `_CN` mirror updated after each completed item; when strategic testing context changes, sync `docs/agents/test_improvement_plan.md` and `docs/agents/ai-testing-guide.md` too.

## Execution Protocol (per task)

1. Implement tests for one module at a time.
2. Run focused command:

```bash
npm run test:ci -- <pattern> --runInBand --testTimeout=20000 --no-coverage
```

3. Run lint gate:

```bash
npm run lint
```

4. After each high-priority batch, run full coverage:

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage
```

5. Update status checkboxes and note measurable deltas.
6. If workflow/baseline/backlog expectations changed, sync `docs/agents/ai-testing-guide.md`; if strategic context changed, sync `docs/agents/test_improvement_plan.md` too.

## Notes

- Do not raise coverage thresholds immediately after crossing 50%; first stabilize the current 58% branch baseline by reducing the biggest page-level hotspots.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; avoid generic "add more tests" tasks.
