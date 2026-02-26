# Testing Troubleshooting – Tiangong LCA Next

> Use this file when tests fail, timeout, or hang. Read order: `AGENTS.md` -> `ai-testing-guide.md` -> this file. Mirror requirement: keep `docs/agents/testing-troubleshooting_CN.md` synchronized.

## Command Matrix

```bash
# Full gate
npm test

# Focused integration
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# Focused unit/component
npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# Detect open handles
npm run test:ci -- tests/integration/<feature>/<file>.test.tsx \
  --runInBand --testTimeout=20000 --detectOpenHandles

# Coverage
npm run test:coverage
npm run test:coverage:report

# Lint
npm run lint
```

## Failure Diagnosis

### 1) Infinite loop / timeout / Maximum update depth exceeded

Check first:

- Were all service calls mocked before render?
- Are you returning stable values (`mockResolvedValue`) instead of unstable per-call object construction?
- Are async assertions properly awaited?

Fix pattern:

```ts
beforeEach(() => {
  jest.clearAllMocks();
  mockApi.list.mockResolvedValue({ data: [], error: null });
  mockApi.create.mockResolvedValue({ data: { id: '1' }, error: null });
});
```

### 2) Auth/session-dependent behavior failing

- Mock `supabase.auth.getSession()` consistently.
- If page depends on initial state model, mock `@@initialState` provider path used by that page.

### 3) Element not found / flaky query

- Prefer semantic queries: `getByRole`, `getByLabelText`, `findByText`.
- Switch to async query (`findBy*`) when content renders after effects.
- Verify expected i18n text/key exists in locale files.

### 4) Mock not being hit

- Ensure `jest.mock('@/services/...')` path exactly matches the import path in the source file.
- Clear stale mocks/modules in `beforeEach`.

### 5) Context/provider errors

- Render with `renderWithProviders` from `tests/helpers/testUtils.tsx` when providers are needed.
- If custom render is required, add only the minimum provider stack needed by the component.

## Open Handle Playbook

When Jest does not exit:

1. Rerun with `--detectOpenHandles`.
2. Check unawaited async flows and unresolved timers.
3. Ensure fake timers are restored (`jest.useRealTimers()`).
4. Verify global side effects are cleaned in `afterEach`.

## Coverage Gap Playbook

- Add unit tests for pure helpers/branches unreachable from integration tests.
- Add component tests for feature-flag/prop-gated UI branches.
- Use targeted `collectCoverageFrom` runs during gap closure.

## Final Verification

Before concluding a fix:

1. Re-run the focused failing suite.
2. Re-run neighboring impacted suite if behavior changed.
3. Run `npm run lint`.
4. If workflow changed, sync docs (English + `_CN`).
