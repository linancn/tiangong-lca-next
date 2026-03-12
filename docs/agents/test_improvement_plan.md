# Test Improvement Plan

> Snapshot date: March 12, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`
- Current Jest coverage (full run):
  - Statements: 72.79%
  - Branches: 58.11%
  - Functions: 63.29%
  - Lines: 73.02%
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **the global gate is recovered, so the strategic problem has shifted from threshold recovery to reducing concentrated page-level workflow hotspots and the remaining lifecycle calculation branch debt**.

## Principles

- Prioritize branch-heavy pure logic before broad UI snapshots.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.
- Do not raise coverage thresholds again until the current 58% branch baseline is stable across the main page-level hotspots.

## Priority Backlog

- [x] Auth reset/forgot flows are now covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [x] Recover branch coverage above the global threshold and rebuild a measurable safety buffer (current branch coverage: 58.11%).
- [x] Add direct tests for `src/pages/Utils/index.tsx` helper branches.
- [ ] Expand tests around `src/pages/Utils/review.tsx` branch logic.
- [x] Expand tests around `src/pages/Utils/updateReference.tsx` branch logic.
- [x] Cover contact/source select form+drawer workflows and lifecycle-model view toolbars.
- [ ] Focus next on page-heavy edit/workflow hotspots: `toolbar/editIndex.tsx`, `reviewProcess/tabsDetail.tsx`, `Processes/edit.tsx`, `ReviewProgress.tsx`, and unitgroup selectors.
- [ ] Expand `src/services/lifeCycleModels/util_calculate.ts` branch coverage as the main remaining service-layer hotspot.
- [ ] Continue targeted branch closure toward a higher-quality gate (next stabilization target: >= 60% branches, then push toward 65-70%).

## Execution Loop

1. Pick one module from the current highest branch-miss list in `docs/agents/test_todo_list.md`.
2. Add focused tests for uncovered branches.
3. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
4. Run `npm run lint`.
5. Re-run full coverage (latest verified local command: `NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`), record deltas in `docs/agents/test_todo_list.md`, and update this file if strategic priorities changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`; update this file when the strategic plan or hotspot ordering changes.
