# Test Todo List

> Source of truth for **actionable** testing backlog. Use this file for execution planning; keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 18, 2026)

Latest verified full run (`npm run test:coverage`):

- Test suites: 286 passed
- Tests: 2842 passed
- Coverage:
  - Statements: 94.97% (19080/20090)
  - Branches: 87.97% (10285/11691)
  - Functions: 94.01% (4116/4378)
  - Lines: 95.15% (18278/19208)
- Delta vs previous documented baseline:
  - Test suites: +7
  - Tests: +101
  - Statements: -1.07
  - Branches: -1.38
  - Functions: +0.15
  - Lines: -1.17
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+37.97% buffer above threshold)

## Recent Closure Delta

- Source files tracked: `303 -> 312` (`+9`)
- Fully covered files: `177 -> 197` (`+20`)
- Files with remaining gaps: `126 -> 115` (`-11`)
- `<50% branch` bucket: `0 -> 1`
- `50%-70% branch` bucket: `0 -> 8`
- `70%-90% branch` bucket: `91 -> 68`
- `90%-<100% branch` bucket: `24 -> 27`
- `line=100 but branch<100` bucket: `30 -> 27`
- Recent queue files closed to `100/100/100/100` include `services/contacts/api`, `services/lca/taskCenter`, `services/lifeCycleModels/util_allocate_supply_demand`, and `Sources/Components/{select/drawer,select/form,view}`.
- The reopened low-branch bucket is dominated by the lifecycle-model persistence bundle sync, led by `src/services/lifeCycleModels/api.ts` and the new `src/services/lifeCycleModels/persistencePlan.ts`.

## All-File Inventory

Current repo-wide status from the same run:

- Source files tracked: 312
- Fully covered files (`100/100/100/100`): 197
- Files with remaining gaps: 115
- Branch buckets:
  - `<50`: 1 file
  - `50-70`: 8 files
  - `70-90`: 68 files
  - `90-<100`: 27 files
- `line=100` but `branch<100`: 27 files
- Category averages:
  - components: `97.92%` lines / `94.56%` branches / `96.00%` functions
  - services: `95.36%` lines / `91.65%` branches / `96.80%` functions
  - pages: `97.41%` lines / `93.35%` branches / `94.31%` functions
  - others: `99.89%` lines / `99.64%` branches / `99.83%` functions

## Reporting Workflow

- The shared `npm test` runner caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker `SIGSEGV` crashes seen during full local and pre-push runs on macOS.
- `npm run test:coverage` and `npm run test:coverage:report` already include the required heap setting; use those scripts directly for full coverage work.
- `npm run test:coverage:report` is the default review artifact. It prints:
  - global summary,
  - category summary,
  - closure-queue summary,
  - shared-fixture batches,
  - next 25 ordered incomplete files.
- The queue and batch sections print full project-relative paths; file and cluster labels are not shortened with `...`.
- `node scripts/test-coverage-report.js --full` prints the full ordered incomplete-file queue for all remaining files.
- Queue order is deterministic: `branches asc -> lines asc -> statements asc -> functions asc -> path`.

## Execution Strategy

1. Do not re-rank work by ad hoc “highest ROI” judgments.
2. Take the first file from the ordered closure queue and push it toward `100/100/100/100` before moving on.
3. The full queue in `node scripts/test-coverage-report.js --full` is the source of truth for all remaining files; the list below is only the current head snapshot.
4. Allowed batch exception: if the current file and its immediate neighbors share the same mock/fixture/test harness, close them in one batch anchored to the earliest queued file.
5. Allowed infrastructure exception: if a shared test blocker prevents coverage on the current file or its immediate neighbors, fix the blocker first and then resume queue order.
6. If the remaining branch is provably unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests.
7. Keep wrapper/page-level orchestration tests in scope; do not rely only on child-component coverage.

## Current Ordered Closure Queue (Head Snapshot)

- [ ] `src/services/lifeCycleModels/api.ts` — stmt `36.39%`, line `35.73%`, branch `23.07%`, func `48.48%`
- [ ] `src/pages/Processes/Components/lcaGroupedResults.ts` — stmt `81.81%`, line `81.13%`, branch `51.21%`, func `100.00%`
- [ ] `src/services/lifeCycleModels/persistencePlan.ts` — stmt `73.71%`, line `73.20%`, branch `51.85%`, func `96.66%`
- [ ] `src/pages/Processes/Components/lcaImpactCompareToolbar.tsx` — stmt `77.93%`, line `77.37%`, branch `52.38%`, func `80.95%`
- [ ] `src/pages/Processes/Analysis/index.tsx` — stmt `72.78%`, line `72.64%`, branch `58.00%`, func `78.49%`
- [ ] `src/pages/Processes/Components/lcaAnalysisShared.ts` — stmt `83.33%`, line `84.88%`, branch `58.02%`, func `83.33%`
- [ ] `src/pages/Processes/Components/lcaImpactHotspotToolbar.tsx` — stmt `88.81%`, line `88.46%`, branch `61.36%`, func `95.23%`
- [ ] `src/pages/Processes/Components/lcaContributionPath.ts` — stmt `90.62%`, line `91.08%`, branch `62.50%`, func `94.87%`
- [ ] `src/pages/Processes/Components/lcaProcessSelectionTable.tsx` — stmt `92.30%`, line `94.28%`, branch `69.23%`, func `87.50%`
- [ ] `src/services/lca/api.ts` — stmt `84.04%`, line `83.87%`, branch `70.31%`, func `88.23%`
- [ ] `src/services/processes/api.ts` — stmt `86.60%`, line `86.37%`, branch `73.21%`, func `95.45%`
- [ ] `src/pages/Flows/Components/create.tsx` — stmt `91.59%`, line `93.10%`, branch `77.35%`, func `70.83%`
- [ ] `src/app.tsx` — stmt `92.64%`, line `94.02%`, branch `77.77%`, func `88.88%`
- [ ] `src/pages/Processes/Components/Review/DataQualityIndicator/view.tsx` — stmt `100.00%`, line `100.00%`, branch `77.77%`, func `100.00%`
- [ ] `src/pages/Contacts/Components/select/form.tsx` — stmt `87.20%`, line `86.90%`, branch `78.26%`, func `75.00%`
- [ ] `src/pages/Unitgroups/Components/select/form.tsx` — stmt `87.91%`, line `87.64%`, branch `78.26%`, func `75.00%`
- [ ] `src/pages/Unitgroups/Components/form.tsx` — stmt `97.22%`, line `97.14%`, branch `78.37%`, func `72.72%`
- [ ] `src/pages/LifeCycleModels/Components/edit.tsx` — stmt `96.42%`, line `96.00%`, branch `78.57%`, func `85.71%`
- [ ] `src/services/flows/api.ts` — stmt `90.93%`, line `90.65%`, branch `78.90%`, func `100.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/addThroughFlow.tsx` — stmt `90.00%`, line `89.70%`, branch `80.00%`, func `75.00%`
- [ ] `src/components/AllTeams/select.tsx` — stmt `96.00%`, line `95.83%`, branch `80.00%`, func `90.00%`
- [ ] `src/services/unitgroups/api.ts` — stmt `98.01%`, line `98.96%`, branch `80.00%`, func `93.75%`
- [ ] `src/components/Notification/index.tsx` — stmt `100.00%`, line `100.00%`, branch `80.00%`, func `100.00%`
- [ ] `src/components/RequiredMark/index.tsx` — stmt `100.00%`, line `100.00%`, branch `80.00%`, func `100.00%`
- [ ] `src/pages/Processes/Components/Review/Scope/view.tsx` — stmt `100.00%`, line `100.00%`, branch `80.00%`, func `100.00%`

Use `node scripts/test-coverage-report.js --full` for the full ordered queue of all 115 incomplete files.

## Shared-Fixture Batch Candidates

These clusters are the only standing justification for batched queue execution:

- `src/pages/Processes/Components` — 14 incomplete files, min branch `51.21%`, avg branch `74.09%`
- `src/pages/Review/Components` — 13 incomplete files, min branch `81.57%`, avg branch `89.32%`
- `src/pages/Flows/Components` — 8 incomplete files, min branch `77.35%`, avg branch `86.12%`
- `src/pages/LifeCycleModels/Components` — 8 incomplete files, min branch `78.57%`, avg branch `90.36%`
- `src/pages/Unitgroups/Components` — 7 incomplete files, min branch `78.26%`, avg branch `87.89%`
- `src/pages/Contacts/Components` — 6 incomplete files, min branch `78.26%`, avg branch `84.71%`
- `src/pages/Flowproperties/Components` — 6 incomplete files, min branch `83.33%`, avg branch `87.90%`
- `src/services/lifeCycleModels` — 3 incomplete files, min branch `23.07%`, avg branch `53.03%`
- `src/services/flows` — 3 incomplete files, min branch `78.90%`, avg branch `90.58%`
- `src/components/AllTeams` — 3 incomplete files, min branch `80.00%`, avg branch `85.52%`
- `src/services/processes` — 2 incomplete files, min branch `73.21%`, avg branch `84.14%`
- `src/components/Notification` — 2 incomplete files, min branch `80.00%`, avg branch `83.75%`

## Test Engineering Quality Rules

- Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`) whenever they fit the active queue file or batch.
- Remove or refactor console-only assertions into behavior assertions where possible.
- When a page wrapper exists above a tested component, add at least one wrapper-level test so coverage reflects real orchestration rather than child-only behavior.
- When a queue file still misses only dead or business-invalid branches, prefer behavior-preserving branch removal over synthetic test scaffolding.
- Keep the default report concise; only add more default detail if it changes execution order. Deep per-file detail stays behind `--full`.

## Execution Protocol (per task)

1. Implement tests for one queue file at a time, following the ordered closure queue above.
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

5. Review the default closure report:

```bash
npm run test:coverage:report
```

6. Only when you need the full remaining-file state or need to refresh the queue snapshot, expand to full detail:

```bash
node scripts/test-coverage-report.js --full
```

7. Update status checkboxes and note measurable deltas.
8. If workflow/baseline/backlog expectations changed, sync `docs/agents/ai-testing-guide.md`; if strategic context changed, sync `docs/agents/test_improvement_plan.md` too.

## Notes

- Do not raise coverage thresholds yet; first keep shrinking the ordered closure queue.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; avoid generic "add more tests" tasks.
