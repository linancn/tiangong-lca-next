# Test Improvement Plan

> Snapshot date: February 26, 2026. This backlog tracks practical coverage improvements after core test infrastructure landed. Mirror requirement: sync `docs/agents/test_improvement_plan_CN.md` with every change.

## Current Baseline

- Current Jest coverage (full run):
  - Statements: 61.27%
  - Branches: 46.86%
  - Functions: 50.92%
  - Lines: 61.40%
- Current enforced threshold in `jest.config.cjs`: 50% global (branches/functions/lines/statements).
- Immediate issue: **branch coverage is below enforced threshold**.

## Principles

- Prioritize branch-heavy pure logic before broad UI snapshots.
- Reuse `tests/helpers/**` and `tests/mocks/**`; avoid one-off mock wiring.
- Keep test additions scoped and deterministic.
- Always run `npm run lint` after test changes.

## Priority Backlog

- [x] Auth reset/forgot flows are now covered in unit tests.
- [x] Core graph/context/request/supabase bootstrap tests are in place.
- [ ] Raise branch coverage above global threshold (first target: >= 50%).
- [ ] Expand tests around `src/pages/Utils/review.tsx` branch logic.
- [ ] Expand tests around `src/pages/Utils/updateReference.tsx` branch logic.
- [ ] Add focused tests for remaining low-coverage page-level branches (e.g. admin/edge-state rendering paths).
- [ ] Continue targeted branch closure toward higher quality gate (mid-term target: >= 70% branches).

## Execution Loop

1. Pick one module with low branch coverage.
2. Add focused tests for uncovered branches.
3. Run focused suite via `npm run test:ci -- <pattern> --runInBand --testTimeout=... --no-coverage`.
4. Run `npm run lint`.
5. Re-run `npm run test:coverage` and record deltas.

## Definition of Done (per item)

- Tests are deterministic and pass repeatedly.
- No skipped tests without explicit TODO reason.
- `npm run lint` passes.
- Coverage delta is measurable and documented in this file.
