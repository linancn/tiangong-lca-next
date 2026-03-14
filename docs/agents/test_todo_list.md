# Test Todo List

> Source of truth for **actionable** testing backlog. Use this file for execution planning; keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 14, 2026)

Latest verified full run (`npm run test:coverage`):

- Test suites: 275 passed
- Tests: 2248 passed
- Coverage:
  - Statements: 84.83% (15617/18408)
  - Branches: 71.60% (7689/10738)
  - Functions: 80.07% (3138/3919)
  - Lines: 85.15% (14965/17573)
- Delta vs previous documented baseline:
  - Test suites: +28
  - Tests: +328
  - Statements: +4.27
  - Branches: +4.74
  - Functions: +5.76
  - Lines: +4.31
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+21.60% buffer above threshold)

Workflow notes (March 14, 2026):

- The shared `npm test` runner caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker `SIGSEGV` crashes seen during full local and pre-push runs on macOS.
- `npm run test:coverage` and `npm run test:coverage:report` now include the required heap setting; use those scripts directly for full coverage work.
- `npm run test:coverage:report` is now the default review artifact: it prints global summary, category summary, top branch hotspots, top line hotspots, and uncovered line ranges. Use `node scripts/test-coverage-report.js --full` only when reprioritizing or closing a hotspot bucket.

## Gap Assessment

1. Branch-gate recovery is finished; the suite is now in systematic closure mode with overall branches at 71.60%.
2. Page-layer orchestration remains the dominant debt. The lowest branch hotspots are `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` (18.15%), `src/pages/Flowproperties/Components/edit.tsx` (25.00%), `src/pages/Flows/Components/edit.tsx` (26.96%), `src/pages/User/Login/password_reset.tsx` (27.77%), `src/pages/Sources/Components/edit.tsx` (33.78%), and `src/pages/Review/Components/RejectReview/index.tsx` (35.71%).
3. Shared component debt is now narrow and explicit. The main component hotspot is `src/components/AISuggestion/index.tsx` (42.22% lines / 29.19% branches); most other shared components are already in the 80-100% range.
4. Service follow-up work is led by `src/services/lifeCycleModels/util_calculate.ts` (76.96% lines / 64.20% branches), then `src/services/lifeCycleModels/util.ts` (69.60% branches), `src/services/general/api.ts` (71.12% branches), `src/services/unitgroups/util.ts` (73.17% branches), `src/services/lifeCycleModels/api.ts` (75.98% branches), and `src/services/lifeCycleModels/util_allocate_supply_demand.ts` (77.22% branches).
5. Coverage review should now be report-driven, not intuition-driven. Default to the hotspot summary, and only expand to `--full` when the ordered backlog itself needs to change.

## Priority Backlog

### P0 – Reporting Workflow (completed)

- [x] Full coverage scripts now run with a stable heap configuration by default.
- [x] Default coverage reporting now prints hotspot-oriented output instead of an undifferentiated long dump.
- [x] Full per-file detail remains available behind `node scripts/test-coverage-report.js --full`.

Definition of done for P0:

- `npm run test:coverage` and `npm run test:coverage:report` are the default full-run commands
- hotspot summaries are actionable without opening `coverage/index.html`
- full detail is still available when reprioritizing

### P1 – Branch Hotspot Sweep (<50% branches, execute in this order)

- [ ] `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` – 40.12% lines / 18.15% branches
- [ ] `src/pages/Flowproperties/Components/edit.tsx` – 52.12% lines / 25.00% branches
- [ ] `src/pages/Flows/Components/edit.tsx` – 60.53% lines / 26.96% branches
- [ ] `src/pages/User/Login/password_reset.tsx` – 74.62% lines / 27.77% branches
- [ ] `src/components/AISuggestion/index.tsx` – 42.22% lines / 29.19% branches
- [ ] `src/pages/Sources/Components/edit.tsx` – 62.87% lines / 33.78% branches
- [ ] `src/pages/Review/Components/RejectReview/index.tsx` – 76.11% lines / 35.71% branches
- [ ] `src/pages/Contacts/Components/edit.tsx` – 62.44% lines / 40.77% branches
- [ ] `src/pages/LifeCycleModels/Components/toolbar/eidtInfo.tsx` – 59.19% lines / 42.74% branches
- [ ] `src/pages/Flowproperties/Components/select/drawer.tsx` – 62.29% lines / 45.00% branches
- [ ] `src/pages/Unitgroups/Components/edit.tsx` – 68.71% lines / 45.67% branches
- [ ] `src/pages/Processes/Components/Exchange/select.tsx` – 84.05% lines / 45.71% branches
- [ ] `src/pages/Flows/index.tsx` – 67.60% lines / 46.77% branches

Definition of done for P1:

- no file remains below 50% branch coverage in the ordered hotspot list above
- each closed hotspot has at least one wrapper/page-level orchestration test, not only child-component coverage
- uncovered line ranges shrink in the default report, not just in raw percentage summaries

### P2 – Next Hotspot Bucket (50%-70% branches / low-line outliers)

- [ ] `src/pages/Flows/Components/Property/create.tsx` – 89.18% lines / 50.00% branches
- [ ] `src/pages/Sources/Components/select/drawer.tsx` – 69.38% lines / 50.00% branches
- [ ] `src/pages/Processes/Components/form.tsx` – 62.79% lines / 54.05% branches
- [ ] `src/pages/Contacts/Components/select/drawer.tsx` – 68.62% lines / 56.52% branches
- [ ] `src/pages/Processes/Components/edit.tsx` – 71.60% lines / 56.14% branches
- [ ] `src/global.tsx` – 73.33% lines / 61.53% branches
- [ ] `src/services/lifeCycleModels/util_calculate.ts` – 76.96% lines / 64.20% branches
- [ ] `src/services/lifeCycleModels/util.ts` – 100.00% lines / 69.60% branches

### P3 – Service / Utility Closure

- [ ] `src/services/general/api.ts` – 80.18% lines / 71.12% branches
- [ ] `src/services/unitgroups/util.ts` – 100.00% lines / 73.17% branches
- [ ] `src/services/lifeCycleModels/api.ts` – 89.30% lines / 75.98% branches
- [ ] `src/services/lifeCycleModels/util_allocate_supply_demand.ts` – 98.76% lines / 77.22% branches
- [ ] Continue sweeping the remaining service files in report order until the full service bucket is at or near 100%.

### P4 – Test Engineering Quality Upgrades

- [ ] Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`).
- [ ] Remove or refactor noisy console-only assertions into behavior assertions where possible.
- [ ] When a page wrapper exists above a tested component, add at least one wrapper-level test so coverage reflects real orchestration rather than child-only behavior.
- [ ] Keep this file and `_CN` mirror updated after each completed batch; if the baseline changes, rerun full coverage and sync `docs/agents/ai-testing-guide.md` and `docs/agents/test_improvement_plan.md` too.
- [ ] Keep the default report concise. Only add more default detail if it changes execution order; otherwise leave deep per-file detail behind `--full`.

## Execution Protocol (per task)

1. Implement tests for one module at a time, following the ordered hotspot list above.
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
npm run test:coverage
```

5. Review the default hotspot report:

```bash
npm run test:coverage:report
```

6. Only when backlog ordering needs to change, expand to full detail:

```bash
node scripts/test-coverage-report.js --full
```

7. Update status checkboxes and note measurable deltas.
8. If workflow/baseline/backlog expectations changed, sync `docs/agents/ai-testing-guide.md`; if strategic context changed, sync `docs/agents/test_improvement_plan.md` too.

## Notes

- Do not raise coverage thresholds yet; first keep shrinking the ordered hotspot list.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; avoid generic "add more tests" tasks.
