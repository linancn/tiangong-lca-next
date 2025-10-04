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

## Gotchas to Avoid

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

## Checklist

- [ ] Investigated real usage in `src/pages/`
- [ ] Created test file with proper header
- [ ] Set up mocks using destructuring
- [ ] Tested happy path
- [ ] Tested error cases
- [ ] Tested edge cases (null, undefined, empty)
- [ ] Tested session/auth requirements
- [ ] All tests pass: `npm test`
- [ ] No lint errors: `npx eslint`
- [ ] Added descriptive test names
- [ ] Documented special cases

## Resources

- **Full Guide:** `/tests/UNIT_TEST_GENERATION_SUMMARY.md`
- **Existing Examples:** `/tests/unit/services/flows/`, `/tests/unit/services/users/`
- **Project Standards:** `/tests/README.md`
- **Jest Config:** `/jest.config.cjs`
