# Test Todo List

> Source of truth for **actionable** testing backlog. Use this file for execution planning; keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 15, 2026)

Latest verified full run (`npm run test:coverage`):

- Test suites: 279 passed
- Tests: 2741 passed
- Coverage:
  - Statements: 96.04% (17944/18682)
  - Branches: 89.35% (9597/10740)
  - Functions: 93.86% (3735/3979)
  - Lines: 96.32% (17186/17842)
- Delta vs previous documented baseline:
  - Test suites: +3
  - Tests: +260
  - Statements: +2.11
  - Branches: +7.03
  - Functions: +2.77
  - Lines: +2.06
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+39.35% buffer above threshold)

## Recent Closure Delta

- Fully covered files: `140 -> 177` (`+37`)
- Files with remaining gaps: `160 -> 126` (`-34`)
- `50%-70% branch` bucket: `24 -> 0`
- `line=100 but branch<100` bucket: `43 -> 30`
- Recent queue files closed to `100/100/100/100` include `Flows index`, `LifeCycleModels index`, `Processes form/view`, `Contacts delete`, `Processes delete`, `Processes Exchange delete`, `services/auth/{cognito,password}`, `Review/SelectReviewer`, `Flowproperties select form`, and `services/flowproperties/api`.

## All-File Inventory

Current repo-wide status from the same run:

- Source files tracked: 303
- Fully covered files (`100/100/100/100`): 177
- Files with remaining gaps: 126
- Branch buckets:
  - `<50`: 0 files
  - `50-70`: 0 files
  - `70-90`: 91 files
  - `90-<100`: 24 files
- `line=100` but `branch<100`: 30 files
- Category averages:
  - components: `97.18%` lines / `92.52%` branches / `95.42%` functions
  - services: `96.44%` lines / `90.38%` branches / `97.42%` functions
  - pages: `97.34%` lines / `92.92%` branches / `93.02%` functions
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

- [ ] `src/components/LCIACacheMonitor/index.tsx` — stmt `86.36%`, line `87.30%`, branch `72.22%`, func `80.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/Exchange/ioPortSelect.tsx` — stmt `98.41%`, line `98.33%`, branch `72.41%`, func `95.65%`
- [ ] `src/components/AllTeams/index.tsx` — stmt `98.75%`, line `98.71%`, branch `72.50%`, func `100.00%`
- [ ] `src/pages/Review/Components/reviewProcess/index.tsx` — stmt `90.12%`, line `90.56%`, branch `72.60%`, func `62.50%`
- [ ] `src/pages/Sources/Components/delete.tsx` — stmt `100.00%`, line `100.00%`, branch `72.72%`, func `100.00%`
- [ ] `src/services/unitgroups/util.ts` — stmt `100.00%`, line `100.00%`, branch `73.17%`, func `100.00%`
- [ ] `src/components/AISuggestion/index.tsx` — stmt `84.58%`, line `84.22%`, branch `73.60%`, func `97.05%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/add.tsx` — stmt `87.39%`, line `87.17%`, branch `74.19%`, func `71.87%`
- [ ] `src/services/teams/api.ts` — stmt `100.00%`, line `100.00%`, branch `74.28%`, func `100.00%`
- [ ] `src/pages/Sources/Components/form.tsx` — stmt `94.87%`, line `94.73%`, branch `74.41%`, func `80.00%`
- [ ] `src/pages/Contacts/Components/form.tsx` — stmt `100.00%`, line `100.00%`, branch `74.57%`, func `100.00%`
- [ ] `src/services/processes/classification/api.ts` — stmt `71.42%`, line `70.00%`, branch `75.00%`, func `80.00%`
- [ ] `src/pages/Review/index.tsx` — stmt `87.27%`, line `87.03%`, branch `75.00%`, func `100.00%`
- [ ] `src/pages/User/Login/password_forgot.tsx` — stmt `90.90%`, line `90.69%`, branch `75.00%`, func `77.77%`
- [ ] `src/pages/Review/Components/reviewLifeCycleModels/Components/toolbar/viewTargetAmount.tsx` — stmt `96.96%`, line `96.77%`, branch `75.00%`, func `87.50%`
- [ ] `src/services/auth/profile.ts` — stmt `100.00%`, line `100.00%`, branch `75.00%`, func `100.00%`
- [ ] `src/pages/Sources/Components/create.tsx` — stmt `83.94%`, line `85.60%`, branch `75.86%`, func `65.51%`
- [ ] `src/services/lifeCycleModels/api.ts` — stmt `89.35%`, line `89.30%`, branch `75.98%`, func `84.90%`
- [ ] `src/pages/Sources/Components/select/drawer.tsx` — stmt `87.87%`, line `87.75%`, branch `76.92%`, func `80.00%`
- [ ] `src/services/lca/taskCenter.ts` — stmt `88.38%`, line `88.03%`, branch `76.97%`, func `100.00%`
- [ ] `src/services/contacts/api.ts` — stmt `98.34%`, line `98.33%`, branch `77.10%`, func `100.00%`
- [ ] `src/services/lifeCycleModels/util_allocate_supply_demand.ts` — stmt `97.31%`, line `98.76%`, branch `77.22%`, func `100.00%`
- [ ] `src/pages/Sources/Components/view.tsx` — stmt `91.66%`, line `91.42%`, branch `77.27%`, func `62.50%`
- [ ] `src/pages/Sources/Components/select/form.tsx` — stmt `86.11%`, line `87.50%`, branch `77.31%`, func `78.26%`
- [ ] `src/pages/Flows/Components/create.tsx` — stmt `91.59%`, line `93.10%`, branch `77.35%`, func `70.83%`

Use `node scripts/test-coverage-report.js --full` for the full ordered queue of all 126 incomplete files.

## Shared-Fixture Batch Candidates

These clusters are the only standing justification for batched queue execution:

- `src/pages/Review/Components` — 14 incomplete files, min branch `72.60%`, avg branch `86.82%`
- `src/pages/LifeCycleModels/Components` — 10 incomplete files, min branch `72.41%`, avg branch `87.14%`
- `src/pages/Flows/Components` — 8 incomplete files, min branch `77.35%`, avg branch `86.12%`
- `src/pages/Sources/Components` — 7 incomplete files, min branch `72.72%`, avg branch `77.67%`
- `src/pages/Contacts/Components` — 7 incomplete files, min branch `74.57%`, avg branch `83.26%`
- `src/pages/Unitgroups/Components` — 7 incomplete files, min branch `78.26%`, avg branch `87.89%`
- `src/pages/Processes/Components` — 6 incomplete files, min branch `77.77%`, avg branch `82.92%`
- `src/pages/Flowproperties/Components` — 6 incomplete files, min branch `83.33%`, avg branch `87.90%`
- `src/components/AllTeams` — 4 incomplete files, min branch `72.50%`, avg branch `82.26%`
- `src/pages/User/Login` — 3 incomplete files, min branch `75.00%`, avg branch `89.81%`
- `src/services/processes` — 3 incomplete files, min branch `75.00%`, avg branch `83.64%`
- `src/services/lifeCycleModels` — 3 incomplete files, min branch `75.98%`, avg branch `79.12%`

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
