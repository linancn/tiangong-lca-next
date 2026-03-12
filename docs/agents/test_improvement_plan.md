# Test Improvement Plan

> Snapshot date: March 12, 2026. This file keeps long-term testing context and strategy. For the actionable day-to-day backlog, use `docs/agents/test_todo_list.md`. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Latest verified full run: `NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`
- Current Jest coverage (full run):
  - Statements: 62.88%
  - Branches: 47.79%
  - Functions: 52.29%
  - Lines: 63.05%
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **branch coverage is still below the enforced threshold, so full coverage runs currently fail the global gate despite recent Utils gains**.

## Principles

- Prioritize branch-heavy pure logic before broad UI snapshots.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.

## Priority Backlog

- [x] Auth reset/forgot flows are now covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [ ] Recover branch coverage above the global threshold, then rebuild a safety buffer (short-term target: restore >50%, then stabilize above 51%).
- [x] Add direct tests for `src/pages/Utils/index.tsx` helper branches.
- [ ] Expand tests around `src/pages/Utils/review.tsx` branch logic.
- [x] Expand tests around `src/pages/Utils/updateReference.tsx` branch logic.
- [ ] Add focused tests for remaining low-coverage page-level branches (e.g. admin/edge-state rendering paths).
- [ ] Continue targeted branch closure toward higher quality gate (mid-term target: >= 70% branches).

## Execution Loop

1. Pick one module with low branch coverage.
2. Add focused tests for uncovered branches.
3. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
4. Run `npm run lint`.
5. Re-run full coverage (latest verified local command: `NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`), record deltas in `docs/agents/test_todo_list.md`, and update this file if strategic priorities changed.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in `docs/agents/test_todo_list.md`; update this file when the strategic plan changes.
