# Test Improvement Plan

> Snapshot date: March 23, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `npm run test:coverage`
- Current full run footprint: 308 suites / 3665 tests
- Current Jest coverage (full run):
  - Statements: 100.00% (21749/21749)
  - Branches: 100.00% (12506/12506)
  - Functions: 100.00% (4740/4740)
  - Lines: 100.00% (20851/20851)
- Current file inventory: 331 tracked source files, 331 fully covered, 0 still incomplete.
- Current branch buckets: `<50 = 0`, `50-70 = 0`, `70-90 = 0`, `90-<100 = 0`.
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **full closure has been achieved. The strategic task is now maintenance: keep every touched or newly added `src/**`file at`100/100/100/100`, and reopen the ordered queue immediately if a future regression appears.\*\*

## Principles

- Long-term target: 100% meaningful coverage across `src/**`.
- Use the coverage report queue as the ordering source of truth; do not re-rank by subjective “highest ROI” judgments.
- When the queue is non-empty, execute one queue file at a time and try to close it to `100/100/100/100` before moving on.
- When the queue is empty, stay in maintenance mode and keep every touched or newly added `src/**` file at `100/100/100/100`.
- Allowed strategy exceptions are narrow: batch adjacent files that share the same mock/fixture/test harness, and fix shared test-infrastructure blockers first only when they block the current file or its immediate neighbors.
- If a queued branch is proven unreachable or business-invalid, remove the dead branch without changing behavior instead of inventing synthetic tests.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again yet; first prove that full closure can be preserved under maintenance.

## Integration Testing North Star

- Now that full coverage closure has been achieved, the next major quality gain should come from stronger workflow confidence, not from forcing `tests/integration` alone to hit `100%` code coverage.
- Define integration success by the 100-point scorecard in `docs/agents/ai-testing-guide.md`:
  - workflow coverage,
  - route/role/query matrix coverage,
  - failure and fallback behavior,
  - navigation and browser-adjacent side effects,
  - engineering quality.
- Default expansion layer: integration tests.
- Default E2E scope: thin smoke only, reserved for browser-real behavior that integration tests cannot credibly model.
- Release-ready target for a high-risk workflow: `>=85/100`.
- Brownfield target: raise one phase at a time; do not rewrite every existing integration suite in one pass.

## Phased Integration Roadmap

1. Route/data-source matrix phase
   - Exit criteria: every pathname-driven shared-data page has `/mydata` plus at least one non-`/mydata` prefix covered in integration.
   - Promotion rule: if the page truly behaves differently across sources, expand to the full `/mydata` + `/tgdata` + `/codata` + `/tedata` matrix.
2. Permission and role phase
   - Exit criteria: `Teams`, `ManageSystem`, and `Review` each cover allow, restricted, and failure states.
3. URL/query and navigation phase
   - Exit criteria: login redirect, deep-link open states, and cross-page navigation contracts are asserted in integration.
4. Failure and fallback phase
   - Exit criteria: user-visible handling exists for list-load failure, create/update failure, delete failure or cancel, and meaningful empty states.
5. Optional browser-real smoke phase
   - Exit criteria: only a very small E2E smoke layer exists, focused on redirect chains, uploads/previews, reload behavior, and full-page navigation.

## Maintenance Backlog

- [ ] Keep the repo in maintenance mode by preserving `100/100/100/100` on every touched or newly added `src/**` file.
- [ ] Treat any newly uncovered branch as an immediate regression, not as future backlog.
- [ ] Re-run `npm run test:coverage:report` after meaningful test-engineering changes to confirm the queue remains empty.
- [ ] Keep the local push gate aligned with the docs and scripts (`npm run prepush:gate` must remain the authoritative local enforcement command).
- [ ] When humans request broader workflow-confidence work, execute the phased integration rollout from `docs/agents/test_todo_list.md` instead of adding ad hoc one-off scenarios.
- [ ] Keep any future E2E investment intentionally thin and browser-real only.

## Execution Loop

1. Start from `npm run test:coverage:report`.
2. If the report shows no remaining gaps, stay in maintenance mode and keep all touched `src/**` files at `100/100/100/100`.
3. If the report shows gaps, take the first file from the ordered closure queue in `docs/agents/test_todo_list.md`.
4. If its immediate neighbors share the same mock/fixture/test harness, batch them under the same setup work; otherwise stay on the single file.
5. Add focused tests for uncovered branches and missing orchestration paths; if the remaining branch is provably dead, remove it without changing behavior and continue.
6. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
7. Run `npm run lint`.
8. Re-run full coverage (`npm run test:coverage`) and review `npm run test:coverage:report`; expand to `node scripts/test-coverage-report.js --full` only when the queue is non-empty and the full file-by-file state is needed.
9. Record deltas in `docs/agents/test_todo_list.md`, and update this file only if the strategic execution rules or inventory summary changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`.
- The current queue file is closed, or the repo remains in maintenance mode with no remaining gaps.
- Any remaining uncovered branch still requires an explicit documented reason that it is unreachable or business-invalid.
- Update this file when the strategic execution rules, inventory summary, or queue-exception policy changes.
