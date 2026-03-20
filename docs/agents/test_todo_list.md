# Test Todo List

> Source of truth for current testing execution status. While the repo stays at full closure, this file operates in maintenance mode rather than as an active backlog. Keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 20, 2026)

Latest verified full run (`npm run test:coverage:report`, which reruns `npm run test:coverage` first):

- Test suites: 288 passed
- Tests: 3476 passed
- Coverage:
  - Statements: 100.00% (20013/20013)
  - Branches: 100.00% (11419/11419)
  - Functions: 100.00% (4379/4379)
  - Lines: 100.00% (19143/19143)
- Delta vs previous documented baseline:
  - Test suites: +2
  - Tests: +634
  - Statements: +5.03
  - Branches: +12.03
  - Functions: +5.99
  - Lines: +4.85
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+50.00% buffer above threshold)

## Current State

- The ordered closure queue is empty.
- The repo is in maintenance mode.
- Any code change is a hard requirement to preserve repo-wide `100%` statements / branches / functions / lines.
- Local push is blocked unless the repo passes `.husky/pre-push`, which now runs `npm run prepush:gate`.

## All-File Inventory

Current repo-wide status from the same run:

- Source files tracked: 313
- Fully covered files (`100/100/100/100`): 313
- Files with remaining gaps: 0
- Branch buckets:
  - `<50`: 0 files
  - `50-70`: 0 files
  - `70-90`: 0 files
  - `90-<100`: 0 files
- `line=100` but `branch<100`: 0 files
- Category averages:
  - components: `100.00%` lines / `100.00%` branches / `100.00%` functions
  - services: `100.00%` lines / `100.00%` branches / `100.00%` functions
  - pages: `100.00%` lines / `100.00%` branches / `100.00%` functions
  - others: `100.00%` lines / `100.00%` branches / `100.00%` functions

## Reporting Workflow

- The shared `npm test` runner caps the unit/src phase at `--maxWorkers=50%` to avoid intermittent Jest worker `SIGSEGV` crashes seen during full local and pre-push runs on macOS.
- `npm run test:coverage` and `npm run test:coverage:report` already include the required heap setting; use those scripts directly for full coverage work.
- `npm run test:coverage:assert-full` fails unless the latest coverage artifact still reports full closure for every tracked source file.
- `npm run prepush:gate` is the exact local push gate: `lint + full coverage + strict full-coverage assertion`.
- `npm run test:coverage:report` is the default review artifact. It prints:
  - global summary,
  - category summary,
  - closure-queue summary,
  - shared-fixture batches,
  - next 25 ordered incomplete files.
- The queue and batch sections print full project-relative paths; file and cluster labels are not shortened with `...`.
- `node scripts/test-coverage-report.js --full` prints the full ordered incomplete-file queue for all remaining files.
- When the queue is empty, both report commands explicitly print `No files with remaining coverage gaps.`; keep using them to confirm the repo stays in maintenance mode after future test-engineering changes.
- Queue order is deterministic: `branches asc -> lines asc -> statements asc -> functions asc -> path`.

## Execution Strategy

1. Do not re-rank work by ad hoc “highest ROI” judgments.
2. While the queue is empty, stay in maintenance mode: every touched or newly added `src/**` file should remain at `100/100/100/100`.
3. If a future regression reopens the queue, resume strict execution from the first file in the ordered closure queue.
4. Allowed batch exception: if the current file and its immediate neighbors share the same mock/fixture/test harness, close them in one batch anchored to the earliest queued file.
5. Allowed infrastructure exception: if a shared test blocker prevents coverage on the current file or its immediate neighbors, fix the blocker first and then resume queue order.
6. If the remaining branch is provably unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests.
7. Keep wrapper/page-level orchestration tests in scope; do not rely only on child-component coverage.

## Current Ordered Closure Queue (Head Snapshot)

- No files with remaining coverage gaps.
- Maintenance rule: if a future change reopens coverage debt, regenerate the queue with `npm run test:coverage:report` and resume from the first reported file.
- `node scripts/test-coverage-report.js --full` remains the source of truth for the full ordered queue whenever the repo leaves maintenance mode.

## Shared-Fixture Batch Candidates

No batching candidates are currently active because the queue is empty.

## Test Engineering Quality Rules

- Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`) whenever they fit the active file or future reopened queue batch.
- Remove or refactor console-only assertions into behavior assertions where possible.
- When a page wrapper exists above a tested component, add at least one wrapper-level test so coverage reflects real orchestration rather than child-only behavior.
- When a queue file still misses only dead or business-invalid branches, prefer behavior-preserving branch removal over synthetic test scaffolding.
- Keep the default report concise; only add more default detail if it changes execution order. Deep per-file detail stays behind `--full`.
- In maintenance mode, treat any newly uncovered branch as a regression to eliminate immediately rather than as backlog to postpone.

## Execution Protocol (per task)

1. Start with `npm run test:coverage:report`.
2. If the report shows no gaps, stay in maintenance mode and keep every touched or newly added `src/**` file at `100/100/100/100`.
3. If the report shows gaps, take the first file from the ordered closure queue and close it before moving on.
4. Run focused command:

```bash
npm run test:ci -- <pattern> --runInBand --testTimeout=20000 --no-coverage
```

5. Run lint gate:

```bash
npm run lint
```

6. After each meaningful batch or before syncing the docs, run full coverage:

```bash
npm run test:coverage
```

7. Review the default closure report:

```bash
npm run test:coverage:report
```

8. Only when you need the full remaining-file state or need to refresh the queue snapshot, expand to full detail:

```bash
node scripts/test-coverage-report.js --full
```

9. Update status notes and measurable deltas when the baseline or maintenance status changed.
10. If workflow/baseline/backlog expectations changed, sync `docs/agents/ai-testing-guide.md`; if strategic context changed, sync `docs/agents/test_improvement_plan.md` too.

## Notes

- Do not raise coverage thresholds yet; first keep the repo at full closure and prevent future regressions from reopening the queue.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; when the queue is empty, keep this file in maintenance mode rather than inventing filler backlog.
