# Test Writing Prompts

Use these prompts when asking AI assistants to help write tests for the Tiangong LCA Next project.

## Unit Test Prompt Template

````
Add or update unit tests for [MODULE_PATH] (e.g., src/services/contacts/api.ts)

Requirements:
1. **Follow Project Patterns**: Use existing test structure in tests/unit/services/
   - See tests/QUICK_REFERENCE.md for mock patterns and examples
   - Use shared utilities from tests/helpers/ (mockBuilders, testData)

2. **Investigate Real Usage First**:
   - Search codebase: grep -r "from '@/services/[module]'" src/pages
   - Identify: Which functions are called? What parameters? Error handling?
   - Focus tests on actual usage patterns found in business code

3. **Test Coverage**:
   - ✅ Happy path scenarios (successful operations)
   - ✅ Error handling (database errors, validation failures)
   - ✅ Edge cases (null/undefined, empty arrays, boundary values)
   - ✅ Authentication/session requirements
   - ✅ Pagination, filtering, sorting where applicable

4. **Known Issues**: If you find bugs or design flaws:
   - Add tests for these cases
   - Mark with: describe.skip() or it.skip() + TODO comment
   - Document the issue for future fixes

5. **Code Quality**:
   - Run: npm test -- tests/unit/services/[module] --no-coverage
   - Run: npm run lint
   - All tests must pass

6. **File Structure**:
   ```typescript
   /**
    * Tests for [module] service
    * Path: src/services/[module]/api.ts
    *
    * Coverage:
    * - [Feature 1] (used in src/pages/...)
    * - [Feature 2] (used in src/pages/...)
    */

   import { func1, func2 } from '@/services/[module]/api';
   import { createQueryBuilder, createMockSession } from '../../helpers/mockBuilders';
   import { mockTeam, mockUser } from '../../helpers/testData';

   // Mock setup...

   describe('[Module] Service', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     // Tests...
   });
````

**Important**: Check tests/QUICK_REFERENCE.md for detailed patterns before starting!

## Integration Test Prompt Template

````
Add or update integration tests for [WORKFLOW] (e.g., review reassignment workflow)

Context:

- Target the real user journey in `src/pages/[feature]` and any nested components under test.
- Reuse helpers from `tests/helpers/testUtils` (e.g., `renderWithProviders`, `fireEvent`, `waitFor`) and fixtures from `tests/helpers/testData`.

Requirements:

1. **Investigate the workflow first**
   - Trace UI flows in `src/pages/[feature]` (tabs, drawers, modals, etc.).
   - Map service usage with `grep -r "[serviceFn]" src/pages` and note API params.
   - Document the paths under test at the top of the spec (see review workflow example).

2. **Follow integration test structure**
   - Place files at `tests/integration/[feature]/[Workflow].integration.test.tsx`.
   - Import React Testing Library utilities from `tests/helpers/testUtils` for consistent providers/locales.
   - Stub external APIs/network calls with `jest.mock` blocks near the top (mirror `tests/integration/reviews/ReviewWorkflow.integration.test.tsx`).

3. **Workflow coverage**
   - ✅ Happy path: render with `renderWithProviders`, simulate user interactions, and assert UI state.
   - ✅ Cross-module calls: assert mocked services (`jest.mocked(fn)`) receive correct params/order.
   - ✅ Role/permission branches, locale toggles, and pagination/drawer flows via `actionRef` where applicable.
   - ✅ Error recovery: force mock rejections/edge responses and assert messages/toasts/layout changes.
   - ✅ State transitions: tabs, modal open/close, selection, multi-step sequences (create → review → update → delete).

4. **Testing mechanics**
   - Prefer semantic queries (`screen.getByRole`, `screen.findByText`); fall back to `getByTestId` only when required.
   - Wrap async expectations in `await waitFor(...)` rather than timeouts.
   - Extract helper functions for repeated render/setup logic to keep tests readable.

5. **Known issues & documentation**
   - If you uncover a real bug, write a skipped test (`it.skip`) with a `// TODO` explaining the defect and expected fix.
   - Note any unexpected API shape or translation gaps directly in the test comments.

6. **Quality gates**
   - Run: `npm test -- tests/integration/[feature]/[Workflow].integration.test.tsx --no-coverage`
   - Run: `npm run lint`
   - Ensure tests remain deterministic (no real network/file I/O, mock timers when needed).

Example skeleton:

```tsx
/**
 * Integration tests for review reassignment workflow
 * Paths under test:
 * - src/pages/Review/index.tsx
 * - src/pages/Review/Components/AssignmentReview.tsx
 */

import React from 'react';
import { renderWithProviders, screen, fireEvent, waitFor } from '../../helpers/testUtils';
import Review from '@/pages/Review';
import { getReviewsTableData } from '@/services/reviews/api';

jest.mock('@/services/reviews/api', () => ({ getReviewsTableData: jest.fn() }));
const mockGetReviewsTableData = jest.mocked(getReviewsTableData);

describe('Review workflow integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetReviewsTableData.mockResolvedValue({ data: [], success: true });
  });

  it('loads pending queue by default and supports tab switching', async () => {
    renderWithProviders(<Review />);

    await waitFor(() => expect(mockGetReviewsTableData).toHaveBeenCalled());

    fireEvent.click(screen.getByTestId('tab-assigned'));

    await waitFor(() =>
      expect(
        mockGetReviewsTableData.mock.calls.some(([, , queueType]) => queueType === 'assigned'),
      ).toBe(true),
    );
  });
});
```

````

## Component Test Prompt Template

```

Add component tests for [COMPONENT] (e.g., src/components/ContactView)

Requirements:

1. **Follow React Testing Library Patterns**:
   - Test user interactions, not implementation
   - Use semantic queries (getByRole, getByLabelText)
   - Test accessibility

2. **Test Coverage**:
   - ✅ Component renders correctly with props
   - ✅ User interactions (clicks, form input, etc.)
   - ✅ Conditional rendering based on state/props
   - ✅ Event handler callbacks
   - ✅ Error states and loading states

3. **Code Quality**:
   - Run: npm test -- tests/unit/components/[Component]
   - Run: npm run lint
   - All tests must pass

**Important**: Use @testing-library/react, not enzyme patterns!

```

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

## Tips for AI Assistants

1. **Always start with investigation**: Use grep to find real usage patterns
2. **Use shared helpers**: Don't create inline mock builders
3. **Follow existing patterns**: Look at similar test files in the same directory
4. **Test behavior, not implementation**: Focus on what users see/experience
5. **Document why**: Add comments explaining complex test scenarios
6. **Keep tests focused**: One assertion per test when possible
7. **Use descriptive names**: Test names should explain what's being tested

## Common Patterns Quick Reference

See `tests/QUICK_REFERENCE.md` for:

- ✅ Query builder mock patterns
- ✅ Edge function testing
- ✅ RPC function testing
- ✅ Session/auth mocking
- ✅ Error handling patterns
- ✅ Shared utility usage examples
