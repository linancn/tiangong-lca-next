# Test Directory Structure

This directory contains all test files for the Tiangong LCA Next project.

## 📚 Documentation

- **[PROMPT.md](./PROMPT.md)** - Prompts for AI assistants to generate tests
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Quick reference guide for writing unit tests
- **README.md** (this file) - Overview and guidelines

## 📁 Directory Structure

```
tests/
├── unit/                    # Unit tests for individual functions/components
│   ├── services/           # Service layer tests
│   │   ├── general/        # General utility tests
│   │   ├── contacts/       # Contact service tests
│   │   ├── teams/          # Team service tests
│   │   └── ...             # Other service tests
│   ├── components/         # Component tests
│   └── utils/             # Utility function tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   └── pages/             # Page-level integration tests
├── mocks/                 # Mock data and utilities
│   ├── services/          # Mocked services
│   └── data/              # Test data fixtures
├── helpers/               # Test helper utilities
│   ├── mockBuilders.ts    # Supabase mock builders
│   ├── testData.ts        # Shared test data fixtures
│   ├── mockSetup.ts       # Common mock setup
│   ├── testUtils.tsx      # React Testing Library utilities
│   └── factories.ts       # Test data factories
└── setupTests.jsx         # Global test setup
```

## 🚀 Quick Start

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test/file.test.ts

# Run tests without coverage (faster for development)
npm test -- tests/unit/services/ --no-coverage
```

### Writing Tests

1. **Check the guides:**
   - Read [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for patterns and examples
   - Use [PROMPT.md](./PROMPT.md) for AI-assisted test generation

2. **Use shared utilities:**

   ```typescript
   import { createQueryBuilder, createMockSession } from '../helpers/mockBuilders';
   import { mockTeam, mockUser } from '../helpers/testData';
   ```

3. **Follow the template:**

   ```typescript
   /**
    * Tests for [module] service
    * Path: src/services/[module]/api.ts
    *
    * Coverage:
    * - [Feature 1] (used in src/pages/...)
    * - [Feature 2] (used in src/pages/...)
    */

   describe('[Module] Service', () => {
     beforeEach(() => {
       jest.clearAllMocks();
     });

     // Tests...
   });
   ```

## 🎯 Test Coverage Goals

| Area       | Target | Current               |
| ---------- | ------ | --------------------- |
| Services   | 80%+   | [Run coverage report] |
| Components | 70%+   | [Run coverage report] |
| Utilities  | 90%+   | [Run coverage report] |

## 📖 Best Practices

### ✅ DO

- **Investigate real usage first** - Search the codebase to understand how the code is actually used
- **Use shared helpers** - Import from `tests/helpers/` instead of creating inline mocks
- **Test behavior, not implementation** - Focus on what the code does, not how it does it
- **Write descriptive test names** - "should fetch active teams ordered by rank"
- **Clear mocks** - Use `beforeEach(() => jest.clearAllMocks())`
- **Use fixtures** - Import test data from `tests/helpers/testData.ts`

### ❌ DON'T

- Don't create inline query builders (use `createQueryBuilder` from helpers)
- Don't use inline test data (use fixtures from `testData.ts`)
- Don't test implementation details (focus on observable behavior)
- Don't forget to await async calls
- Don't use generic test names like "should work"

## 🔧 Common Patterns

### Unit Tests

Test individual functions in isolation:

```typescript
import { createQueryBuilder } from '../../helpers/mockBuilders';
import { mockTeam } from '../../helpers/testData';

it('should fetch team by id', async () => {
  const builder = createQueryBuilder({ data: [mockTeam], error: null });
  supabase.from.mockReturnValue(builder);

  const result = await getTeamById('123');

  expect(result.data[0]).toEqual(mockTeam);
});
```

### Component Tests

Test React components using Testing Library:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

it('should display team name', () => {
  render(<TeamCard team={mockTeam} />);
  expect(screen.getByText('Test Team EN')).toBeInTheDocument();
});
```

### Integration Tests

Test complete workflows across multiple modules:

```typescript
it('should create and assign team member', async () => {
  // Create team
  // Create user
  // Assign role
  // Verify assignment
});
```

## 🛠️ Tools & Libraries

- **Jest** - Test runner and assertion library
- **React Testing Library** - Component testing
- **@testing-library/jest-dom** - Custom DOM matchers
- **@testing-library/user-event** - User interaction simulation

## 📝 File Naming Convention

- Unit tests: `*.test.ts` or `*.test.tsx`
- Test files mirror the source structure: `src/services/teams/api.ts` → `tests/unit/services/teams/api.test.ts`

## 🔍 Finding Examples

```bash
# Find test files for a specific service
ls tests/unit/services/*/api.test.ts

# Search for usage of a shared helper
grep -r "createQueryBuilder" tests/unit/

# Find tests using a specific fixture
grep -r "mockTeam" tests/unit/
```

## 📚 Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🐛 Troubleshooting

See the [Troubleshooting section in QUICK_REFERENCE.md](./QUICK_REFERENCE.md#troubleshooting) for common issues and solutions.

---

**Need help?** Check [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) for detailed patterns and examples!
