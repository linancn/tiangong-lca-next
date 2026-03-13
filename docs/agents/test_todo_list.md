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

- Test suites: 247 passed
- Tests: 1920 passed
- Coverage:
  - Statements: 80.56% (14802/18372)
  - Branches: 66.86% (7193/10757)
  - Functions: 74.31% (2920/3929)
  - Lines: 80.84% (14177/17536)
- Delta vs previous documented baseline:
  - Test suites: +51
  - Tests: +202
  - Statements: +7.77
  - Branches: +8.75
  - Functions: +11.02
  - Lines: +7.82
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+16.86% buffer above threshold)

Workflow note (March 13, 2026):

- The shared `npm test` runner now caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker `SIGSEGV` crashes seen during full local and pre-push runs on macOS.

## Gap Assessment

1. Branch-gate recovery is no longer the primary story; the suite is now in consolidation mode with overall branches at 66.86%.
2. The remaining page hotspots are concentrated in the lifecycle-model page stack and thin wrapper pages: `src/pages/LifeCycleModels/Components/create.tsx`, `src/pages/LifeCycleModels/Components/edit.tsx`, `src/pages/LifeCycleModels/Components/delete.tsx`, `src/pages/LifeCycleModels/Components/form.tsx`, `src/pages/LifeCycleModels/Components/modelResult/index.tsx`, and `src/pages/Unitgroups/Components/form.tsx` are still near-zero branch coverage.
3. The next tier of page debt is in create/edit wrappers that now lag behind their inner components: `src/pages/Sources/Components/edit.tsx`, `src/pages/Contacts/Components/edit.tsx`, `src/pages/Flowproperties/Components/edit.tsx`, `src/pages/Flows/Components/edit.tsx`, and `src/pages/Account/index.tsx`.
4. Previously documented P1 blockers were materially reduced this wave: `toolbar/editIndex.tsx`, `reviewProcess/tabsDetail.tsx`, `Processes/edit.tsx`, `ReviewProgress.tsx`, unitgroup selectors, process exchange view, and `Utils/review.tsx` all moved out of the immediate top-risk list.
5. Service-layer follow-up work is now led by `src/services/lifeCycleModels/util_calculate.ts` (64.21% branch), followed by `src/services/unitgroups/util.ts`, `src/services/lifeCycleModels/util_allocate_supply_demand.ts`, `src/services/lifeCycleModels/util.ts`, and `src/services/general/api.ts`.

## Priority Backlog

### P0 – Branch Gate Consolidation (completed)

- [x] Recover the global branch gate and rebuild a meaningful safety buffer (current 66.86%).
- [x] Close the prior hotspot wave across review/process/unitgroup/toolbars/selectors and adjacent utility modules.
- [x] Add direct coverage for `Flows/Components/Property/*`, `Flows/delete.tsx`, `Flows/select/{description,drawer}.tsx`, `LoginTopActions`, lifecycle toolbar utility helpers, required-fields maps, and ManageSystem/Teams add-member modals.
- [x] Re-verify with full coverage and `npm run lint`.

Definition of done for P0:

- achieved: global branches are at 66.86% with a 16.86-point buffer above threshold
- `npm run lint` passes
- focused suites for touched modules pass

### P1 – Current Page/Workflow Hotspots

- [ ] Add focused tests for `src/pages/LifeCycleModels/Components/create.tsx`, `src/pages/LifeCycleModels/Components/edit.tsx`, `src/pages/LifeCycleModels/Components/delete.tsx`, and `src/pages/LifeCycleModels/Components/form.tsx`.
- [ ] Add focused tests for `src/pages/LifeCycleModels/Components/modelResult/index.tsx` and continue reducing branch debt in `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` and `src/pages/LifeCycleModels/Components/toolbar/eidtInfo.tsx`.
- [ ] Expand tests for `src/pages/Sources/Components/create.tsx`, `src/pages/Sources/Components/edit.tsx`, and `src/pages/Sources/Components/delete.tsx`.
- [ ] Expand tests for `src/pages/Contacts/Components/create.tsx`, `src/pages/Contacts/Components/edit.tsx`, and `src/pages/Contacts/Components/delete.tsx`.
- [ ] Expand tests for `src/pages/Unitgroups/Components/form.tsx`, `src/pages/Unitgroups/Components/create.tsx`, `src/pages/Unitgroups/Components/edit.tsx`, and `src/pages/Unitgroups/Components/Unit/reference.tsx`.
- [ ] Continue wrapper/page closures in `src/pages/Flowproperties/Components/edit.tsx`, `src/pages/Flows/Components/edit.tsx`, and `src/pages/Account/index.tsx`.

Definition of done for P1:

- lifecycle-model page stack and wrapper pages are no longer near-zero branch / line coverage
- top page-level branch misses trend down release-over-release
- create/edit wrapper tests actually hit page orchestration logic, not only inner child components

### P2 – Service/Utility Hotspots

- [ ] Expand branch coverage for `src/services/lifeCycleModels/util_calculate.ts` (current branch 64.21%; still the main service hotspot).
- [ ] Expand `src/services/unitgroups/util.ts` (60.98% branch) and `src/services/general/api.ts` (69.83% branch).
- [ ] Continue lifecycle utility closure in `src/services/lifeCycleModels/util_allocate_supply_demand.ts` (68.27%), `src/services/lifeCycleModels/util.ts` (69.61%), and `src/services/lifeCycleModels/api.ts` (75.98%) as page debt shrinks.

### P3 – Test Engineering Quality Upgrades

- [ ] Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`).
- [ ] Remove or refactor noisy console-only assertions into behavior assertions where possible.
- [ ] When a page wrapper exists above a tested component, add at least one wrapper-level test so coverage reflects real orchestration rather than child-only behavior.
- [ ] Keep this file and `_CN` mirror updated after each completed batch; if the baseline changes, rerun full coverage and sync `docs/agents/ai-testing-guide.md` and `docs/agents/test_improvement_plan.md` too.

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

- Do not raise coverage thresholds yet; first stabilize the current 66.86% branch baseline across the lifecycle-model page stack and wrapper hotspots.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; avoid generic "add more tests" tasks.
