# Test Todo List

> Source of truth for **actionable** testing backlog. Use this file for execution planning; keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.
- when testing workflow/baseline/backlog changes, sync `docs/agents/ai-testing-guide.md` and this file; if strategic context changes too, sync `docs/agents/test_improvement_plan.md` and `_CN` mirrors in the same diff.

## Snapshot Baseline (March 12, 2026)

Latest verified full run (`NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage`):

- Test suites: 159 passed
- Tests: 1502 passed
- Coverage:
  - Statements: 62.21% (11168/17950)
  - Branches: 47.19% (4955/10500)
  - Functions: 51.82% (2012/3882)
  - Lines: 62.42% (10692/17129)
- Enforced global branch threshold: 50%
- Gate status: **FAIL** (threshold miss: -2.81%)

## Gap Assessment

1. Branch gate is currently failing (47.19% vs required 50%), so restoring global branch coverage is the immediate blocker.
2. Several high-branch page files still have low or zero branch coverage.
3. `src/pages/Review/**` still has many zero-line files and remains a high regression-risk area.
4. Recent service-layer gains remain valuable, but page-level and UI helper branch gaps now dominate the global number again.
5. `src/services/general/api.ts` is no longer the primary blocker; page-level and utility branches matter more for gate recovery.
6. `src/services/lciaMethods/util.ts` and `src/services/reviews/api.ts` remain healthier than the current page-layer hotspots.

## Priority Backlog

### P0 – Recover Branch Coverage Gate (must-do first)

- [x] Add branch-focused tests for `src/services/reviews/api.ts` (latest branch 67.45%).
  - Completed: covered review member/admin table branches, rejected/process filters, notify count filters, and lifecycle subtable batch branches in `tests/unit/services/reviews/api.test.ts`.
- [x] Add branch-focused tests for `src/services/lciaMethods/util.ts` (latest branch 94.91%).
  - Completed: covered IndexedDB cursor success/error, cache miss/hit, stale-list refresh, and fallback paths in `tests/unit/services/lciaMethods/util.test.ts`.
- [x] Add branch-focused tests for `src/services/general/api.ts` (latest branch 72.95%).
  - Completed: covered additional data access, version list mapping, edge-function failure, and fallback branches in `tests/unit/services/general/api.test.ts`.
- [x] Add branch-focused tests for `src/services/processes/api.ts` (latest branch 87.64%).
  - Completed: covered validation-failure paths, datasource filtering branches, connectable-process filtering branches, hybrid/pgroonga error paths, and optional mapping fallbacks in `tests/unit/services/processes/api.test.ts`.
- [x] Add branch-focused tests for `src/services/unitgroups/api.ts` (latest branch 82.96%).
  - Completed: covered datasource filters, rpc/edge error branches, zh/en mapping fallback and catch branches, and reference lookup fallbacks in `tests/unit/services/unitgroups/api.test.ts`.
- [x] Add branch-focused tests for `src/services/auth/api.ts` (latest branch 96.00%).
  - Completed: covered empty credential fallbacks, reauthenticate guest fallback, and fresh metadata retrieval branches in `tests/unit/services/auth/api.test.ts`.
- [ ] Add focused tests for zero-branch page modules with high branch count (to restore global branches above 50%, then rebuild safety buffer):
  - `src/pages/Utils/index.tsx` (small helper-branch file, low-cost buffer gain)
  - `src/pages/Contacts/Components/select/form.tsx` (BRF 84)
  - `src/pages/Flows/Components/edit.tsx` (BRF 85)
  - `src/pages/Flows/Components/select/form.tsx` (BRF 62)

Definition of done for P0:

- global branches are back above 50% with measurable safety buffer (currently 47.19%)
- `npm run lint` passes
- focused suites for touched modules pass

### P1 – High-Risk Workflow Hardening

- [ ] Cover zero-line review modules in `src/pages/Review/Components/**` first:
  - `AddMemberModal.tsx`
  - `Compliance/view.tsx`
  - `Exchange/view.tsx`
  - `reviewLifeCycleModels/Components/toolbar/*`
- [ ] Add regression tests around lifecycle model view toolbars:
  - `src/pages/LifeCycleModels/Components/toolbar/viewIndex.tsx`
  - `src/pages/LifeCycleModels/Components/toolbar/viewInfo.tsx`
  - `src/pages/LifeCycleModels/Components/toolbar/viewTargetAmount.tsx`
- [ ] Add minimal smoke tests for currently uncovered but user-facing pages:
  - `src/pages/Admin.tsx`
  - `src/pages/404.tsx`

Definition of done for P1:

- no zero-line coverage for critical review/lifecycle UI modules above
- branch trend is increasing release-over-release

### P2 – Test Engineering Quality Upgrades

- [ ] Standardize new tests on shared helpers (`tests/helpers/mockBuilders.ts`, `testUtils.tsx`, `testData.ts`).
- [ ] Remove or refactor noisy console-only assertions into behavior assertions where possible.
- [ ] Ensure every new feature PR includes:
  - service-level unit tests for branch logic,
  - at least one integration workflow test when UI orchestration changes.
- [ ] Keep this file and `_CN` mirror updated after each completed item; when strategic testing context changes, sync `docs/agents/test_improvement_plan.md` and `docs/agents/ai-testing-guide.md` too.

## Execution Protocol (per task)

1. Implement tests for one module at a time.
2. Run focused command:

```bash
npm run test:ci -- <pattern> --runInBand --testTimeout=20000 --no-coverage
```

3. Run lint gate:

```bash
npm run lint
```

4. After each P0 batch, run full coverage:

```bash
NODE_OPTIONS=--max-old-space-size=8192 npm run test:coverage
```

5. Update status checkboxes and note measurable deltas.
6. If workflow/baseline/backlog expectations changed, sync `docs/agents/ai-testing-guide.md`; if strategic context changed, sync `docs/agents/test_improvement_plan.md` too.

## Notes

- Do not raise coverage thresholds before recovering the P0 branch gate.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; avoid generic "add more tests" tasks.
