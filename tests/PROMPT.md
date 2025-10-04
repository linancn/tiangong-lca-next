# Test Writing Prompts

Use these prompts when asking AI assistants to help write tests for the Tiangong LCA Next project.

## Unit Test Prompt Template

````
Add unit tests for [MODULE_PATH] (e.g., src/services/contacts/api.ts)

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

```

## Integration Test Prompt Template

```

Add integration tests for [WORKFLOW] (e.g., review creation workflow)

Requirements:

1. **Follow Project Patterns**: Use existing test structure in tests/integration/
   - Test complete user workflows across multiple modules
   - Mock external APIs but test real component interactions

2. **Investigate Real User Flows**:
   - Trace user journey through src/pages/[feature]
   - Identify: What's the happy path? What can go wrong?
   - Include multi-step workflows (create → read → update → delete)

3. **Test Coverage**:
   - ✅ Complete workflows from start to finish
   - ✅ Cross-module data flow
   - ✅ State management during workflows
   - ✅ Error recovery scenarios
   - ✅ User permission validation

4. **Known Issues**: If you find workflow problems:
   - Add tests demonstrating the issue
   - Mark with: describe.skip() or it.skip() + TODO comment
   - Document expected vs actual behavior

5. **Code Quality**:
   - Run: npm test -- tests/integration/[workflow]
   - Run: npm run lint
   - All tests must pass

**Important**: Integration tests should test multiple modules working together!

```

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

````

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
````

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
