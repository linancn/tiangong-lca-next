# AI Testing Guide – Tiangong LCA Next

> Agents: only consult this English file during execution. `docs/agents/ai-testing-guide_CN.md` exists for human teammates and must be updated whenever you touch this doc.

## Environment & Tooling

- Node.js **>= 24** (run `nvm use 24` before `npm install`). Jest, Testing Library, and Playwright-style helpers are already wired up in `package.json`.
- Supabase credentials (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`) ship in the repo’s fallback `.env`, so local tests connect out of the box. Override those vars only when pointing at a different project and keep reading them via `src/services/supabase`.
- Never add npm dependencies just for tests; reuse the helpers under `tests/helpers/**` and the mocks in `tests/mocks/**`.

## Fast Workflow for AI Contributors

1. **Parse the ask** – capture entity, workflow, and test type (unit vs integration vs component).
2. **Locate code & mocks** – `ls src/pages/<Feature>/`, `rg "export.*function" src/services/<feature>/`, check `tests/integration/<feature>/` and `tests/unit/**` for prior art.
3. **Check existing coverage** – search `tests/**` for matching `describe` blocks; note what’s already mocked in `tests/helpers/testData.ts` and `mockSetup.ts`.
4. **Pick a pattern** – follow the templates in `docs/agents/testing-patterns.md` (unit, integration, component, shared utilities) and keep business logic inside mocks/helpers.
5. **Write the test** – mock services _before_ rendering, seed Supabase auth session when required, reuse `TestWrapper`, and keep assertions semantic (`getByRole`, `findByText`).
6. **Verify & report** – run the focused Jest command(s) + `npm run lint`, then summarize file paths, case counts, and command output in your final response.

## Guardrails & Anti-Loops

- ✅ Mock **every** network/service touch (`supabase`, `@/services/**`) inside `beforeEach` prior to calling `render`.
- ✅ Use `mockResolvedValue`/`mockRejectedValue` for deterministic promises; track call counts with `toHaveBeenCalledTimes`.
- ✅ Restore timers/mocks in `afterEach`, and prefer `await waitFor(...)` for async state updates.
- ❌ Never render components before mocks are in place.
- ❌ Never leave promises unresolved (`fireEvent.submit` without `await waitFor`).
- ❌ Do not create new mock objects inside `mockImplementation` on every call (causes infinite loops).

## Running Tests Reliably

```bash
# Integration workflow (serial execution, 20s timeout)
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# Unit/utility suites (faster timeout)
npm test -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# Single file with debug helpers
detect_open_handles="--detectOpenHandles"
npm test -- tests/integration/processes/ProcessesWorkflow.integration.test.tsx \
  --runInBand --testTimeout=20000 $detect_open_handles

# Watch mode while iterating (no timeout)
npm test -- tests/unit/services/processes/ --watch

# Lint gate (ESLint + Prettier check + tsc)
npm run lint
```

- Raise per-file timeouts inside tests with `jest.setTimeout(20000)` when a workflow legitimately needs longer.
- When Node refuses to exit, rerun with `--detectOpenHandles` or inspect lingering timers (`jest.useFakeTimers()` + `jest.runAllTimers()`).

## Deep References

- `docs/agents/testing-patterns.md` – exhaustive English reference (project overview, principles, test-type decision tree, unit/integration/component patterns, shared utilities). Mirror: `docs/agents/testing-patterns_CN.md`.
- `docs/agents/testing-troubleshooting.md` – detailed command matrix plus troubleshooting playbook (timeouts, auth mocks, RTL queries). Mirror: `docs/agents/testing-troubleshooting_CN.md`.

## Delivery Checklist

- Tests cover every new/changed behavior (unit for pure helpers, integration/component for workflows/UI).
- `npm run lint` passes with zero ESLint/Prettier/`tsc` errors.
- Relevant Jest suites run with `--runInBand --testTimeout=...` and succeed.
- Supabase/auth mocks reset between tests; no leaked handles when `npm test -- --detectOpenHandles` runs.
- Documentation (`docs/agents/**`) updated when expectations or workflows change.
