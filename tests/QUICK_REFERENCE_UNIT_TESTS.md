# Quick Reference: Creating Service Unit Tests

## Step-by-Step Process

### 1. Investigation Phase

```bash
# Find how the service is used in the codebase
grep -r "from '@/services/<service_name>" src/pages
```

### 2. Create Test File

```bash
# Create test directory and file
mkdir -p tests/unit/services/<service_name>
touch tests/unit/services/<service_name>/api.test.ts
```

### 3. Test File Template

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

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getSession: jest.fn(),
    },
    functions: {
      invoke: jest.fn(),
    },
    rpc: jest.fn(),
  },
}));

// Mock dependencies
jest.mock('@/services/users/api', () => ({
  getUserId: jest.fn(),
}));

// Destructure mocks
const {
  supabase: {
    from: mockFrom,
    auth: { getSession: mockAuthGetSession },
    functions: { invoke: mockFunctionsInvoke },
    rpc: mockRpc,
  },
} = jest.requireMock('@/services/supabase');

const { getUserId: mockGetUserId } = jest.requireMock('@/services/users/api');

describe('<ServiceName> API service (src/services/<service_name>/api.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('func1', () => {
    it('handles successful operation', async () => {
      // Arrange
      const mockData = { id: '123', name: 'Test' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: mockData, error: null });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      // Act
      const result = await func1('123');

      // Assert
      expect(mockFrom).toHaveBeenCalledWith('<table_name>');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockEq).toHaveBeenCalledWith('id', '123');
      expect(result).toEqual(mockData);
    });

    it('handles error case', async () => {
      // Arrange
      const mockError = { message: 'Database error' };
      const mockSelect = jest.fn().mockReturnThis();
      const mockEq = jest.fn().mockResolvedValue({ data: null, error: mockError });

      (mockFrom as jest.Mock).mockReturnValue({
        select: mockSelect.mockReturnValue({
          eq: mockEq,
        }),
      });

      // Act
      const result = await func1('123');

      // Assert
      expect(result).toBeNull(); // or appropriate error handling
    });
  });
});
```

### 4. Common Patterns

#### Supabase Query Chain

```typescript
const mockSelect = jest.fn().mockReturnThis();
const mockEq = jest.fn().mockReturnThis();
const mockOrder = jest.fn().mockReturnThis();
const mockRange = jest.fn().mockResolvedValue({ data, error, count });

(mockFrom as jest.Mock).mockReturnValue({
  select: mockSelect.mockReturnValue({
    eq: mockEq.mockReturnValue({
      order: mockOrder.mockReturnValue({
        range: mockRange,
      }),
    }),
  }),
});
```

#### Edge Function Call

```typescript
const mockSession = {
  data: { session: { access_token: 'test-token' } },
};
mockAuthGetSession.mockResolvedValue(mockSession);

const mockResult = { data: { success: true }, error: null };
mockFunctionsInvoke.mockResolvedValue(mockResult);

const result = await updateFunction(id, data);

expect(mockAuthGetSession).toHaveBeenCalledTimes(1);
expect(mockFunctionsInvoke).toHaveBeenCalledWith('function_name', {
  headers: {
    Authorization: 'Bearer test-token',
  },
  body: { id, data },
  region: 'us-east-1',
});
```

#### RPC Function Call

```typescript
const mockResult = { data: [{ id: '1' }], error: null };
mockRpc.mockResolvedValue(mockResult);

const result = await someRpcFunction(params);

expect(mockRpc).toHaveBeenCalledWith('rpc_function_name', {
  param1: value1,
  param2: value2,
});
```

#### User ID Dependency

```typescript
mockGetUserId.mockResolvedValue('user-123');

const result = await functionNeedingUserId();

expect(mockGetUserId).toHaveBeenCalledTimes(1);
```

### 5. Run and Verify

```bash
# Run tests
npm test -- tests/unit/services/<service_name>/ --no-coverage

# Run with coverage
npm test -- tests/unit/services/<service_name>/

# Lint check
npx eslint --ext .ts tests/unit/services/<service_name>
```

## Common Test Scenarios

### ✅ CRUD Operations

- Create with validation
- Read single/multiple
- Update via edge function
- Delete with confirmation
- Error handling for each

### ✅ Table Queries

- Pagination (range)
- Sorting (order)
- Filtering (eq, in, not)
- Search (pgroonga_search)
- Count with exact: true

### ✅ User Session

- Current user retrieval
- Session validation
- Empty/null session handling

### ✅ Edge Functions

- Authentication header
- Body structure
- Region specification
- Error response handling

### ✅ Data Transformation

- JSON to form data
- Form data to JSON
- Null/undefined handling
- Array vs single object

## Shared Test Utilities

### Query Builder Pattern

Use the `createQueryBuilder` helper from `tests/helpers/mockBuilders.ts` to create chainable Supabase query mocks:

```typescript
import { createQueryBuilder } from '../../../helpers/mockBuilders';

// Create a query builder that resolves with success data
const successResult = { data: [{ id: '1', name: 'Test' }], error: null, count: 1 };
const builder = createQueryBuilder(successResult);

supabase.from.mockReturnValue(builder);

// Now this works:
const result = await supabase.from('table').select('*').eq('id', '123').order('name').range(0, 9);

expect(result).toEqual(successResult);
```

### Mock Builders

Use helpers from `tests/helpers/mockBuilders.ts`:

```typescript
import {
  createQueryBuilder,
  createMockSession,
  createMockNoSession,
  createMockSuccessResponse,
  createMockErrorResponse,
  createMockEdgeFunctionResponse,
  createMockRpcResponse,
} from '../../../helpers/mockBuilders';

// Session mocks
const session = createMockSession('user-123', 'token-abc');
const noSession = createMockNoSession();

// Response mocks
const success = createMockSuccessResponse([{ id: '1' }], 10);
const error = createMockErrorResponse('Database error', 'PGRST000');

// Edge function mocks
const edgeSuccess = createMockEdgeFunctionResponse({ success: true });
const edgeError = createMockEdgeFunctionError('Function failed');

// RPC mocks
const rpcResult = createMockRpcResponse([{ id: '1', score: 0.95 }]);
```

### Test Data Fixtures

Use fixtures from `tests/helpers/testData.ts`:

```typescript
import {
  mockTeam,
  mockSource,
  mockUser,
  mockRole,
  mockPaginationParams,
  mockSortOrder,
  createMockTeam,
  createMockSource,
  createMockTableResponse,
} from '../../../helpers/testData';

// Use pre-defined fixtures
const team = mockTeam;
const params = mockPaginationParams; // { current: 1, pageSize: 10 }

// Create customized fixtures
const customTeam = createMockTeam({ rank: 5, is_public: false });
const customSource = createMockSource({ version: '02.00.000' });

// Create table response
const tableData = createMockTableResponse([mockTeam], 1, 1);
```

## Gotchas to Avoid

### ❌ Don't repeat createQueryBuilder in every test file

```typescript
// ❌ BAD - duplicated helper function
const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    // ... rest of implementation
  };
  return builder;
};

// ✅ GOOD - use shared helper
import { createQueryBuilder } from '../../../helpers/mockBuilders';
```

### ❌ Don't create inline mock data

```typescript
// ❌ BAD - hard to maintain
const mockTeam = {
  id: 'team-123',
  json: { title: [{ '@xml:lang': 'en', '#text': 'Test' }] },
  // ... lots of properties
};

// ✅ GOOD - use shared fixtures
import { mockTeam, createMockTeam } from '../../../helpers/testData';
```

### ❌ Don't use type casting with imported values

```typescript
// ❌ BAD
const mockFunc = importedFunc as jest.MockedFunction<typeof importedFunc>;

// ✅ GOOD
const { importedFunc: mockFunc } = jest.requireMock('@/services/module');
```

### ❌ Don't forget to clear mocks

```typescript
beforeEach(() => {
  jest.clearAllMocks();
});
```

### ❌ Don't use generic error expectations

```typescript
// ❌ BAD
expect(result).toBe(error);

// ✅ GOOD
expect(result).toEqual({ data: null, error: mockError });
```

### ❌ Don't test implementation details

```typescript
// ❌ BAD - tests internal logic
expect(mockFrom).toHaveBeenCalledTimes(3);

// ✅ GOOD - tests behavior
expect(result).toEqual(expectedData);
expect(mockFrom).toHaveBeenCalledWith('table_name');
```

## Common Pitfalls & Solutions

### Problem: Query builder doesn't support chaining

**Solution:** Use `createQueryBuilder` which returns `this` from all methods:

```typescript
const builder = createQueryBuilder({ data: [], error: null });
supabase.from.mockReturnValue(builder);

// All these methods chain properly
await supabase.from('table').select('*').eq('id', '1').order('name');
```

### Problem: TypeScript errors with mock types

**Solution:** Use proper destructuring and avoid type assertions:

```typescript
// ✅ GOOD
const { supabase } = jest.requireMock('@/services/supabase');
const { getUserId } = jest.requireMock('@/services/users/api');

// Then use directly
supabase.from.mockReturnValue(builder);
getUserId.mockResolvedValue('user-123');
```

### Problem: Tests fail due to undefined properties

**Solution:** Use complete fixtures from `testData.ts`:

```typescript
import { mockSource } from '../../../helpers/testData';

// mockSource has all required properties pre-filled
const result = createMockSuccessResponse([mockSource]);
```

## Checklist

- [ ] Investigated real usage in `src/pages/`
- [ ] Created test file with proper header
- [ ] Set up mocks using destructuring
- [ ] Used shared utilities from `tests/helpers/`
- [ ] Tested happy path
- [ ] Tested error cases
- [ ] Tested edge cases (null, undefined, empty)
- [ ] Tested session/auth requirements
- [ ] All tests pass: `npm test`
- [ ] No lint errors: `npx eslint`
- [ ] Added descriptive test names
- [ ] Documented special cases

## Resources

- **Shared Utilities:** `/tests/helpers/mockBuilders.ts`, `/tests/helpers/testData.ts`
- **Existing Examples:** `/tests/unit/services/sources/`, `/tests/unit/services/teams/`
- **Project Standards:** `/tests/README.md`
- **Jest Config:** `/jest.config.cjs`
