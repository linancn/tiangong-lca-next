# Test Writing Prompts

Use these prompts when asking AI assistants to help write tests for the Tiangong LCA Next project.

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
   - ✅ Successful operations (happy paths)
   - ✅ Error handling (e.g., database or validation errors)
   - ✅ Edge cases (null, undefined, empty arrays, boundary values)
   - ✅ Authentication and session handling
   - ✅ Pagination, filtering, and sorting where applicable

4. **Known Issues**
   - Add tests for any discovered bugs or design flaws.
   - Mark these tests with `it.skip()` or `describe.skip()` and include a `// TODO` comment explaining the issue.

5. **Coverage Check**
   - Aim to cover all meaningful logic and usage branches **as much as realistically possible**.
   - To view coverage for this specific module:
     ```bash
     npx jest --coverage [MODULE_PATH]
     ```
   - If the module is not yet imported by any tests:
     ```bash
     npx jest --coverage --collectCoverageFrom="[MODULE_PATH]"
     ```
   - To inspect uncovered lines or branches, open the generated HTML report:
     ```
     coverage/lcov-report/[MODULE_PATH].html
     ```

6. **Quality Gates**
   - Run tests:
     ```bash
     npm test -- tests/unit/services/[module] --no-coverage
     ```
   - (Optional) Run coverage check:
     ```bash
     npx jest --coverage [MODULE_PATH]
     ```
   - Run linter:
     ```bash
     npm run lint
     ```
   - All tests must pass.  
     **No strict coverage requirement**, but aim for practical completeness that reflects real-world usage.

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

4. **Testing Mechanics**
   - Prefer semantic queries (`screen.getByRole`, `screen.findByText`).
   - Wrap async expectations with `await waitFor(...)`.
   - Use helper functions for repeated setup logic.

5. **Known Issues**
   - For any discovered defects, write a skipped test:
     ```ts
     it.skip('should handle [bug scenario]', () => {
       // TODO: Fix expected behavior once bug is resolved
     });
     ```

6. **Quality Gates**
   - Run tests:
     ```bash
     npm test -- tests/integration/[feature]/[Workflow].integration.test.tsx --no-coverage
     ```
   - Run linter:
     ```bash
     npm run lint
     ```
   - (Optional) Coverage check for related modules:
     ```bash
     npx jest --coverage src/services/[relatedModule]/api.ts
     # If not imported:
     npx jest --coverage --collectCoverageFrom="src/services/[relatedModule]/api.ts"
     ```
   - **No strict coverage requirement** — aim to verify all meaningful paths and interactions.

> **Note:** Always Check `tests/QUICK_REFERENCE.md` for detailed patterns before starting.

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
   - ✅ Handles user interactions
   - ✅ Conditional rendering and state changes
   - ✅ Event handler callbacks
   - ✅ Loading and error states

3. **Quality Gates**
   - Run component tests:
     ```bash
     npm test -- tests/unit/components/[Component] --no-coverage
     ```
   - Run linter:
     ```bash
     npm run lint
     ```
   - (Optional) Coverage check:
     ```bash
     npx jest --coverage "src/components/[Component].tsx"
     # If not imported by other tests:
     npx jest --coverage --collectCoverageFrom="src/components/[Component].tsx"
     ```
   - All tests must pass.  
     **No strict coverage requirement** — aim for realistic completeness.

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
5. **Document intent** — comment on complex or business-critical test logic.
6. **Keep tests focused** — prefer one clear assertion per test.
7. **Use descriptive names** — make each test’s purpose immediately clear.

---

## Common Patterns Quick Reference

See `tests/QUICK_REFERENCE.md` for:

- ✅ Query builder mock patterns
- ✅ Edge function testing
- ✅ RPC function testing
- ✅ Session/auth mocking
- ✅ Error handling patterns
- ✅ Shared utility usage examples
