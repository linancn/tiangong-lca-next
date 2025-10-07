# Test Writing Prompts

Use these prompts when asking AI assistants to help write tests for the Tiangong LCA Next project.

## 🎯 Core Testing Principles

**When tests fail:**

1. **Diagnose first** — determine if the issue is in:
   - ❌ Business code (bug/design flaw)
   - ❌ Test code (incorrect expectations/mocks)
2. **If business code has issues:**
   - Mark with `it.skip()` or `describe.skip()`
   - Add `// TODO: [Issue description]` comment
   - Document the expected vs actual behavior
3. **If test code has issues:**
   - Fix the test immediately
   - Ensure mocks and expectations match real usage

**Coverage goal:**

- **Aim to verify ALL meaningful paths and interactions**
- Cover happy paths, error cases, edge cases, and state transitions
- Test real-world usage patterns found in the codebase

---

### Unit Test Prompt Template

Add or update unit tests for **[MODULE_PATH]** (e.g., `src/services/contacts/api.ts`).

#### Requirements

1. **Follow Project Patterns**
   - Use the existing test structure under `tests/unit/services/`.
   - Refer to `tests/QUICK_REFERENCE.md` for mock patterns and examples.
   - Use shared utilities from `tests/helpers/` (e.g., `mockBuilders`, `testData`).

2. **Investigate Real Usage First**
   - Search the codebase to find real usage:
     ```bash
     grep -r "from '@/services/[module]'" src/pages
     ```
   - Identify which functions are called, what parameters are used, and how errors are handled.
   - Focus on real-world scenarios reflected in actual business logic.

3. **Test Coverage**
   - ✅ Happy paths (successful operations)
   - ✅ Error handling (database errors, validation failures)
   - ✅ Edge cases (null, undefined, empty arrays, boundary values)
   - ✅ Authentication and session handling
   - ✅ Pagination, filtering, and sorting where applicable
   - **Goal:** Cover ALL meaningful code paths and branches

4. **Quality Gates**
   - Write tests and run:
     ```bash
     npm test -- tests/unit/services/[module] --no-coverage
     ```
   - **If tests fail:** Diagnose whether it's a business code issue or test issue (see Core Principles above)
   - Run linter:
     ```bash
     npm run lint
     ```
   - Check coverage (optional but recommended):
     ```bash
     npx jest --coverage --collectCoverageFrom="[MODULE_PATH]"
     ```
   - View detailed coverage report at `coverage/lcov-report/[MODULE_PATH].html`
   - All tests must pass before completion

#### Example File Header

```ts
/**
 * Unit tests for [module] service
 * Path: src/services/[module]/api.ts
 *
 * Coverage focus:
 * - [Feature 1] (used in src/pages/…)
 * - [Feature 2] (used in src/pages/…)
 */

import { func1, func2 } from '@/services/[module]/api';
import { createQueryBuilder, createMockSession } from '../../helpers/mockBuilders';
import { mockTeam, mockUser } from '../../helpers/testData';

describe('[Module] Service', () => {
  beforeEach(() => jest.clearAllMocks());

  // Tests...
});
```

> **Note:** Always check `tests/QUICK_REFERENCE.md` for detailed patterns before starting.

---

### Integration Test Prompt Template

Add or update integration tests for **[WORKFLOW]** (e.g., _review reassignment workflow_).

#### Context

- Target real user journeys in `src/pages/[feature]` and related nested components.
- Reuse helpers from `tests/helpers/testUtils` and fixtures from `tests/helpers/testData`.

#### Requirements

1. **Investigate the Workflow First**
   - Trace UI flows (tabs, drawers, modals, etc.).
   - Map service usage with:
     ```bash
     grep -r "[serviceFn]" src/pages
     ```
   - Document the main user paths under test at the top of the spec.

2. **Follow Integration Test Structure**
   - Place files in `tests/integration/[feature]/[Workflow].integration.test.tsx`.
   - Import React Testing Library utilities from `tests/helpers/testUtils`.
   - Stub APIs and network calls using `jest.mock`, following existing project patterns.

3. **Workflow Coverage**
   - ✅ Happy path (expected user flow)
   - ✅ Cross-module interactions and API call validation
   - ✅ Role/permission branches, locale toggles, pagination, and drawer behaviors
   - ✅ Error recovery (mock rejections, error messages)
   - ✅ State transitions (tabs, modals, step flows)
   - **Goal:** Verify ALL meaningful user paths and interactions

4. **Testing Mechanics**
   - Prefer semantic queries (`screen.getByRole`, `screen.findByText`).
   - Wrap async expectations with `await waitFor(...)`.
   - Use helper functions for repeated setup logic.

5. **Quality Gates**
   - Write tests and run:
     ```bash
     npm test -- tests/integration/[feature]/[Workflow].integration.test.tsx --no-coverage
     ```
   - **If tests fail:** Diagnose whether it's a business code issue or test issue (see Core Principles above)
   - Run linter:
     ```bash
     npm run lint
     ```
   - All tests must pass before completion

> **Note:** Always check `tests/QUICK_REFERENCE.md` for detailed patterns before starting.

---

### Component Test Prompt Template

Add or update component tests for **[COMPONENT]** (e.g., `src/components/ContactView`).

#### Requirements

1. **Follow React Testing Library Best Practices**
   - Test user-visible behavior and interactions, not implementation details.
   - Use semantic queries (`getByRole`, `getByLabelText`, etc.).
   - Include accessibility checks where relevant.

2. **Test Scenarios**
   - ✅ Renders correctly with given props
   - ✅ Handles user interactions (clicks, input changes)
   - ✅ Conditional rendering and state changes
   - ✅ Event handler callbacks
   - ✅ Loading and error states
   - **Goal:** Cover ALL user-visible behaviors and state combinations

3. **Quality Gates**
   - Write tests and run:
     ```bash
     npm test -- tests/unit/components/[Component] --no-coverage
     ```
   - **If tests fail:** Diagnose whether it's a business code issue or test issue (see Core Principles above)
   - Run linter:
     ```bash
     npm run lint
     ```
   - Check coverage (optional but recommended):
     ```bash
     npx jest --coverage --collectCoverageFrom="src/components/[Component].tsx"
     ```
   - All tests must pass before completion

> **Note:** Always check `tests/QUICK_REFERENCE.md` for detailed patterns before starting.

---

## Quick Commands Reference

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/unit/services/contacts/api.test.ts

# Run tests without coverage (faster)
npm test -- tests/unit/services/ --no-coverage

# Run tests in watch mode
npm test -- --watch

# Run linting
npm run lint

# Search for real usage
grep -r "from '@/services/contacts'" src/pages
grep -r "createContact\|updateContact" src/

# Find test examples
ls tests/unit/services/*/api.test.ts
```

---

## Tips for AI Assistants

1. **Start with investigation** — always locate real usage patterns first.
2. **Use shared helpers** — do not create inline mock builders.
3. **Follow existing patterns** — review similar test files in the same directory.
4. **Test behavior, not implementation.**
5. **When tests fail** — diagnose root cause (business vs test code) before proceeding.
6. **Coverage goal** — aim for ALL meaningful paths, not just "enough" coverage.
7. **Keep tests focused** — prefer one clear assertion per test.
8. **Use descriptive names** — make each test's purpose immediately clear.

---

## Common Patterns Quick Reference

See `tests/QUICK_REFERENCE.md` for:

- ✅ Query builder mock patterns
- ✅ Edge function testing
- ✅ RPC function testing
- ✅ Session/auth mocking
- ✅ Error handling patterns
- ✅ Shared utility usage examples
