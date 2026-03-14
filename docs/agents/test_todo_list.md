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

- Test suites: 276 passed
- Tests: 2350 passed
- Coverage:
  - Statements: 91.48% (16840/18408)
  - Branches: 78.17% (8394/10738)
  - Functions: 87.36% (3424/3919)
  - Lines: 91.78% (16130/17573)
- Delta vs previous documented baseline:
  - Test suites: +1
  - Tests: +102
  - Statements: +6.65
  - Branches: +6.57
  - Functions: +7.29
  - Lines: +6.63
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+28.17% buffer above threshold)

## All-File Inventory

Current repo-wide status from the same run:

- Source files tracked: 300
- Fully covered files (`100/100/100/100`): 115
- Files with remaining gaps: 185
- Branch buckets:
  - `<50`: 2 files
  - `50-70`: 46 files
  - `70-90`: 101 files
  - `90-<100`: 25 files
- `line=100` but `branch<100`: 49 files
- Category averages:
  - components: `96.81%` lines / `85.69%` branches / `95.08%` functions
  - services: `95.90%` lines / `86.72%` branches / `97.17%` functions
  - pages: `94.27%` lines / `81.47%` branches / `87.48%` functions
  - others: `99.53%` lines / `98.96%` branches / `99.45%` functions

## Reporting Workflow

- The shared `npm test` runner caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker `SIGSEGV` crashes seen during full local and pre-push runs on macOS.
- `npm run test:coverage` and `npm run test:coverage:report` already include the required heap setting; use those scripts directly for full coverage work.
- `npm run test:coverage:report` is the default review artifact. It prints:
  - global summary,
  - category summary,
  - closure-queue summary,
  - shared-fixture batches,
  - next 25 ordered incomplete files.
- `node scripts/test-coverage-report.js --full` prints the full ordered incomplete-file queue for all remaining files.
- Queue order is deterministic: `branches asc -> lines asc -> statements asc -> functions asc -> path`.

## Execution Strategy

1. Do not re-rank work by ad hoc “highest ROI” judgments.
2. Take the first file from the ordered closure queue and push it toward `100/100/100/100` before moving on.
3. The full queue in `node scripts/test-coverage-report.js --full` is the source of truth for all remaining files; the list below is only the current head snapshot.
4. Allowed batch exception: if the current file and its immediate neighbors share the same mock/fixture/test harness, close them in one batch anchored to the earliest queued file.
5. Allowed infrastructure exception: if a shared test blocker prevents coverage on the current file or its immediate neighbors, fix the blocker first and then resume queue order.
6. Keep wrapper/page-level orchestration tests in scope; do not rely only on child-component coverage.

## Current Ordered Closure Queue (Head Snapshot)

- [ ] `src/components/TableFilter/index.tsx` — stmt `100.00%`, line `100.00%`, branch `0.00%`, func `100.00%`
- [ ] `src/pages/Unitgroups/Components/edit.tsx` — stmt `70.27%`, line `71.50%`, branch `46.91%`, func `56.75%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/Exchange/index.tsx` — stmt `92.85%`, line `92.85%`, branch `50.00%`, func `75.00%`
- [ ] `src/components/FileViewer/upload.tsx` — stmt `100.00%`, line `100.00%`, branch `50.00%`, func `100.00%`
- [ ] `src/pages/Review/Components/ReviewProgress.tsx` — stmt `74.13%`, line `75.29%`, branch `50.43%`, func `82.92%`
- [ ] `src/pages/Processes/index.tsx` — stmt `75.51%`, line `75.52%`, branch `51.51%`, func `80.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/viewInfo.tsx` — stmt `94.28%`, line `93.75%`, branch `52.63%`, func `81.81%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortView.tsx` — stmt `97.72%`, line `97.56%`, branch `52.94%`, func `94.44%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortSelect.tsx` — stmt `98.00%`, line `97.87%`, branch `54.54%`, func `95.00%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewIndex.tsx` — stmt `87.12%`, line `86.77%`, branch `54.83%`, func `83.78%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/eidtInfo.tsx` — stmt `72.30%`, line `72.42%`, branch `54.96%`, func `56.81%`
- [ ] `src/pages/Processes/Components/edit.tsx` — stmt `71.26%`, line `71.60%`, branch `56.14%`, func `58.92%`
- [ ] `src/pages/Unitgroups/Components/select/drawer.tsx` — stmt `81.15%`, line `80.59%`, branch `56.25%`, func `57.89%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/Exchange/ioPortView.tsx` — stmt `97.61%`, line `97.43%`, branch `57.14%`, func `94.11%`
- [ ] `src/pages/Processes/Components/Exchange/edit.tsx` — stmt `79.48%`, line `78.66%`, branch `58.53%`, func `51.85%`
- [ ] `src/pages/Processes/Components/Exchange/create.tsx` — stmt `77.14%`, line `76.47%`, branch `58.82%`, func `45.83%`
- [ ] `src/pages/Processes/Components/Exchange/select.tsx` — stmt `91.54%`, line `91.30%`, branch `60.00%`, func `72.72%`
- [ ] `src/pages/Flows/Components/Property/edit.tsx` — stmt `91.83%`, line `91.30%`, branch `60.00%`, func `75.00%`
- [ ] `src/pages/Flows/Components/Property/create.tsx` — stmt `97.43%`, line `97.29%`, branch `60.00%`, func `92.30%`
- [ ] `src/pages/Review/Components/ReviewForm/view.tsx` — stmt `100.00%`, line `100.00%`, branch `60.00%`, func `100.00%`

Use `node scripts/test-coverage-report.js --full` for the full ordered queue of all 185 incomplete files.

## Shared-Fixture Batch Candidates

These clusters are the only standing justification for batched queue execution:

- `src/pages/Review/Components` — 21 incomplete files, min branch `50.43%`, avg branch `77.68%`
- `src/pages/LifeCycleModels/Components` — 20 incomplete files, min branch `50.00%`, avg branch `75.67%`
- `src/pages/Processes/Components` — 17 incomplete files, min branch `56.14%`, avg branch `70.99%`
- `src/pages/Unitgroups/Components` — 14 incomplete files, min branch `46.91%`, avg branch `74.11%`
- `src/pages/Flows/Components` — 11 incomplete files, min branch `60.00%`, avg branch `79.14%`
- `src/pages/Sources/Components` — 8 incomplete files, min branch `65.00%`, avg branch `76.08%`
- `src/pages/Flowproperties/Components` — 8 incomplete files, min branch `65.21%`, avg branch `82.95%`
- `src/pages/Contacts/Components` — 8 incomplete files, min branch `66.66%`, avg branch `81.19%`
- `src/services/auth` — 4 incomplete files, min branch `66.66%`, avg branch `76.08%`
- `src/services/lifeCycleModels` — 4 incomplete files, min branch `69.60%`, avg branch `76.74%`
- `src/pages/User` — 4 incomplete files, min branch `71.42%`, avg branch `85.22%`
- `src/components/AllTeams` — 4 incomplete files, min branch `72.50%`, avg branch `82.26%`

## Test Engineering Quality Rules

- Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`) whenever they fit the active queue file or batch.
- Remove or refactor console-only assertions into behavior assertions where possible.
- When a page wrapper exists above a tested component, add at least one wrapper-level test so coverage reflects real orchestration rather than child-only behavior.
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
