# Test Directory Structure

This directory contains all test files for the Tiangong LCA Next project.

## Directory Structure

````
tests/
├── unit/                    # Unit tests for individual functions/components
│   ├── services/           # Service layer tests
│   │   ├── general/        # General utility tests
│   │   └── ...
│   ├── components/         # Component tests
│   │   ├── AlignedNumber/
│   │   └── ...
│   └── utils/             # Utility function tests
├── integration/            # Integration tests
│   ├── api/               # API integration tests
│   └── pages/             # Page-level integration tests
├── e2e/                   # End-to-end tests (future)
├── mocks/                 # Mock data and utilities
│   ├── services/          # Mocked services
│   └── data/              # Test data fixtures
├── helpers/               # Test helper utilities
│   ├── mockSetup.ts       # Common mock setup
│   ├── testUtils.tsx      # React Testing Library utilities
│   └── factories.ts       # Test data factories
└── setupTests.jsx         # Global test setup

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run jest -- --watch

# Run tests with coverage
npm run test:coverage

# Update snapshots
npm run test:update

# Run specific test file
npm test -- path/to/test/file.test.ts
````

## Test Coverage Goals

- **Utility Functions**: 90%+
- **Components**: 80%+
- **Services**: 70%+
- **Integration**: 60%+

## Writing Tests

### Unit Tests

- Test pure functions independently
- Mock external dependencies
- Focus on edge cases and error handling

### Component Tests

- Test component rendering
- Test user interactions
- Test props and state changes
- Use React Testing Library best practices

### Integration Tests

- Test feature workflows
- Test API interactions with mocks
- Test data flow between components

## Best Practices

1. **Naming Convention**: `*.test.ts` or `*.test.tsx`
2. **Test Structure**: Arrange-Act-Assert pattern
3. **Descriptive Names**: Use clear, descriptive test names
4. **Isolation**: Each test should be independent
5. **Mock External Dependencies**: Use jest.mock() for external modules
6. **Coverage**: Aim for meaningful coverage, not just numbers

## Tools & Libraries

- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing
- **@testing-library/jest-dom**: Custom matchers
- **@testing-library/user-event**: User interaction simulation
