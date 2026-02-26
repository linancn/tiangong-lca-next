# Test Todo List

> Source of truth for **actionable** testing backlog. Use this file for execution planning; keep long-term context in `docs/agents/test_improvement_plan.md`. Mirror requirement: update `docs/agents/test_todo_list_CN.md` in the same change.

## Scope (from AGENTS test requirements)

This backlog is aligned to `AGENTS.md` delivery rules:

- add/adjust tests matching change scope,
- run focused Jest suites,
- ensure `npm run lint` passes,
- keep docs in sync when workflow expectations change.

## Snapshot Baseline (February 26, 2026)

Latest full run (`npm run test:coverage`):

- Test suites: 156 passed
- Tests: 1469 passed
- Coverage:
  - Statements: 63.60% (~10850/17059)
  - Branches: 50.01% (4823/9645)
  - Functions: 52.63% (1966/3735)
  - Lines: 63.78% (10367/16253)
- Enforced global branch threshold: 50%
- Gate status: **PASS** (buffer is minimal, +0.01%)

## Gap Assessment

1. Branch gate is recovered but margin is very thin (50.01%), so regressions can quickly fail CI.
2. Several high-branch page files still have low or zero branch coverage.
3. `src/pages/Review/**` still has many zero-line files and remains a high regression-risk area.
4. Service hotspots improved this cycle: `src/services/processes/api.ts` 87.64% (241/275), `src/services/unitgroups/api.ts` 82.96% (112/135), `src/services/auth/api.ts` 96.00% (24/25).
5. `src/services/general/api.ts` branch coverage is now 72.95% (143/196), no longer a gate blocker.
6. `src/services/lciaMethods/util.ts` (94.91%) and `src/services/reviews/api.ts` (67.45%) remain stable.

## Priority Backlog

### P0 – Recover Coverage Gate (must-do first)

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
- [ ] Add focused tests for zero-branch page modules with high branch count (to build safety buffer above 50%):
  - `src/pages/Contacts/Components/select/form.tsx` (BRF 84)
  - `src/pages/Flows/Components/edit.tsx` (BRF 85)
  - `src/pages/Flows/Components/select/form.tsx` (BRF 62)

Definition of done for P0:

- global branches >= 50% (currently 50.01%)
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
- [ ] Keep this file and `_CN` mirror updated after each completed item.

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
npm run test:coverage
```

5. Update status checkboxes and note measurable deltas.

## Notes

- Do not raise coverage thresholds before clearing P0.
- Prefer deterministic tests over broad snapshot expansion.
- Keep backlog actionable; avoid generic "add more tests" tasks.
