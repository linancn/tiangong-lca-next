# Using Shared Test Utilities - Examples

This document provides practical examples of using the shared test utilities created for the Tiangong LCA Next project.

## Table of Contents

- [Mock Builders](#mock-builders)
- [Test Data Fixtures](#test-data-fixtures)
- [Complete Test Example](#complete-test-example)
- [Migration Guide](#migration-guide)

## Mock Builders

### Import the Utilities

```typescript
import {
  createQueryBuilder,
  createMockSession,
  createMockSuccessResponse,
  createMockErrorResponse,
} from '../../../helpers/mockBuilders';
```

### Example 1: Simple Query Test

```typescript
it('should fetch data by id', async () => {
  // Arrange
  const mockData = { id: '123', name: 'Test' };
  const response = createMockSuccessResponse([mockData], 1);
  const builder = createQueryBuilder(response);

  supabase.from.mockReturnValue(builder);

  // Act
  const result = await fetchDataById('123');

  // Assert
  expect(supabase.from).toHaveBeenCalledWith('table_name');
  expect(builder.select).toHaveBeenCalled();
  expect(builder.eq).toHaveBeenCalledWith('id', '123');
  expect(result).toEqual(response);
});
```

### Example 2: Chained Query Test

```typescript
it('should fetch paginated and filtered data', async () => {
  // Arrange
  const mockData = [{ id: '1' }, { id: '2' }];
  const response = createMockSuccessResponse(mockData, 100);
  const builder = createQueryBuilder(response);

  supabase.from.mockReturnValue(builder);

  // Act
  const result = await supabase
    .from('table')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .range(0, 9);

  // Assert
  expect(builder.select).toHaveBeenCalledWith('*');
  expect(builder.eq).toHaveBeenCalledWith('status', 'active');
  expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(builder.range).toHaveBeenCalledWith(0, 9);
  expect(result).toEqual(response);
});
```

### Example 3: Error Handling Test

```typescript
it('should handle database errors', async () => {
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

### Example 4: Session Mocking

```typescript
describe('authenticated operations', () => {
  beforeEach(() => {
    const session = createMockSession('user-123', 'token-abc');
    supabase.auth.getSession.mockResolvedValue(session);
  });

  it('should include auth token in request', async () => {
    // Test implementation
  });
});

describe('unauthenticated operations', () => {
  beforeEach(() => {
    const noSession = createMockNoSession();
    supabase.auth.getSession.mockResolvedValue(noSession);
  });

  it('should return error when not authenticated', async () => {
    // Test implementation
  });
});
```

### Example 5: Edge Function Test

```typescript
it('should call edge function with correct parameters', async () => {
  // Arrange
  const session = createMockSession('user-123', 'token-abc');
  const response = createMockEdgeFunctionResponse({ success: true, id: '123' });

  supabase.auth.getSession.mockResolvedValue(session);
  supabase.functions.invoke.mockResolvedValue(response);

  // Act
  const result = await updateViaEdgeFunction('123', { name: 'Updated' });

  // Assert
  expect(supabase.functions.invoke).toHaveBeenCalledWith('update_data', {
    headers: {
      Authorization: 'Bearer token-abc',
    },
    body: { id: '123', data: { name: 'Updated' } },
    region: FunctionRegion.UsEast1,
  });
  expect(result.success).toBe(true);
});
```

### Example 6: RPC Function Test

```typescript
it('should perform RPC search', async () => {
  // Arrange
  const searchResults = [
    { id: '1', score: 0.95 },
    { id: '2', score: 0.87 },
  ];
  const response = createMockRpcResponse(searchResults);

  supabase.rpc.mockResolvedValue(response);

  // Act
  const result = await performSearch('query text');

  // Assert
  expect(supabase.rpc).toHaveBeenCalledWith('search_function', {
    query_text: 'query text',
  });
  expect(result.data).toHaveLength(2);
});
```

## Test Data Fixtures

### Import Fixtures

```typescript
import {
  mockTeam,
  mockSource,
  mockUser,
  createMockTeam,
  createMockSource,
  mockPaginationParams,
} from '../../../helpers/testData';
```

### Example 1: Using Pre-defined Fixtures

```typescript
it('should process team data correctly', async () => {
  // Arrange
  const response = createMockSuccessResponse([mockTeam], 1);
  const builder = createQueryBuilder(response);

  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getTeams();

  // Assert
  expect(result.data[0].id).toBe(mockTeam.id);
  expect(result.data[0].rank).toBe(mockTeam.rank);
});
```

### Example 2: Creating Custom Fixtures

```typescript
it('should handle private teams', async () => {
  // Arrange
  const privateTeam = createMockTeam({
    id: 'private-team-1',
    is_public: false,
    rank: 0,
  });

  const response = createMockSuccessResponse([privateTeam], 1);
  const builder = createQueryBuilder(response);

  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getPrivateTeams();

  // Assert
  expect(result.data[0].is_public).toBe(false);
});
```

### Example 3: Using Pagination Params

```typescript
it('should handle pagination correctly', async () => {
  // Arrange
  const mockData = [mockSource];
  const response = createMockSuccessResponse(mockData, 100);
  const builder = createQueryBuilder(response);

  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getSourcesTable(
    mockPaginationParams, // { current: 1, pageSize: 10 }
    mockSortOrder,
  );

  // Assert
  expect(builder.range).toHaveBeenCalledWith(0, 9);
  expect(result.data).toHaveLength(1);
});
```

### Example 4: Combining Multiple Fixtures

```typescript
it('should link user to team correctly', async () => {
  // Arrange
  const team = createMockTeam({ id: 'team-1' });
  const user = createMockUser({ id: 'user-1' });
  const role = createMockRole({
    user_id: user.id,
    team_id: team.id,
    role: 'admin',
  });

  // Setup mocks with fixtures
  getTeamById.mockResolvedValue({ data: [team] });
  getUserById.mockResolvedValue({ data: user });
  getRoleByUserId.mockResolvedValue({ data: [role] });

  // Act
  const result = await getUserTeamRole(user.id, team.id);

  // Assert
  expect(result.role).toBe('admin');
});
```

## Complete Test Example

Here's a complete test file using both mock builders and fixtures:

```typescript
/**
 * Tests for example service API functions
 * Path: src/services/example/api.ts
 */

import { createData, getData, updateData, deleteData } from '@/services/example/api';
import { FunctionRegion } from '@supabase/supabase-js';
import {
  createQueryBuilder,
  createMockSession,
  createMockSuccessResponse,
  createMockErrorResponse,
  createMockEdgeFunctionResponse,
} from '../../../helpers/mockBuilders';
import { mockTeam, createMockTeam, mockPaginationParams } from '../../../helpers/testData';

// Mock dependencies
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
  },
}));

const { supabase } = jest.requireMock('@/services/supabase');

describe('Example API Service', () => {
  const mockSession = createMockSession('user-123', 'test-token');

  beforeEach(() => {
    jest.clearAllMocks();
    supabase.auth.getSession.mockResolvedValue(mockSession);
  });

  describe('createData', () => {
    it('should create data successfully', async () => {
      // Arrange
      const newData = { name: 'Test Item' };
      const response = createMockSuccessResponse([{ id: '123', ...newData }]);
      const builder = createQueryBuilder(response);

      supabase.from.mockReturnValue(builder);

      // Act
      const result = await createData(newData);

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('table_name');
      expect(builder.insert).toHaveBeenCalled();
      expect(builder.select).toHaveBeenCalled();
      expect(result.data[0].name).toBe('Test Item');
    });

    it('should handle creation errors', async () => {
      // Arrange
      const errorResponse = createMockErrorResponse('Insert failed');
      const builder = createQueryBuilder(errorResponse);

      supabase.from.mockReturnValue(builder);

      // Act
      const result = await createData({ name: 'Test' });

      // Assert
      expect(result.error).toBeDefined();
      expect(result.data).toBeNull();
    });
  });

  describe('getData', () => {
    it('should fetch data with filters', async () => {
      // Arrange
      const team = createMockTeam({ id: 'team-1' });
      const mockData = [{ id: '1', team_id: team.id }];
      const response = createMockSuccessResponse(mockData, 1);
      const builder = createQueryBuilder(response);

      supabase.from.mockReturnValue(builder);

      // Act
      const result = await getData(mockPaginationParams, team.id);

      // Assert
      expect(builder.select).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('team_id', team.id);
      expect(builder.range).toHaveBeenCalledWith(0, 9);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('updateData', () => {
    it('should update via edge function', async () => {
      // Arrange
      const updatePayload = { name: 'Updated Name' };
      const response = createMockEdgeFunctionResponse({ success: true });

      supabase.functions.invoke.mockResolvedValue(response);

      // Act
      const result = await updateData('123', updatePayload);

      // Assert
      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(supabase.functions.invoke).toHaveBeenCalledWith('update_data', {
        headers: {
          Authorization: 'Bearer test-token',
        },
        body: { id: '123', data: updatePayload },
        region: FunctionRegion.UsEast1,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('deleteData', () => {
    it('should delete data successfully', async () => {
      // Arrange
      const response = createMockSuccessResponse(null);
      const builder = createQueryBuilder(response);

      supabase.from.mockReturnValue(builder);

      // Act
      const result = await deleteData('123');

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('table_name');
      expect(builder.delete).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', '123');
      expect(result.error).toBeNull();
    });
  });
});
```

## Migration Guide

### Migrating Existing Tests

**Before (with inline createQueryBuilder):**

```typescript
describe('My API', () => {
  // Inline helper (duplicated across files)
  const createQueryBuilder = <T>(resolvedValue: T) => {
    const builder: any = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      // ... more methods
      then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
    };
    return builder;
  };

  it('should fetch data', async () => {
    const mockData = { id: '123', name: 'Test' };
    const builder = createQueryBuilder({ data: [mockData], error: null });
    // ... rest of test
  });
});
```

**After (using shared utilities):**

```typescript
import { createQueryBuilder, createMockSuccessResponse } from '../../../helpers/mockBuilders';

describe('My API', () => {
  it('should fetch data', async () => {
    const mockData = { id: '123', name: 'Test' };
    const response = createMockSuccessResponse([mockData], 1);
    const builder = createQueryBuilder(response);
    // ... rest of test
  });
});
```

### Migration Checklist

- [ ] Import shared utilities instead of defining inline
- [ ] Replace inline mock data with fixtures where applicable
- [ ] Use `createMockSuccessResponse` and `createMockErrorResponse`
- [ ] Use `createMockSession` for auth tests
- [ ] Replace hardcoded pagination params with `mockPaginationParams`
- [ ] Use fixture factory functions for custom data
- [ ] Remove duplicate helper functions
- [ ] Run tests to ensure they still pass
- [ ] Run lint to ensure code quality

## Best Practices

### 1. Use Fixtures for Repeated Data

```typescript
// ✅ GOOD - Use fixture
const team = mockTeam;

// ❌ BAD - Inline data
const team = { id: 'team-123', json: { title: [...] }, rank: 1 };
```

### 2. Customize Fixtures When Needed

```typescript
// ✅ GOOD - Customize specific properties
const inactiveUser = createMockUser({ status: 'inactive' });

// ❌ BAD - Create entirely new object
const inactiveUser = { id: 'user-1', email: 'test@test.com', status: 'inactive', ... };
```

### 3. Use Appropriate Mock Builders

```typescript
// ✅ GOOD - Use specific builder
const response = createMockEdgeFunctionResponse({ success: true });

// ❌ BAD - Manual mock structure
const response = { data: { success: true }, error: null };
```

### 4. Keep Mock Setup DRY

```typescript
// ✅ GOOD - Setup in beforeEach
beforeEach(() => {
  const session = createMockSession();
  supabase.auth.getSession.mockResolvedValue(session);
});

// ❌ BAD - Repeat in every test
it('test 1', () => {
  const session = createMockSession();
  supabase.auth.getSession.mockResolvedValue(session);
  // ...
});
```

## Troubleshooting

### Issue: Query builder not chaining properly

**Solution:** Ensure you're using `createQueryBuilder` which returns `this` from all methods.

### Issue: TypeScript errors with mock types

**Solution:** Use `jest.requireMock()` destructuring instead of type assertions.

### Issue: Tests failing after migration

**Solution:** Check that response structures match - use `createMockSuccessResponse` with correct parameters.

## Additional Resources

- [Mock Builders Source](../helpers/mockBuilders.ts)
- [Test Data Fixtures Source](../helpers/testData.ts)
- [Quick Reference Guide](../QUICK_REFERENCE_UNIT_TESTS.md)
- [Test Standards](../README.md)
