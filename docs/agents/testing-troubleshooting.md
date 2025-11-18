# Testing Troubleshooting – Tiangong LCA Next

> Agents: read `docs/agents/ai-testing-guide.md` first. This file collects the extended command matrix and troubleshooting playbook; mirror: `docs/agents/testing-troubleshooting_CN.md`.

## Command Reference

### Core Jest Commands

```bash
# Integration workflow (serial, deterministic timeout)
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# Unit/utility suites
npm test -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# Single file with handle detection
detect_open_handles="--detectOpenHandles"
npm test -- tests/integration/processes/ProcessesWorkflow.integration.test.tsx \
  --runInBand --testTimeout=20000 $detect_open_handles

# Watch mode (no timeout; development only)
npm test -- tests/unit/services/processes/ --watch
```

### Coverage & Reporting

```bash
npm run test:coverage
npm run test:coverage:report
npx jest --coverage --collectCoverageFrom="src/services/teams/api.ts"
open coverage/lcov-report/index.html
```

### Lint & Formatting

```bash
npm run lint                # ESLint + Prettier check + tsc
npm run lint -- --fix       # Attempt auto-fix
npm run prettier            # Full-format check (mirrors lint:prettier)
```

### Investigation Helpers

```bash
rg "from '@/services/contacts'" -n src/pages
rg "describe\(.*Processes" -n tests/
ls tests/integration/<feature>/
rg "mockTeam" tests/unit/
```

### Quick Reference

```bash
# Typical verification flow
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage
npm run lint

# Debug stubborn handles
detect_open_handles="--detectOpenHandles"
npm test -- tests/unit/services/<module>/ --runInBand --testTimeout=15000 $detect_open_handles
```

## Troubleshooting

### Infinite Loop or Timeout

- Confirm every Supabase/service call is mocked in `beforeEach` _before_ rendering.
- Replace `mockImplementation` loops with `mockResolvedValue` / `mockRejectedValue`.
- Wrap asynchronous assertions with `await waitFor(...)`.
- Increase timeouts only after verifying mocks; rerun with `--detectOpenHandles` to find leaked timers or sockets.

### Auth or Session Failures

- Mock `supabase.auth.getSession()` (or `useModel('@@initialState')`) to return a stable session when components gate behavior by auth.
- Reuse helpers in `tests/helpers/mockSetup.ts` to seed default session/team data.

### Unable to Find Elements

- Prefer semantic queries (`getByRole`, `getByLabelText`, `findByText`).
- When content renders asynchronously, switch to `findBy*` with `await`.
- Verify translated text IDs exist in `src/locales/**`; missing keys break assertions.

### Supabase Mock Not Hit

- Ensure `jest.mock('@/services/...')` paths match the import path in the component under test.
- Call `jest.clearAllMocks()` or `jest.resetModules()` in `beforeEach` to avoid stale implementations.

### Intl / Router Context Errors

- Always render via `tests/helpers/testUtils.tsx` (`TestWrapper`) so IntlProvider, Router, and models are present.
- When custom rendering is required, manually provide `<IntlProvider locale='en-US' messages={messages}>` and `<MemoryRouter>`.

### Coverage Gaps

- Add unit tests for pure helpers when integration flows cannot reach certain branches.
- For UI elements hidden behind feature flags or props, add targeted component tests that flip the relevant state/prop.

### Debugging Tips

- Sprinkle `screen.debug()` or temporary `console.log` statements while iterating (remove before committing).
- Use `jest.spyOn` to verify helper invocations without re-implementing logic.
- Run `npm test -- <pattern> --runInBand --detectOpenHandles` when Node refuses to exit after tests finish.
