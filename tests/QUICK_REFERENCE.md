# Quick Reference: Unit Testing Patterns

> **Essential guide for writing unit tests in the Tiangong LCA Next project**

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [Shared Utilities](#shared-utilities)
3. [Common Patterns](#common-patterns)
4. [Complete Examples](#complete-examples)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Investigation Phase

```bash
# Find how the service is used in the codebase
grep -r "from '@/services/<service_name>" src/pages

# Find specific function usage
grep -r "functionName" src/
```

### Create Test File

```bash
mkdir -p tests/unit/services/<service_name>
touch tests/unit/services/<service_name>/api.test.ts
```

### Test File Template

```typescript
/**
 * Tests for <service_name> service API functions
 * Path: src/services/<service_name>/api.ts
 *
 * Coverage focuses on:
 * - <Feature 1> (used in <location>)
 * - <Feature 2> (used in <location>)
 */

import { func1, func2 } from '@/services/<service_name>/api';
import { createQueryBuilder, createMockSession } from '../../helpers/mockBuilders';
import { mockTeam, mockUser } from '../../helpers/testData';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('@/services/users/api', () => ({
  getUserId: jest.fn(),
}));

// Get mocks
const { supabase } = jest.requireMock('@/services/supabase');
const { getUserId } = jest.requireMock('@/services/users/api');

describe('<ServiceName> API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('func1', () => {
    it('should handle successful operation', async () => {
      // Arrange
      const mockData = [{ id: '123', name: 'Test' }];
      const builder = createQueryBuilder({ data: mockData, error: null });
      supabase.from.mockReturnValue(builder);

      // Act
      const result = await func1('123');

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('table_name');
      expect(builder.select).toHaveBeenCalled();
      expect(result.data).toEqual(mockData);
    });

    it('should handle errors', async () => {
      // Arrange
      const mockError = { message: 'Database error' };
      const builder = createQueryBuilder({ data: null, error: mockError });
      supabase.from.mockReturnValue(builder);

      // Act
      const result = await func1('123');

      // Assert
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });
});
```

---

## Shared Utilities

### Import Helpers

```typescript
// Mock builders for Supabase patterns
import {
  createQueryBuilder,
  createMockSession,
  createMockSuccessResponse,
  createMockErrorResponse,
} from '../../helpers/mockBuilders';

// Test data fixtures
import {
  mockTeam,
  mockSource,
  mockUser,
  createMockTeam,
  mockPaginationParams,
} from '../../helpers/testData';
```

### Query Builder (Most Important!)

**Use this instead of inline mock chains:**

```typescript
// ✅ CORRECT - Use shared helper
const builder = createQueryBuilder({ data: [...], error: null, count: 10 });
supabase.from.mockReturnValue(builder);

// Now this works automatically:
await supabase
  .from('table')
  .select('*')
  .eq('id', '123')
  .order('name')
  .range(0, 9);

// ❌ WRONG - Don't create inline
const builder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  // ... repetitive code
};
```

### Mock Response Helpers

```typescript
// Success response
const response = createMockSuccessResponse([{ id: '1' }], 10);
// Returns: { data: [{ id: '1' }], error: null, count: 10 }

// Error response
const response = createMockErrorResponse('Database error', 'PGRST000');
// Returns: { data: null, error: { message: 'Database error', code: 'PGRST000' } }
```

### Session Mocking

```typescript
// Mock authenticated session
const session = createMockSession('user-123', 'token-abc');
supabase.auth.getSession.mockResolvedValue(session);

// Mock no session
const noSession = createMockNoSession();
supabase.auth.getSession.mockResolvedValue(noSession);
```

### Test Data Fixtures

```typescript
// Use pre-defined fixtures
const team = mockTeam; // Has all required properties
const params = mockPaginationParams; // { current: 1, pageSize: 10 }

// Create customized fixtures
const customTeam = createMockTeam({ rank: 5, is_public: false });
const customSource = createMockSource({ version: '02.00.000' });
```

---

## Common Patterns

### Pattern 1: Simple Query

```typescript
it('should fetch data by id', async () => {
  // Arrange
  const mockData = [{ id: '123', name: 'Test' }];
  const builder = createQueryBuilder({ data: mockData, error: null });
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getDataById('123');

  // Assert
  expect(supabase.from).toHaveBeenCalledWith('table_name');
  expect(builder.select).toHaveBeenCalled();
  expect(builder.eq).toHaveBeenCalledWith('id', '123');
  expect(result.data).toEqual(mockData);
});
```

### Pattern 2: Paginated Query with Filters

```typescript
it('should fetch paginated and filtered data', async () => {
  // Arrange
  const mockData = [{ id: '1' }, { id: '2' }];
  const builder = createQueryBuilder({ data: mockData, error: null, count: 100 });
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getTableData(
    mockPaginationParams, // { current: 1, pageSize: 10 }
    { column: 'created_at', order: 'descend' },
  );

  // Assert
  expect(builder.select).toHaveBeenCalled();
  expect(builder.eq).toHaveBeenCalledWith('status', 'active');
  expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(builder.range).toHaveBeenCalledWith(0, 9);
  expect(result.data).toEqual(mockData);
  expect(result.count).toBe(100);
});
```

### Pattern 3: Edge Function Call

```typescript
it('should call edge function with auth', async () => {
  // Arrange
  const session = createMockSession('user-123', 'token-abc');
  supabase.auth.getSession.mockResolvedValue(session);

  const response = { data: { success: true }, error: null };
  supabase.functions.invoke.mockResolvedValue(response);

  // Act
  const result = await updateViaEdgeFunction('123', { name: 'Updated' });

  // Assert
  expect(supabase.auth.getSession).toHaveBeenCalled();
  expect(supabase.functions.invoke).toHaveBeenCalledWith('function_name', {
    headers: { Authorization: 'Bearer token-abc' },
    body: { id: '123', data: { name: 'Updated' } },
    region: FunctionRegion.UsEast1,
  });
  expect(result.data.success).toBe(true);
});
```

### Pattern 4: RPC Function Call

```typescript
it('should perform RPC search', async () => {
  // Arrange
  const searchResults = [{ id: '1', score: 0.95 }];
  supabase.rpc.mockResolvedValue({ data: searchResults, error: null });

  // Act
  const result = await performSearch('query text');

  // Assert
  expect(supabase.rpc).toHaveBeenCalledWith('search_function', {
    query_text: 'query text',
  });
  expect(result.data).toEqual(searchResults);
});
```

### Pattern 5: Error Handling

```typescript
it('should handle database errors gracefully', async () => {
  // Arrange
  const errorResponse = createMockErrorResponse('Connection failed', 'PGRST000');
  const builder = createQueryBuilder(errorResponse);
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await fetchData();

  // Assert
  expect(result.error).toBeDefined();
  expect(result.error.message).toBe('Connection failed');
  expect(result.data).toBeNull();
});
```

### Pattern 6: Session-Dependent Operations

```typescript
describe('authenticated operations', () => {
  beforeEach(() => {
    const session = createMockSession('user-123', 'token-abc');
    supabase.auth.getSession.mockResolvedValue(session);
  });

  it('should fetch user-specific data', async () => {
    // Test with session
  });
});

describe('unauthenticated operations', () => {
  beforeEach(() => {
    const noSession = createMockNoSession();
    supabase.auth.getSession.mockResolvedValue(noSession);
  });

  it('should return empty when not authenticated', async () => {
    // Test without session
  });
});
```

---

## Complete Examples

### Example 1: CRUD Service Test

```typescript
/**
 * Tests for teams service
 * Path: src/services/teams/api.ts
 */

import { getTeams, createTeam, updateTeam, deleteTeam } from '@/services/teams/api';
import { createQueryBuilder, createMockSession } from '../../helpers/mockBuilders';
import { mockTeam, createMockTeam } from '../../helpers/testData';

jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

const { supabase } = jest.requireMock('@/services/supabase');

describe('Teams Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTeams', () => {
    it('should fetch all teams', async () => {
      const mockData = [mockTeam];
      const builder = createQueryBuilder({ data: mockData, error: null, count: 1 });
      supabase.from.mockReturnValue(builder);

      const result = await getTeams();

      expect(supabase.from).toHaveBeenCalledWith('teams');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('createTeam', () => {
    it('should create new team', async () => {
      const newTeam = { name: 'New Team' };
      const created = createMockTeam({ id: 'new-id', ...newTeam });
      const builder = createQueryBuilder({ data: [created], error: null });
      supabase.from.mockReturnValue(builder);

      const result = await createTeam(newTeam);

      expect(builder.insert).toHaveBeenCalledWith(newTeam);
      expect(builder.select).toHaveBeenCalled();
      expect(result.data[0].id).toBe('new-id');
    });
  });

  describe('updateTeam', () => {
    it('should update via edge function', async () => {
      const session = createMockSession('user-123', 'token');
      supabase.auth.getSession.mockResolvedValue(session);
      supabase.functions.invoke.mockResolvedValue({ data: { success: true }, error: null });

      const result = await updateTeam('team-1', { name: 'Updated' });

      expect(supabase.functions.invoke).toHaveBeenCalled();
      expect(result.data.success).toBe(true);
    });
  });

  describe('deleteTeam', () => {
    it('should delete team', async () => {
      const builder = createQueryBuilder({ data: null, error: null });
      supabase.from.mockReturnValue(builder);

      await deleteTeam('team-1');

      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', 'team-1');
    });
  });
});
```

### Example 2: Search Service Test

```typescript
/**
 * Tests for search service
 * Path: src/services/search/api.ts
 */

import { performPgroongaSearch } from '@/services/search/api';
import { createQueryBuilder } from '../../helpers/mockBuilders';

jest.mock('@/services/supabase', () => ({
  supabase: { rpc: jest.fn() },
}));

const { supabase } = jest.requireMock('@/services/supabase');

describe('Search Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should perform full-text search', async () => {
    const searchResults = [
      { id: '1', title: 'Result 1', score: 0.95 },
      { id: '2', title: 'Result 2', score: 0.87 },
    ];
    supabase.rpc.mockResolvedValue({ data: searchResults, error: null });

    const result = await performPgroongaSearch('test query');

    expect(supabase.rpc).toHaveBeenCalledWith('pgroonga_search', {
      query_text: 'test query',
    });
    expect(result.data).toHaveLength(2);
    expect(result.data[0].score).toBeGreaterThan(0.9);
  });

  it('should handle search errors', async () => {
    supabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'Search failed' },
    });

    const result = await performPgroongaSearch('test');

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});
```

---

## Best Practices

### ✅ DO

```typescript
// ✅ Use shared utilities
import { createQueryBuilder } from '../../helpers/mockBuilders';

// ✅ Use test fixtures
import { mockTeam } from '../../helpers/testData';

// ✅ Clear mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});

// ✅ Use descriptive test names
it('should fetch active teams ordered by rank', async () => { ... });

// ✅ Test behavior, not implementation
expect(result.data).toHaveLength(5);

// ✅ Use appropriate matchers
expect(result).toEqual(expected); // Deep equality
expect(array).toContain(item);
expect(number).toBeGreaterThan(0);
```

### ❌ DON'T

```typescript
// ❌ Don't create inline query builders
const builder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
};

// ❌ Don't use inline mock data
const mockData = { id: '123', json: { ... }, ... };

// ❌ Don't test implementation details
expect(mockFrom).toHaveBeenCalledTimes(3);

// ❌ Don't use vague test names
it('should work', async () => { ... });

// ❌ Don't forget to await async calls
const result = fetchData(); // Missing await!

// ❌ Don't use type assertions unnecessarily
const mock = imported as jest.Mock;
```

---

## Troubleshooting

### Problem: "Cannot read property 'select' of undefined"

**Solution:** Ensure the query builder is properly mocked:

```typescript
const builder = createQueryBuilder({ data: [], error: null });
supabase.from.mockReturnValue(builder);
```

### Problem: "Expected mock function to have been called but it was not"

**Solution:** Check if the function is actually async and you're awaiting it:

```typescript
await functionName(); // Don't forget await!
```

### Problem: TypeScript errors with mock types

**Solution:** Use `jest.requireMock()` instead of type assertions:

```typescript
// ✅ Correct
const { supabase } = jest.requireMock('@/services/supabase');

// ❌ Wrong
const supabase = require('@/services/supabase').supabase as jest.Mocked<...>;
```

### Problem: Tests interfering with each other

**Solution:** Always clear mocks in `beforeEach`:

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### Problem: "Cannot find module '@/services/...'"

**Solution:** Check jest.config.cjs has the alias configured:

```javascript
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/src/$1',
}
```

---

## Running Tests

```bash
# Run all service tests
npm test -- tests/unit/services/

# Run specific test file
npm test -- tests/unit/services/teams/api.test.ts

# Run without coverage (faster)
npm test -- tests/unit/services/ --no-coverage

# Watch mode for development
npm test -- tests/unit/services/teams/ --watch

# Update snapshots
npm test -- -u

# Run with verbose output
npm test -- tests/unit/services/teams/ --verbose
```

---

## Resources

- **Shared Utilities:** `tests/helpers/mockBuilders.ts`, `tests/helpers/testData.ts`
- **Example Tests:** `tests/unit/services/sources/`, `tests/unit/services/teams/`
- **Project Guidelines:** `tests/README.md`
- **Jest Config:** `jest.config.cjs`
- **Test Prompts:** `tests/PROMPT.md`
