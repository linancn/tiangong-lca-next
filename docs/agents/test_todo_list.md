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
- Tests: 1377 passed
- Coverage:
  - Statements: 61.27% (10453/17059)
  - Branches: 46.86% (4520/9645)
  - Functions: 50.92% (1902/3735)
  - Lines: 61.40% (9980/16253)
- Enforced global branch threshold: 50%
- Gap to threshold: **303 branch hits** still needed

## Gap Assessment

1. Main blocker is branch coverage, not suite pass rate.
2. Several high-branch files still have very low or zero branch coverage.
3. `src/pages/Review/**` has many zero-line files; this is a risk area for regressions.
4. Service-layer hotspots with high branch weight are under-covered (`reviews/api`, `lciaMethods/util`, `general/api`).

## Priority Backlog

### P0 – Recover Coverage Gate (must-do first)

- [ ] Add branch-focused tests for `src/services/reviews/api.ts` (current branch ~17%).
  - Target: cover session/no-session, error, empty-data, and status mapping branches.
- [ ] Add branch-focused tests for `src/services/lciaMethods/util.ts` (current branch ~25%).
  - Target: IndexedDB unavailable, cache miss/hit, malformed cache data, refresh/fallback branches.
- [ ] Add branch-focused tests for `src/services/general/api.ts` (current branch ~53%, high branch count).
  - Target: error paths and optional parameter branches currently missed.
- [ ] Add focused tests for zero-branch page modules with high branch count:
  - `src/pages/Contacts/Components/select/form.tsx` (BRF 84)
  - `src/pages/Flows/Components/edit.tsx` (BRF 85)
  - `src/pages/Flows/Components/select/form.tsx` (BRF 62)

Definition of done for P0:

- global branches >= 50%
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
