# Testing Patterns Reference – Tiangong LCA Next

> Use this file only when you are actively writing/refactoring tests. Read order: `AGENTS.md` -> `ai-testing-guide.md` -> this file. Mirror requirement: keep `docs/agents/testing-patterns_CN.md` synchronized.

## Purpose

This document provides compact, project-specific testing patterns:

- which test type to choose,
- how to structure mocks safely,
- how to use shared helpers,
- what quality gates must pass before delivery.

Before picking new coverage work, review `docs/agents/test_todo_list.md`; it is the actionable backlog source of truth.

## 1) Test Type Decision

Use **unit tests** when:

- testing service functions (`src/services/**`),
- testing pure utility logic,
- testing edge-function payload shaping.

Use **integration tests** when:

- validating user workflows across page + services,
- asserting role/permission-driven behavior,
- verifying table/drawer interactions.

Use **component tests** when:

- validating isolated component rendering,
- verifying props/callback contracts,
- checking conditional UI states.

## 2) Global Rules (Critical)

- Mock service/network dependencies before render.
- Prefer deterministic mocks: `mockResolvedValue` / `mockRejectedValue`.
- Clear mocks in `beforeEach`.
- Await async transitions (`await waitFor`, `findBy*`, awaited `userEvent`).
- Prefer semantic queries (`getByRole`, `getByLabelText`) over implementation selectors.
- Reuse helpers in `tests/helpers/**` and shared mocks in `tests/mocks/**`.
- If backlog status changed, update `docs/agents/test_todo_list.md` in the same diff; if strategic testing context changed, update `docs/agents/test_improvement_plan.md` too.

Do not:

- render before mock setup,
- rely on unstable object-creating `mockImplementation` chains,
- commit failing suites,
- add `skip/todo` tests without explicit TODO reason.

## 3) Project Test Layout

```text
tests/
  helpers/           # shared builders, wrappers, fixtures
  mocks/             # reusable module mocks
  unit/              # service/component/page unit tests
  integration/       # workflow-level tests
  setupTests.jsx     # global setup + polyfills + warning guards
```

Naming conventions:

- Unit/component: `*.test.ts` / `*.test.tsx`
- Integration: `*Workflow.integration.test.tsx`

## 4) Reusable Helpers

### `tests/helpers/mockBuilders.ts`

Use `createQueryBuilder(...)` for chainable Supabase mocks.

```ts
import { createQueryBuilder } from '@/tests/helpers/mockBuilders';

const builder = createQueryBuilder({ data: [{ id: '1' }], error: null, count: 1 });
supabase.from.mockReturnValue(builder);
```

Also available:

- `createMockSession`, `createMockNoSession`
- `createMockSuccessResponse`, `createMockErrorResponse`
- edge/RPC response builders

### `tests/helpers/testData.ts`

Use shared fixtures (`mockTeam`, `mockSource`, `mockPaginationParams`, etc.) instead of ad-hoc inline objects.

### `tests/helpers/testUtils.tsx`

Use `renderWithProviders` when provider context is required.

```ts
import { renderWithProviders, screen } from '@/tests/helpers/testUtils';

renderWithProviders(<MyPage />);
```

## 5) Unit Test Template

```ts
import { myServiceFn } from '@/services/myFeature/api';
import { createQueryBuilder } from '@/tests/helpers/mockBuilders';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}));

const { supabase } = jest.requireMock('@/services/supabase');

describe('myServiceFn', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns data on success', async () => {
    const builder = createQueryBuilder({ data: [{ id: '1' }], error: null });
    supabase.from.mockReturnValue(builder);

    const result = await myServiceFn();

    expect(supabase.from).toHaveBeenCalled();
    expect(result.error).toBeNull();
  });

  it('returns error on failure', async () => {
    const builder = createQueryBuilder({ data: null, error: { message: 'db fail' } });
    supabase.from.mockReturnValue(builder);

    const result = await myServiceFn();

    expect(result.error).toBeDefined();
  });
});
```

## 6) Integration Test Template

```ts
import Page from '@/pages/MyFeature';
import { renderWithProviders, screen, waitFor } from '@/tests/helpers/testUtils';
import userEvent from '@testing-library/user-event';

jest.mock('@/services/myFeature/api', () => ({
  listData: jest.fn(),
  createData: jest.fn(),
}));

const { listData, createData } = jest.requireMock('@/services/myFeature/api');

describe('MyFeature workflow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    listData.mockResolvedValue({ data: [], error: null });
    createData.mockResolvedValue({ data: { id: '1' }, error: null });
  });

  it('creates a record and refreshes list', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Page />);

    await waitFor(() => expect(listData).toHaveBeenCalledTimes(1));

    await user.click(screen.getByRole('button', { name: /create/i }));
    await user.click(screen.getByRole('button', { name: /submit/i }));

    await waitFor(() => expect(createData).toHaveBeenCalledTimes(1));
  });
});
```

## 6A) Repo Integration Matrix Pattern

- For large rollouts, prefer matrix-driven suites over copy-pasted one-file-per-variant suites.
- Keep one anchor workflow file per feature and vary only the axis that changes behavior:
  - `pathname`: `/mydata`, `/tgdata`, `/codata`, `/tedata`
  - `role`: owner/admin/member/restricted
  - `search`: empty, valid deep link, invalid or stale query
- Assert the stable contract in every row, then add only the row-specific assertion that actually differs.

```ts
import ProcessesPage from '@/pages/Processes';
import { renderWithProviders, screen, waitFor } from '@/tests/helpers/testUtils';

const setLocation = (pathname: string, search = '') => {
  const umi = require('@/tests/mocks/umi');
  umi.setUmiLocation({ pathname, search });
};

const routeCases = [
  { label: 'mydata', pathname: '/mydata/processes' },
  { label: 'tgdata', pathname: '/tgdata/processes' },
];

describe.each(routeCases)('$label processes workflow', ({ pathname }) => {
  beforeEach(() => {
    jest.clearAllMocks();
    setLocation(pathname, '');
    getProcessTableAll.mockResolvedValue({ data: [], success: true, total: 0 });
  });

  it('loads the shared table contract', async () => {
    renderWithProviders(<ProcessesPage />);

    await waitFor(() => expect(getProcessTableAll).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('contribute')).toBeInTheDocument();
  });
});
```

## 6B) Permission and URL-State Pattern

- For `Teams`, `ManageSystem`, and `Review`, use a role matrix and assert both:
  - what the user can see and click,
  - which `@/services/**` calls are allowed or prevented.
- For deep links and query-driven flows, keep the matrix small:
  - empty query,
  - valid query that auto-opens the intended state,
  - invalid or stale query that falls back safely.
- Prefer one suite with `describe.each(...)` over separate near-duplicate files.

## 6C) E2E Escalation Rule

- Keep E2E thin. Integration tests are the default expansion layer for this repo.
- Promote a workflow to E2E only when the risk is truly browser-real:
  - redirect chains and full-page navigation,
  - file upload/preview behavior,
  - `window.location` mutations,
  - reload-driven state resets.
- Do not use E2E to chase branch coverage that is already cheaper and more stable at the integration layer.

## 7) Component Test Template

```ts
import { renderWithProviders, screen } from '@/tests/helpers/testUtils';
import userEvent from '@testing-library/user-event';
import MyComponent from '@/components/MyComponent';

describe('MyComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls callback on submit', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();

    renderWithProviders(<MyComponent onSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
  });
});
```

## 8) Command Patterns (Accurate)

```bash
# Full gate (unit + integration)
npm test

# Focused unit/component run
npm run test:ci -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# Focused integration run
npm run test:ci -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# Open-handle debug
npm run test:ci -- tests/integration/<feature>/<file>.test.tsx \
  --runInBand --testTimeout=20000 --detectOpenHandles

# Lint gate
npm run lint
```

## 9) Skip/TODO Policy

If a test reveals a confirmed business bug:

1. Add `it.skip(...)` only temporarily.
2. Add a clear `TODO` comment with:
   - expected behavior,
   - actual behavior,
   - affected module.
3. Keep the scope explicit and minimal.

No silent skipped tests.

## 10) Coverage Policy

- Directional target: high branch/line/function coverage, trending toward near-100% meaningful coverage.
- Enforced threshold: global coverage gates defined in `jest.config.cjs`.
- Use coverage commands to identify real gaps, then add focused tests.
- Treat integration depth separately from code coverage. For large integration programs, use the 100-point completion scorecard in `docs/agents/ai-testing-guide.md` instead of trying to make `tests/integration` alone hit `100%` code coverage.

## 11) Pre-Delivery Checklist

- Relevant tests updated.
- `npm run lint` passed.
- Focused Jest suite(s) passed.
- Async leaks investigated when needed (`--detectOpenHandles`).
- English + `_CN` docs synchronized if testing workflow changed.
