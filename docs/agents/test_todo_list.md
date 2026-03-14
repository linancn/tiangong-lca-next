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
- Tests: 2481 passed
- Coverage:
  - Statements: 93.93% (17286/18402)
  - Branches: 82.32% (8819/10712)
  - Functions: 91.09% (3569/3918)
  - Lines: 94.26% (16559/17567)
- Delta vs previous documented baseline:
  - Test suites: +0
  - Tests: +131
  - Statements: +2.45
  - Branches: +4.15
  - Functions: +3.73
  - Lines: +2.48
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+32.32% buffer above threshold)

## Recent Closure Delta

- Fully covered files: `115 -> 140` (`+25`)
- Files with remaining gaps: `185 -> 160` (`-25`)
- `<50% branch` bucket: `2 -> 0`
- `50%-70% branch` bucket: `46 -> 24`
- Recent queue files closed to `100/100/100/100` include `TableFilter`, `FileViewer/upload`, `Unitgroups edit`, `Processes edit`, `Processes Exchange create/edit/select`, `Flows Property create/edit`, `ReviewForm/view`, and `Processes Compliance/view`.

## All-File Inventory

Current repo-wide status from the same run:

- Source files tracked: 300
- Fully covered files (`100/100/100/100`): 140
- Files with remaining gaps: 160
- Branch buckets:
  - `<50`: 0 files
  - `50-70`: 24 files
  - `70-90`: 101 files
  - `90-<100`: 24 files
- `line=100` but `branch<100`: 43 files
- Category averages:
  - components: `96.81%` lines / `89.64%` branches / `95.08%` functions
  - services: `95.90%` lines / `86.72%` branches / `97.17%` functions
  - pages: `96.15%` lines / `87.70%` branches / `90.81%` functions
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
6. If the remaining branch is provably unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests.
7. Keep wrapper/page-level orchestration tests in scope; do not rely only on child-component coverage.

## Current Ordered Closure Queue (Head Snapshot)

- [ ] `src/pages/Unitgroups/Components/Unit/reference.tsx` — stmt `100.00%`, line `100.00%`, branch `62.50%`, func `100.00%`
- [ ] `src/components/LocationTextItem/form.tsx` — stmt `100.00%`, line `100.00%`, branch `63.63%`, func `100.00%`
- [ ] `src/pages/Flows/index.tsx` — stmt `79.72%`, line `80.28%`, branch `64.51%`, func `61.29%`
- [ ] `src/pages/LifeCycleModels/index.tsx` — stmt `87.35%`, line `87.20%`, branch `64.70%`, func `89.47%`
- [ ] `src/pages/Processes/Components/form.tsx` — stmt `84.73%`, line `85.27%`, branch `64.86%`, func `70.73%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/viewIndex.tsx` — stmt `92.46%`, line `91.72%`, branch `65.00%`, func `86.48%`
- [ ] `src/pages/Sources/Components/select/description.tsx` — stmt `100.00%`, line `100.00%`, branch `65.00%`, func `100.00%`
- [ ] `src/pages/Flowproperties/Components/form.tsx` — stmt `100.00%`, line `100.00%`, branch `65.21%`, func `100.00%`
- [ ] `src/pages/Processes/Components/create.tsx` — stmt `83.45%`, line `84.61%`, branch `65.27%`, func `56.66%`
- [ ] `src/components/LevelTextItem/form.tsx` — stmt `77.90%`, line `77.64%`, branch `65.57%`, func `77.77%`
- [ ] `src/pages/Unitgroups/Components/select/formMini.tsx` — stmt `94.73%`, line `94.59%`, branch `65.71%`, func `83.33%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/editIndex.tsx` — stmt `98.81%`, line `99.15%`, branch `65.85%`, func `96.19%`
- [ ] `src/pages/Processes/Components/view.tsx` — stmt `84.55%`, line `84.91%`, branch `66.51%`, func `80.00%`
- [ ] `src/pages/Contacts/Components/delete.tsx` — stmt `100.00%`, line `100.00%`, branch `66.66%`, func `100.00%`
- [ ] `src/pages/Processes/Components/delete.tsx` — stmt `100.00%`, line `100.00%`, branch `66.66%`, func `100.00%`
- [ ] `src/pages/Processes/Components/Exchange/delete.tsx` — stmt `100.00%`, line `100.00%`, branch `66.66%`, func `100.00%`
- [ ] `src/services/auth/cognito.ts` — stmt `100.00%`, line `100.00%`, branch `66.66%`, func `100.00%`
- [ ] `src/services/auth/password.ts` — stmt `100.00%`, line `100.00%`, branch `66.66%`, func `100.00%`
- [ ] `src/pages/Review/Components/SelectReviewer.tsx` — stmt `89.14%`, line `88.88%`, branch `67.44%`, func `76.00%`
- [ ] `src/pages/LifeCycleModels/Components/toolbar/viewTargetAmount.tsx` — stmt `97.05%`, line `96.87%`, branch `67.64%`, func `87.50%`

Use `node scripts/test-coverage-report.js --full` for the full ordered queue of all 160 incomplete files.

## Shared-Fixture Batch Candidates

These clusters are the only standing justification for batched queue execution:

- `src/pages/Review/Components` — 16 incomplete files, min branch `67.44%`, avg branch `84.65%`
- `src/pages/LifeCycleModels/Components` — 15 incomplete files, min branch `65.00%`, avg branch `80.70%`
- `src/pages/Processes/Components` — 12 incomplete files, min branch `64.86%`, avg branch `75.90%`
- `src/pages/Unitgroups/Components` — 10 incomplete files, min branch `62.50%`, avg branch `81.18%`
- `src/pages/Flows/Components` — 8 incomplete files, min branch `77.35%`, avg branch `86.12%`
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
