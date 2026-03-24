# Test Todo List

> Source of truth for current testing execution status. While the repo stays at full closure, this file operates in maintenance mode rather than as an active backlog. Keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 24, 2026)

Latest verified full run (`npm run test:coverage:report`, followed by `npm run test:coverage:assert-full`):

- Test suites: 309 passed
- Tests: 3689 passed
- Coverage:
  - Statements: 100.00% (21875/21875)
  - Branches: 100.00% (12565/12565)
  - Functions: 100.00% (4750/4750)
  - Lines: 100.00% (20967/20967)
- Delta vs previous documented baseline:
  - Test suites: +1
  - Tests: +2
  - Statements: +6
  - Branches: +5
  - Functions: +2
  - Lines: +6
- Enforced global branch threshold: 50%
- Gate status: **PASS** (+50.00% buffer above threshold)

## Current State

- The ordered closure queue is empty.
- The repo is in maintenance mode.
- Any code change is a hard requirement to preserve repo-wide `100%` statements / branches / functions / lines.
- Local push is blocked unless the repo passes `.husky/pre-push`, which now runs `npm run prepush:gate`.

## Integration Expansion Program (Separate from Coverage Queue)

- This program exists to deepen workflow confidence after coverage closure. It does not replace the coverage-maintenance rules above.
- Measure progress with the 100-point integration scorecard in `docs/agents/ai-testing-guide.md`, not by trying to make `tests/integration` alone reach `100%` code coverage.
- Target state:
  - New or materially refactored high-risk workflows should reach `>=85/100` before being called integration-complete.
  - Existing legacy workflows can be raised phase by phase instead of being rewritten all at once.

## Ordered Integration Rollout

1. Phase 1 – Route/data-source matrix
   - [x] Expand `tests/integration/lifeCycleModels/LifeCycleModelsWorkflow.integration.test.tsx` and `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` so each suite now covers `/mydata` plus `/tgdata`.
   - [x] Expand `tests/integration/flows/FlowsWorkflow.integration.test.tsx` and `tests/integration/flowproperties/FlowpropertiesWorkflow.integration.test.tsx` so each suite now covers `/mydata` plus `/tgdata`.
   - [x] Expand `tests/integration/unitgroups/UnitgroupsWorkflow.integration.test.tsx`, `tests/integration/sources/SourcesWorkflow.integration.test.tsx`, and `tests/integration/contacts/ContactsWorkflow.integration.test.tsx` so each suite now covers `/mydata` plus `/tgdata`.
   - [ ] When UI or service behavior genuinely differs by source type, promote that feature to the full `/mydata` + `/tgdata` + `/codata` + `/tedata` matrix instead of stopping at one secondary prefix.
2. Phase 2 – Permission and role matrix
   - [x] Expand `tests/integration/teams/TeamsWorkflow.integration.test.tsx`, `tests/integration/manageSystem/ManageSystemWorkflow.integration.test.tsx`, and `tests/integration/reviews/ReviewWorkflow.integration.test.tsx` so each suite now covers allow, restricted, and failure states.
   - [x] Assert both user-visible controls and the allowed/prevented `@/services/**` calls.
3. Phase 3 – URL/query and navigation flows
   - [x] Keep `tests/integration/user/LoginWorkflow.integration.test.tsx` responsible for `redirect` query handling.
   - [x] Keep `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` responsible for `id/version` deep-link auto-open behavior.
   - [x] Expand entry/navigation assertions in `tests/integration/welcome/WelcomeWorkflow.integration.test.tsx`, `tests/integration/account/AccountProfileWorkflow.integration.test.tsx`, and the `/mydata/processes/analysis` jump from the Processes page.
4. Phase 4 – Failure and fallback behavior
   - [x] `tests/integration/welcome/WelcomeWorkflow.integration.test.tsx` already keeps the Data Ecosystem modal responsive when `getTeams()` returns no teams.
   - [x] `tests/integration/welcome/WelcomeWorkflow.integration.test.tsx` now also keeps team cards visible when thumbnail lookups fail.
   - [x] `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` now covers an empty initial table result and visible recovery after the user hits reload.
   - [x] `tests/integration/processes/ProcessesWorkflow.integration.test.tsx` now covers thrown list-request failures with a visible toast plus reload recovery.
   - [x] `tests/integration/user/LoginWorkflow.integration.test.tsx` now covers duplicate-registration fallback plus inline feedback when validation-email delivery fails.
   - [x] `tests/integration/account/AccountProfileWorkflow.integration.test.tsx` now covers invalid current password and invalid-credential fallback during API key generation.
   - [x] `tests/integration/account/AccountProfileWorkflow.integration.test.tsx` now covers initial profile-load failure and change-email failure messaging.
   - [ ] For each workflow anchor above, cover list-load failure, create/update failure, delete failure or cancel, and empty-state rendering where meaningful.
   - [ ] Prefer user-visible recovery assertions over console-only assertions.
5. Phase 5 – Optional browser-real smoke
   - [ ] Only if a human explicitly chooses to add E2E later, promote a very small smoke set: login redirect, welcome entry jump, one representative CRUD path, and one upload/preview flow.

## All-File Inventory

Current repo-wide status from the same run:

- Source files tracked: 334
- Fully covered files (`100/100/100/100`): 334
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
8. When a human explicitly asks for broader integration confidence work, execute the phased integration rollout above in order instead of adding ad hoc one-off scenarios.

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
- For integration-expansion work, prefer matrix-driven suites (`describe.each(...)`) over one-file-per-variant duplication.
- Keep future E2E scope intentionally thin and browser-real only.

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
