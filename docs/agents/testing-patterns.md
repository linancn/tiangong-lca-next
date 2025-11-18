# Testing Patterns Reference – Tiangong LCA Next

> Agents: read `docs/agents/ai-testing-guide.md` first for workflow/commands. This file keeps the long-form patterns, principles, and examples from the legacy guide. Mirror: `docs/agents/testing-patterns_CN.md`.

CRITICAL RULES:

- Follow the guardrails + command guidance from the short AI Testing Guide.
- Use this reference to locate detailed patterns, examples, and utilities when implementing tests.
- Always finish with `npm run lint` and the targeted `npm test -- ... --runInBand --testTimeout=...` combo described in the main guide.

---

## QUICK START FOR AI

When asked to write tests, follow this workflow:

### STEP 1: Understand the Task

Parse the user's request to identify:

- What to test: Extract feature name (e.g., "Processes", "Reviews", "Contacts")
- Test type: Integration test (user workflow) or Unit test (single function)
- Workflow: What actions? (e.g., "create, edit, review, delete")

### STEP 2: Locate Existing Code (Investigation Phase)

```bash
# Find the page component
ls src/pages/[Feature]/

# Find service functions
grep -r "export.*function" src/services/[feature]/

# Find existing integration tests for reference
ls tests/integration/[feature]/ 2>/dev/null || echo "No existing tests"

# Check what's already tested
grep -r "describe.*[Feature]" tests/integration/
```

### STEP 3: Identify What Already Exists

Before writing new tests:

- Check if similar tests exist: `grep -r "describe.*[Workflow]" tests/integration/`
- Find similar patterns: Look at tests/integration/manageSystem/ or tests/integration/reviews/
- Reuse existing mocks from tests/helpers/testData.ts

### STEP 4: Write Tests Following Patterns

Use the appropriate pattern from this guide:

- Integration tests: See [Integration Test Patterns](#integration-test-patterns)
- Unit tests: See [Unit Test Patterns](#unit-test-patterns)
- Always use helpers from tests/helpers/

CRITICAL RULES TO PREVENT INFINITE LOOPS:

- ✅ Mock ALL services in `beforeEach` BEFORE rendering components
- ✅ Use `mockResolvedValue` for stable responses
- ✅ Mock auth session if component uses authentication
- ✅ Verify API call counts with `toHaveBeenCalledTimes(expected)`
- ❌ NEVER render component before mocking services
- ❌ NEVER use `mockImplementation` that creates new objects on each call

### STEP 5: Execute Quality Gates

```bash
# Integration suites (serial execution + deterministic timeout)
npm test -- tests/integration/<feature>/ --runInBand --testTimeout=20000 --no-coverage

# Unit/utility suites
npm test -- tests/unit/<scope>/ --runInBand --testTimeout=10000 --no-coverage

# Mandatory lint gate
npm run lint
```

- Raise per-file limits with `jest.setTimeout(20000)` or a higher CLI `--testTimeout` when a workflow legitimately needs more time.
- If Jest times out, inspect for missing mocks, unresolved promises, or renders triggered before stubbing services.
- Use `npm test -- <pattern> --runInBand --testTimeout=20000 --detectOpenHandles` to uncover leaked handles (unawaited timers, sockets, etc.).

### STEP 6: Report Completion

Provide:

- Test file path
- Number of test cases written
- Coverage of workflows tested
- Confirmation that all tests pass and linter has zero errors

---

## TABLE OF CONTENTS

1. [Project Overview](#project-overview)
2. [Core Testing Principles](#core-testing-principles)
3. [Test Type Selection](#test-type-selection)
4. [Unit Test Patterns](#unit-test-patterns)
5. [Integration Test Patterns](#integration-test-patterns)
6. [Component Test Patterns](#component-test-patterns)
7. [Shared Utilities Reference](#shared-utilities-reference)
8. [Command Reference](#command-reference)
9. [Troubleshooting](#troubleshooting)

---

## PROJECT OVERVIEW

### Project Context

This is a Life Cycle Assessment (LCA) web application built with:

- Frontend: React + Ant Design + UmiJS
- Backend: Supabase (PostgreSQL database + Edge Functions)
- Authentication: Supabase Auth
- State Management: UmiJS model

COMMON FEATURES TO TEST:

- Data management: CRUD operations for entities (Processes, Contacts, Sources, etc.)
- Workflows: Create → Edit → Review → Approve/Reject
- Permissions: Role-based access (admin, reviewer, member)
- Pagination: Tables with sorting, filtering, page navigation
- Forms: Modal/Drawer forms with validation
- Internationalization: Chinese/English language support

### Test Directory Structure

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
│   ├── manageSystem/      # System management workflows (REFERENCE EXAMPLE)
│   ├── reviews/           # Review workflows (REFERENCE EXAMPLE)
│   └── ...                # Other feature workflows
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

REFERENCE EXAMPLES FOR INTEGRATION TESTS:

- tests/integration/manageSystem/ManageSystemWorkflow.integration.test.tsx
- tests/integration/reviews/ReviewWorkflow.integration.test.tsx

Use these as templates when writing new integration tests.

### File Naming Convention

- Unit tests: `*.test.ts` or `*.test.tsx`
- Integration tests: `*Workflow.integration.test.tsx` or `*[Feature].integration.test.tsx`
- Test files mirror the source structure
- Example: `src/services/teams/api.ts` → `tests/unit/services/teams/api.test.ts`

### Testing Stack

- Jest - Test runner and assertion library
- React Testing Library - Component testing
- @testing-library/jest-dom - Custom DOM matchers
- @testing-library/user-event - User interaction simulation

### Coverage Goal

TARGET: 100% coverage for all code

Write tests to cover ALL meaningful code paths:

- All service functions
- All component behaviors
- All utility functions
- All error cases
- All edge cases

---

## CORE TESTING PRINCIPLES

### Best Practices Summary

DO:

- Investigate real usage first - search the codebase to understand how code is actually used
- Use shared helpers - import from tests/helpers/ instead of creating inline mocks
- Test behavior, not implementation - focus on what the code does, not how it does it
- Write descriptive test names - "should fetch active teams ordered by rank"
- Clear mocks - use beforeEach(() => jest.clearAllMocks())
- Mock ALL services BEFORE rendering components - prevents infinite loops
- Use mockResolvedValue for stable responses - avoid mockImplementation with object creation
- Use fixtures - import test data from tests/helpers/testData.ts
- Await async operations
- Use semantic queries (getByRole, getByLabelText)
- Verify API calls are made reasonable number of times (use toHaveBeenCalledTimes)
- ALWAYS run linter after writing tests - ALL lint errors must be fixed before completion

DO NOT:

- Create inline query builders (use createQueryBuilder from helpers)
- Create inline test data (use fixtures from testData.ts)
- Render components before mocking required services (causes "Maximum update depth exceeded")
- Use mockImplementation that creates new objects on each call (causes infinite loops)
- Test implementation details (focus on observable behavior)
- Forget to await async calls
- Use generic test names like "should work"
- Skip tests without explanation
- Test third-party library internals
- Use query selectors (querySelector, getElementsByClassName)
- Commit failing tests

### When Tests Fail - Decision Tree

1. Run the test and identify the failure
2. Determine the root cause:
   - Is the business code incorrect? (bug, design flaw, incorrect logic)
   - Is the test code incorrect? (wrong expectations, improper mocks, flaky assertions)

3. If business code has issues:

   ```typescript
   it.skip('should do something', async () => {
     // TODO: Business logic bug - function returns undefined instead of empty array
     // Expected: getContacts('123') returns { data: [], error: null }
     // Actual: getContacts('123') returns { data: undefined, error: null }
   });
   ```

   - Mark test with `it.skip()` or `describe.skip()`
   - Add detailed `// TODO:` comment explaining the issue
   - Document expected vs actual behavior
   - Move to next test

4. If test code has issues:
   - Fix the test immediately
   - Ensure mocks match real API behavior
   - Verify assertions match actual business requirements

### Coverage Strategy

GOAL: Cover ALL meaningful code paths

What to test:

- Happy paths (successful operations)
- Error cases (database errors, network failures, validation errors)
- Edge cases (null, undefined, empty arrays, boundary values)
- State transitions (loading to loaded, enabled to disabled)
- Authentication states (authenticated vs unauthenticated)
- Permission variations (admin vs regular user)
- Pagination, filtering, and sorting logic

What NOT to test:

- Implementation details (internal variable names, private methods)
- Third-party library internals
- Trivial getters/setters with no logic

---

## TEST TYPE SELECTION

Use this decision tree to determine which test type to write:

### Unit Tests

USE WHEN:

- Testing a single service/API function
- Testing pure business logic
- Testing utility functions
- No UI interaction required

LOCATION: `tests/unit/services/[module]/api.test.ts`

EXAMPLES:

- `getContactById(id: string)`
- `createTeam(data: TeamData)`
- `performSearch(query: string)`

### Integration Tests

USE WHEN:

- Testing complete user workflows
- Testing multiple components working together
- Testing page-level interactions
- Verifying API calls from UI actions

LOCATION: `tests/integration/[feature]/[Workflow].integration.test.tsx`

EXAMPLES:

- User creates a contact and sees it in the list
- User switches tabs and different data loads
- Admin user sees delete button, regular user does not

### Component Tests

USE WHEN:

- Testing isolated React component behavior
- Testing component props and callbacks
- Testing conditional rendering
- Testing accessibility features

LOCATION: `tests/unit/components/[Component].test.tsx`

EXAMPLES:

- Button click triggers callback
- Loading state shows spinner
- Error prop displays error message

---

## UNIT TEST PATTERNS

### Investigation Phase (REQUIRED)

Before writing any unit test, investigate real usage:

```bash
# Find where the service is used
grep -r "from '@/services/contacts'" src/pages

# Find specific function usage
grep -r "getContactById\|createContact" src/

# Examine the actual service file
cat src/services/contacts/api.ts
```

GOAL: Understand what parameters are actually used, what errors need handling, and what edge cases exist in real usage.

### Standard Unit Test Template

```typescript
/**
 * Unit tests for [module] service
 * Path: src/services/[module]/api.ts
 *
 * Coverage focus:
 * - getById (used in src/pages/Contacts/index.tsx line 45)
 * - create (used in src/pages/Contacts/ContactDrawer.tsx line 120)
 * - update (used in src/pages/Contacts/EditModal.tsx line 89)
 */

import { getById, create, update } from '@/services/[module]/api';
import { createQueryBuilder, createMockSession } from '../../helpers/mockBuilders';
import { mockData, createMockData } from '../../helpers/testData';

// Mock Supabase
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
    rpc: jest.fn(),
  },
}));

// Mock dependencies if any
jest.mock('@/services/users/api', () => ({
  getUserId: jest.fn(),
}));

// Get mocks
const { supabase } = jest.requireMock('@/services/supabase');
const { getUserId } = jest.requireMock('@/services/users/api');

describe('[Module] Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getById', () => {
    it('should fetch data successfully', async () => {
      // Arrange
      const mockResponse = [{ id: '123', name: 'Test' }];
      const builder = createQueryBuilder({ data: mockResponse, error: null });
      supabase.from.mockReturnValue(builder);

      // Act
      const result = await getById('123');

      // Assert
      expect(supabase.from).toHaveBeenCalledWith('table_name');
      expect(builder.select).toHaveBeenCalled();
      expect(builder.eq).toHaveBeenCalledWith('id', '123');
      expect(result.data).toEqual(mockResponse);
      expect(result.error).toBeNull();
    });

    it('should handle database errors', async () => {
      // Arrange
      const mockError = { message: 'Database connection failed' };
      const builder = createQueryBuilder({ data: null, error: mockError });
      supabase.from.mockReturnValue(builder);

      // Act
      const result = await getById('123');

      // Assert
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe('Database connection failed');
      expect(result.data).toBeNull();
    });

    it('should handle empty results', async () => {
      // Arrange
      const builder = createQueryBuilder({ data: [], error: null });
      supabase.from.mockReturnValue(builder);

      // Act
      const result = await getById('non-existent-id');

      // Assert
      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });
});
```

### Pattern 1: Simple Query

```typescript
it('should fetch all records', async () => {
  // Arrange
  const mockData = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ];
  const builder = createQueryBuilder({ data: mockData, error: null });
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getAll();

  // Assert
  expect(supabase.from).toHaveBeenCalledWith('table_name');
  expect(builder.select).toHaveBeenCalled();
  expect(result.data).toEqual(mockData);
});
```

### Pattern 2: Filtered Query with Pagination

```typescript
it('should fetch paginated results with filters', async () => {
  // Arrange
  const mockData = [{ id: '1' }, { id: '2' }];
  const builder = createQueryBuilder({ data: mockData, error: null, count: 100 });
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await getTableData(
    { current: 1, pageSize: 10 },
    { column: 'created_at', order: 'descend' },
  );

  // Assert
  expect(supabase.from).toHaveBeenCalledWith('table_name');
  expect(builder.select).toHaveBeenCalled();
  expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false });
  expect(builder.range).toHaveBeenCalledWith(0, 9);
  expect(result.data).toEqual(mockData);
  expect(result.count).toBe(100);
});
```

### Pattern 3: Edge Function Call with Authentication

```typescript
it('should call edge function with auth token', async () => {
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

it('should handle missing session', async () => {
  // Arrange
  const noSession = createMockNoSession();
  supabase.auth.getSession.mockResolvedValue(noSession);

  // Act
  const result = await updateViaEdgeFunction('123', { name: 'Updated' });

  // Assert
  expect(result.error).toBeDefined();
  expect(result.data).toBeNull();
});
```

### Pattern 4: RPC Function Call

```typescript
it('should perform RPC search', async () => {
  // Arrange
  const searchResults = [
    { id: '1', title: 'Result 1', score: 0.95 },
    { id: '2', title: 'Result 2', score: 0.87 },
  ];
  supabase.rpc.mockResolvedValue({ data: searchResults, error: null });

  // Act
  const result = await performSearch('test query');

  // Assert
  expect(supabase.rpc).toHaveBeenCalledWith('search_function', {
    query_text: 'test query',
  });
  expect(result.data).toEqual(searchResults);
});
```

### Pattern 5: CRUD Operations

```typescript
describe('create', () => {
  it('should insert new record', async () => {
    // Arrange
    const newData = { name: 'New Item' };
    const created = { id: 'new-id', ...newData };
    const builder = createQueryBuilder({ data: [created], error: null });
    supabase.from.mockReturnValue(builder);

    // Act
    const result = await create(newData);

    // Assert
    expect(builder.insert).toHaveBeenCalledWith(newData);
    expect(builder.select).toHaveBeenCalled();
    expect(result.data[0].id).toBe('new-id');
  });
});

describe('update', () => {
  it('should update existing record', async () => {
    // Arrange
    const updates = { name: 'Updated Name' };
    const builder = createQueryBuilder({ data: [{ id: '123', ...updates }], error: null });
    supabase.from.mockReturnValue(builder);

    // Act
    const result = await update('123', updates);

    // Assert
    expect(builder.update).toHaveBeenCalledWith(updates);
    expect(builder.eq).toHaveBeenCalledWith('id', '123');
    expect(result.data[0].name).toBe('Updated Name');
  });
});

describe('delete', () => {
  it('should delete record', async () => {
    // Arrange
    const builder = createQueryBuilder({ data: null, error: null });
    supabase.from.mockReturnValue(builder);

    // Act
    await deleteRecord('123');

    // Assert
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', '123');
  });
});
```

### Pattern 6: Error Handling

```typescript
it('should handle database errors gracefully', async () => {
  // Arrange
  const errorResponse = {
    data: null,
    error: { message: 'Connection failed', code: 'PGRST000' },
  };
  const builder = createQueryBuilder(errorResponse);
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await fetchData();

  // Assert
  expect(result.error).toBeDefined();
  expect(result.error.message).toBe('Connection failed');
  expect(result.data).toBeNull();
});

it('should handle validation errors', async () => {
  // Arrange
  const errorResponse = {
    data: null,
    error: { message: 'Invalid input', code: 'PGRST100' },
  };
  const builder = createQueryBuilder(errorResponse);
  supabase.from.mockReturnValue(builder);

  // Act
  const result = await create({ invalidField: true });

  // Assert
  expect(result.error.message).toBe('Invalid input');
});
```

### Pattern 7: Session-Dependent Operations

```typescript
describe('authenticated operations', () => {
  beforeEach(() => {
    const session = createMockSession('user-123', 'token-abc');
    supabase.auth.getSession.mockResolvedValue(session);
  });

  it('should fetch user-specific data', async () => {
    const mockData = [{ id: '1', userId: 'user-123' }];
    const builder = createQueryBuilder({ data: mockData, error: null });
    supabase.from.mockReturnValue(builder);

    const result = await getUserData();

    expect(result.data).toEqual(mockData);
  });
});

describe('unauthenticated operations', () => {
  beforeEach(() => {
    const noSession = createMockNoSession();
    supabase.auth.getSession.mockResolvedValue(noSession);
  });

  it('should return error when not authenticated', async () => {
    const result = await getUserData();

    expect(result.error).toBeDefined();
    expect(result.data).toBeNull();
  });
});
```

### Quality Gates for Unit Tests

CRITICAL: Execute ALL steps below. Do not skip any step.

```bash
# Step 1: Run the focused suite with deterministic timeout
npm test -- tests/unit/services/[module]/ --runInBand --testTimeout=10000 --no-coverage

# Step 2: Diagnose failures (business logic vs. test issue)

# Step 3: Lint (MANDATORY)
npm run lint

# Step 4: Optional coverage spot-check
npx jest --coverage --collectCoverageFrom="src/services/[module]/api.ts"

# Step 5: Open the HTML report if deeper insight is needed
open coverage/lcov-report/src/services/[module]/api.ts.html
```

⚠️ **TIME MONITORING**: If Jest reports a timeout, inspect missing mocks, unresolved promises, or loops. Use `--detectOpenHandles` when Node refuses to exit.

REQUIREMENTS BEFORE COMPLETION:

- ALL tests must pass
- ALL linter errors must be fixed (npm run lint returns no errors)
- No skipped tests without TODO comments

---

## INTEGRATION TEST PATTERNS

### Investigation Phase (REQUIRED)

Before writing integration tests, investigate the user workflow:

```bash
# Step 1: Find the page component structure
ls src/pages/[Feature]/
# Example output: index.tsx, components/, [FeatureDrawer].tsx

# Step 2: Identify service functions used in the page
grep -r "from '@/services" src/pages/[Feature]/
# Example output: import { getData, createData } from '@/services/[module]/api'

# Step 3: Find related components
grep -r "import.*from.*components" src/pages/[Feature]/
# Example output: import { DataTable } from '@/components/DataTable'

# Step 4: Check existing integration tests for reference
ls tests/integration/
# Look for similar features (e.g., manageSystem, reviews)

# Step 5: Examine the page structure to understand workflow
cat src/pages/[Feature]/index.tsx | head -50
# Identify: state management, API calls, user interactions
```

GOAL: Map out the complete user journey, identify all API calls, understand state transitions.

EXPECTED FINDINGS:

- Main page component path
- List of service functions called
- UI components used (tables, forms, modals, tabs)
- User interactions (buttons, forms, navigation)
- State management patterns

### Common Patterns in This Project

TYPICAL PAGE STRUCTURE:

```typescript
// src/pages/[Feature]/index.tsx
export default () => {
  const [dataSource, setDataSource] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initial data load
  useEffect(() => {
    fetchData();
  }, []);

  // Table with pagination
  <ProTable
    dataSource={dataSource}
    columns={columns}
    pagination={{ current, pageSize }}
  />

  // Action buttons
  <Button onClick={handleCreate}>Create</Button>

  // Modal/Drawer for create/edit
  <Drawer visible={visible} onClose={handleClose}>
    <Form onFinish={handleSubmit}>
      {/* Form fields */}
    </Form>
  </Drawer>
};
```

TYPICAL SERVICE STRUCTURE:

```typescript
// src/services/[module]/api.ts
export async function getTableData(params, sorter) {
  // Fetch with pagination and sorting
}

export async function createData(data) {
  // Insert via Supabase or Edge Function
}

export async function updateData(id, data) {
  // Update via Edge Function (requires auth)
}

export async function deleteData(id) {
  // Delete operation
}
```

TYPICAL WORKFLOW TO TEST:

1. Page loads → Show loading state
2. API fetches data → Display in table
3. User clicks "Create" → Modal opens
4. User fills form → Submits
5. Success message → Table refreshes
6. User clicks "Edit" → Modal opens with data
7. User updates → Saves
8. User clicks "Delete" → Confirmation → Deletes

### Standard Integration Test Template

```typescript
/**
 * Integration tests for [Workflow Name]
 * Path: tests/integration/[feature]/[Workflow].integration.test.tsx
 *
 * User Journey:
 * 1. User lands on the page and sees loading state
 * 2. Data loads from API and displays in table
 * 3. User clicks "Create" button and modal opens
 * 4. User fills form and submits
 * 5. Success message appears and list refreshes
 *
 * API Interactions:
 * - getTableData() - fetches initial list
 * - createRecord() - creates new item
 * - getTableData() - refreshes list after create
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FeaturePage from '@/pages/[Feature]';

// Mock services
jest.mock('@/services/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

jest.mock('@/services/[module]/api', () => ({
  getData: jest.fn(),
  createData: jest.fn(),
  updateData: jest.fn(),
}));

const { supabase } = jest.requireMock('@/services/supabase');
const { getData, createData, updateData } = jest.requireMock('@/services/[module]/api');

describe('[Workflow] Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // CRITICAL: Setup default mocks for ALL services used by the page
    // This prevents "Maximum update depth exceeded" errors

    // Mock auth session (if page checks authentication)
    const session = createMockSession('user-123', 'token-abc');
    supabase.auth.getSession.mockResolvedValue(session);

    // Mock default data responses (override in individual tests as needed)
    getData.mockResolvedValue({ data: [], error: null });

    // Mock other common services if used (user roles, permissions, etc.)
    // getUserRole.mockResolvedValue({ data: { role: 'member' }, error: null });
  });

  it('completes the expected user journey', async () => {
    // Test implementation
  });
});
```

### Pattern 1: Page Load and Data Display

```typescript
it('loads page and displays data from API', async () => {
  // Arrange
  const mockData = [
    { id: '1', name: 'Item 1', status: 'active' },
    { id: '2', name: 'Item 2', status: 'pending' },
  ];
  getData.mockResolvedValue({ data: mockData, error: null });

  // Act
  render(<FeaturePage />);

  // Assert - Loading state appears first
  expect(screen.getByText(/loading/i)).toBeInTheDocument();

  // Assert - Data displays after load
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  // Verify API was called reasonable number of times (should be 1 for initial load)
  expect(getData).toHaveBeenCalledTimes(1);
});
```

### Pattern 2: Create Workflow

```typescript
it('allows user to create new item', async () => {
  // Arrange
  const user = userEvent.setup();
  getData.mockResolvedValue({ data: [], error: null });
  createData.mockResolvedValue({
    data: { id: 'new-1', name: 'New Item' },
    error: null,
  });

  render(<FeaturePage />);

  // Wait for initial load
  await waitFor(() => {
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  });

  // Act - Open create modal
  const createButton = screen.getByRole('button', { name: /create/i });
  await user.click(createButton);

  // Assert - Modal is visible
  expect(screen.getByRole('dialog')).toBeInTheDocument();

  // Act - Fill form
  const nameInput = screen.getByLabelText(/name/i);
  await user.type(nameInput, 'New Item');

  // Act - Submit
  const submitButton = screen.getByRole('button', { name: /submit/i });
  await user.click(submitButton);

  // Assert - Success message
  await waitFor(() => {
    expect(screen.getByText(/success/i)).toBeInTheDocument();
  });

  // Verify API calls
  expect(createData).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'New Item',
    }),
  );
});
```

### Pattern 3: Update Workflow

```typescript
it('allows user to edit existing item', async () => {
  // Arrange
  const user = userEvent.setup();
  const existingItem = { id: '123', name: 'Original Name' };
  getData.mockResolvedValue({ data: [existingItem], error: null });
  updateData.mockResolvedValue({
    data: { id: '123', name: 'Updated Name' },
    error: null,
  });

  render(<FeaturePage />);

  // Wait for data load
  await waitFor(() => {
    expect(screen.getByText('Original Name')).toBeInTheDocument();
  });

  // Act - Click edit button
  const editButton = screen.getByRole('button', { name: /edit/i });
  await user.click(editButton);

  // Act - Update name
  const nameInput = screen.getByDisplayValue('Original Name');
  await user.clear(nameInput);
  await user.type(nameInput, 'Updated Name');

  // Act - Save
  const saveButton = screen.getByRole('button', { name: /save/i });
  await user.click(saveButton);

  // Assert - Success
  await waitFor(() => {
    expect(screen.getByText(/updated successfully/i)).toBeInTheDocument();
  });

  // Verify API
  expect(updateData).toHaveBeenCalledWith(
    '123',
    expect.objectContaining({
      name: 'Updated Name',
    }),
  );
});
```

### Pattern 4: Tab Navigation

```typescript
it('switches tabs and loads different data', async () => {
  // Arrange
  const user = userEvent.setup();
  const pendingData = [{ id: '1', status: 'pending', name: 'Pending Item' }];
  const completedData = [{ id: '2', status: 'completed', name: 'Completed Item' }];

  getData
    .mockResolvedValueOnce({ data: pendingData, error: null })
    .mockResolvedValueOnce({ data: completedData, error: null });

  render(<FeaturePage />);

  // Wait for initial tab data
  await waitFor(() => {
    expect(screen.getByText('Pending Item')).toBeInTheDocument();
  });

  // Act - Switch to completed tab
  const completedTab = screen.getByRole('tab', { name: /completed/i });
  await user.click(completedTab);

  // Assert - New data loaded
  await waitFor(() => {
    expect(screen.getByText('Completed Item')).toBeInTheDocument();
    expect(screen.queryByText('Pending Item')).not.toBeInTheDocument();
  });

  // Verify API called twice
  expect(getData).toHaveBeenCalledTimes(2);
  expect(getData).toHaveBeenNthCalledWith(1, { status: 'pending' });
  expect(getData).toHaveBeenNthCalledWith(2, { status: 'completed' });
});
```

### Pattern 5: Role-Based Access

```typescript
it('shows admin controls for admin users', async () => {
  // Arrange
  const adminSession = createMockSession('admin-user-id', 'token');
  supabase.auth.getSession.mockResolvedValue(adminSession);
  getUserRole.mockResolvedValue({ data: { role: 'admin' }, error: null });
  getData.mockResolvedValue({ data: [{ id: '1', name: 'Item' }], error: null });

  // Act
  render(<FeaturePage />);

  // Assert - Admin buttons visible
  await waitFor(() => {
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /promote/i })).toBeInTheDocument();
  });
});

it('hides admin controls for regular users', async () => {
  // Arrange
  const userSession = createMockSession('user-id', 'token');
  supabase.auth.getSession.mockResolvedValue(userSession);
  getUserRole.mockResolvedValue({ data: { role: 'member' }, error: null });
  getData.mockResolvedValue({ data: [{ id: '1', name: 'Item' }], error: null });

  // Act
  render(<FeaturePage />);

  // Assert - Admin buttons hidden
  await waitFor(() => {
    expect(screen.getByText('Item')).toBeInTheDocument();
  });

  expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /promote/i })).not.toBeInTheDocument();
});
```

### Pattern 6: Error Handling and Recovery

```typescript
it('displays error message and allows retry', async () => {
  // Arrange
  const user = userEvent.setup();
  getData
    .mockResolvedValueOnce({ data: null, error: { message: 'Network error' } })
    .mockResolvedValueOnce({ data: [{ id: '1', name: 'Item' }], error: null });

  // Act
  render(<FeaturePage />);

  // Assert - Error message displayed
  await waitFor(() => {
    expect(screen.getByText(/network error/i)).toBeInTheDocument();
  });

  // Act - Click retry
  const retryButton = screen.getByRole('button', { name: /retry/i });
  await user.click(retryButton);

  // Assert - Success after retry
  await waitFor(() => {
    expect(screen.getByText('Item')).toBeInTheDocument();
    expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
  });

  // Verify retry triggered API call
  expect(getData).toHaveBeenCalledTimes(2);
});
```

### Pattern 7: Pagination

```typescript
it('navigates through paginated results', async () => {
  // Arrange
  const user = userEvent.setup();
  const page1Data = [
    { id: '1', name: 'Item 1' },
    { id: '2', name: 'Item 2' },
  ];
  const page2Data = [
    { id: '3', name: 'Item 3' },
    { id: '4', name: 'Item 4' },
  ];

  getData
    .mockResolvedValueOnce({ data: page1Data, error: null, count: 4 })
    .mockResolvedValueOnce({ data: page2Data, error: null, count: 4 });

  render(<FeaturePage />);

  // Wait for page 1
  await waitFor(() => {
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  // Act - Go to page 2
  const nextButton = screen.getByRole('button', { name: /next/i });
  await user.click(nextButton);

  // Assert - Page 2 data loaded
  await waitFor(() => {
    expect(screen.getByText('Item 3')).toBeInTheDocument();
    expect(screen.getByText('Item 4')).toBeInTheDocument();
  });

  // Verify API called with correct pagination
  expect(getData).toHaveBeenNthCalledWith(1, { current: 1, pageSize: 10 });
  expect(getData).toHaveBeenNthCalledWith(2, { current: 2, pageSize: 10 });
});
```

### Quality Gates for Integration Tests

CRITICAL: Execute ALL steps below. Do not skip any step.

```bash
# Step 1: Run the specific workflow serially with deterministic timeout
npm test -- tests/integration/[feature]/[Workflow].integration.test.tsx --runInBand --testTimeout=20000 --no-coverage

# Step 2: Diagnose failures (mock ordering, auth session, API expectations)

# Step 3: Run linter (MANDATORY)
npm run lint
```

⚠️ **TIME MONITORING**: If Jest reports a timeout, it usually means an infinite loop or missing mock.

This indicates "Maximum update depth exceeded" or infinite loop. Common causes:

1. Component rendered BEFORE mocks set up
2. Missing auth session mock
3. Mock returns new object reference each call
4. Missing dependency in useEffect

**Quick fix pattern:**

```typescript
beforeEach(() => {
  jest.clearAllMocks();
  // Mock EVERYTHING the page uses BEFORE any test renders it
  supabase.auth.getSession.mockResolvedValue(createMockSession('user', 'token'));
  getData.mockResolvedValue({ data: [], error: null });
  getUserRole.mockResolvedValue({ data: { role: 'member' }, error: null });
});
```

REQUIREMENTS BEFORE COMPLETION:

- ALL tests must pass
- ALL linter errors must be fixed (npm run lint returns no errors)
- Each integration test completes in < 15 seconds

---

## COMPONENT TEST PATTERNS

### Standard Component Test Template

```typescript
/**
 * Tests for [ComponentName] component
 * Path: tests/unit/components/[ComponentName].test.tsx
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentName from '@/components/ComponentName';

describe('ComponentName', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with required props', () => {
    // Test implementation
  });
});
```

### Pattern 1: Rendering Basics

```typescript
it('renders correctly with given props', () => {
  // Arrange
  const props = {
    title: 'Test Title',
    description: 'Test Description',
    visible: true,
    onClose: jest.fn(),
  };

  // Act
  render(<ComponentName {...props} />);

  // Assert
  expect(screen.getByText('Test Title')).toBeInTheDocument();
  expect(screen.getByText('Test Description')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument();
});
```

### Pattern 2: User Interactions

```typescript
it('handles button click and calls callback', async () => {
  // Arrange
  const user = userEvent.setup();
  const handleClick = jest.fn();
  render(<ComponentName onSubmit={handleClick} />);

  // Act
  const button = screen.getByRole('button', { name: /submit/i });
  await user.click(button);

  // Assert
  expect(handleClick).toHaveBeenCalledTimes(1);
});

it('handles input change', async () => {
  // Arrange
  const user = userEvent.setup();
  const handleChange = jest.fn();
  render(<ComponentName value="" onChange={handleChange} />);

  // Act
  const input = screen.getByRole('textbox');
  await user.type(input, 'Test Value');

  // Assert
  expect(handleChange).toHaveBeenCalled();
  expect(input).toHaveValue('Test Value');
});
```

### Pattern 3: Conditional Rendering

```typescript
it('shows loading state when loading prop is true', () => {
  render(<ComponentName loading={true} />);

  expect(screen.getByText(/loading/i)).toBeInTheDocument();
  expect(screen.queryByText(/content/i)).not.toBeInTheDocument();
});

it('shows content when loading is false', () => {
  render(<ComponentName loading={false} data={mockData} />);

  expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
  expect(screen.getByText(/content/i)).toBeInTheDocument();
});

it('shows error state when error prop is provided', () => {
  render(<ComponentName error="Something went wrong" />);

  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
});

it('shows empty state when no data', () => {
  render(<ComponentName data={[]} />);

  expect(screen.getByText(/no data available/i)).toBeInTheDocument();
});
```

### Pattern 4: Props Validation

```typescript
it('applies disabled state correctly', () => {
  render(<ComponentName disabled={true} />);

  const button = screen.getByRole('button');
  expect(button).toBeDisabled();
});

it('uses default props when not provided', () => {
  render(<ComponentName />);

  expect(screen.getByText('Default Title')).toBeInTheDocument();
  expect(screen.getByRole('button')).not.toBeDisabled();
});

it('overrides default props when provided', () => {
  render(<ComponentName title="Custom Title" />);

  expect(screen.getByText('Custom Title')).toBeInTheDocument();
  expect(screen.queryByText('Default Title')).not.toBeInTheDocument();
});
```

### Pattern 5: Event Handlers

```typescript
it('calls onClose when close button is clicked', async () => {
  // Arrange
  const user = userEvent.setup();
  const handleClose = jest.fn();
  render(<ComponentName onClose={handleClose} />);

  // Act
  const closeButton = screen.getByRole('button', { name: /close/i });
  await user.click(closeButton);

  // Assert
  expect(handleClose).toHaveBeenCalledTimes(1);
});

it('prevents form submission when validation fails', async () => {
  // Arrange
  const user = userEvent.setup();
  const handleSubmit = jest.fn();
  render(<ComponentName onSubmit={handleSubmit} />);

  // Act - Submit without required fields
  const submitButton = screen.getByRole('button', { name: /submit/i });
  await user.click(submitButton);

  // Assert
  expect(handleSubmit).not.toHaveBeenCalled();
  expect(screen.getByText(/required field/i)).toBeInTheDocument();
});
```

### Pattern 6: Accessibility

```typescript
it('has proper ARIA labels', () => {
  render(<ComponentName />);

  expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /submit/i })).toHaveAccessibleName();
});

it('supports keyboard navigation', async () => {
  // Arrange
  const user = userEvent.setup();
  const handleSubmit = jest.fn();
  render(<ComponentName onSubmit={handleSubmit} />);

  // Act - Tab to input
  await user.tab();
  expect(screen.getByRole('textbox')).toHaveFocus();

  // Act - Tab to button
  await user.tab();
  expect(screen.getByRole('button')).toHaveFocus();

  // Act - Press Enter
  await user.keyboard('{Enter}');

  // Assert
  expect(handleSubmit).toHaveBeenCalled();
});

it('announces changes to screen readers', () => {
  render(<ComponentName />);

  const statusElement = screen.getByRole('status');
  expect(statusElement).toHaveAttribute('aria-live', 'polite');
});
```

### Quality Gates for Component Tests

CRITICAL: Execute ALL steps below. Do not skip any step.

```bash
# Step 1: Run the component suite with deterministic timeout
npm test -- tests/unit/components/[Component].test.tsx --runInBand --testTimeout=10000 --no-coverage

# Step 2: Diagnose failures (props/mocks/state)

# Step 3: Run linter (MANDATORY)
npm run lint

# Step 4: Optional coverage spot-check
npx jest --coverage --collectCoverageFrom="src/components/[Component].tsx"
```

REQUIREMENTS BEFORE COMPLETION:

- ALL tests must pass
- ALL linter errors must be fixed (npm run lint returns no errors)

---

## SHARED UTILITIES REFERENCE

Location: `tests/helpers/`

### Mock Builders (mockBuilders.ts)

CRITICAL: Always use these helpers instead of creating inline mocks.

#### createQueryBuilder

MOST IMPORTANT HELPER - handles Supabase query chaining.

```typescript
import { createQueryBuilder } from '../../helpers/mockBuilders';

// Typical usage
const builder = createQueryBuilder({
  data: [{ id: '1', name: 'Test' }],
  error: null,
  count: 1,
});
supabase.from.mockReturnValue(builder);

// Now supports method chaining automatically:
await supabase.from('table').select('*').eq('id', '123').order('name').range(0, 9);
```

WRONG WAY (never do this):

```typescript
// WRONG - Don't create inline mock chains
const builder = {
  select: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  // ... repetitive and error-prone
};
```

#### createMockSuccessResponse

```typescript
import { createMockSuccessResponse } from '../../helpers/mockBuilders';

const response = createMockSuccessResponse([{ id: '1' }], 10);
// Returns: { data: [{ id: '1' }], error: null, count: 10 }
```

#### createMockErrorResponse

```typescript
import { createMockErrorResponse } from '../../helpers/mockBuilders';

const response = createMockErrorResponse('Database error', 'PGRST000');
// Returns: { data: null, error: { message: 'Database error', code: 'PGRST000' } }
```

#### createMockSession

```typescript
import { createMockSession, createMockNoSession } from '../../helpers/mockBuilders';

// Mock authenticated session
const session = createMockSession('user-123', 'token-abc');
supabase.auth.getSession.mockResolvedValue(session);

// Mock unauthenticated state
const noSession = createMockNoSession();
supabase.auth.getSession.mockResolvedValue(noSession);
```

### Test Data Fixtures (testData.ts)

Pre-defined mock data for common entities.

```typescript
import {
  mockTeam,
  mockSource,
  mockUser,
  mockContact,
  createMockTeam,
  createMockSource,
  mockPaginationParams,
} from '../../helpers/testData';

// Use pre-defined fixtures
const team = mockTeam;
// Has all required properties: id, name, rank, is_public, etc.

const params = mockPaginationParams;
// { current: 1, pageSize: 10 }

// Create customized fixtures
const customTeam = createMockTeam({
  id: 'custom-id',
  rank: 5,
  is_public: false,
});

const customSource = createMockSource({
  version: '02.00.000',
  isPublic: true,
});
```

### React Testing Utilities (testUtils.tsx)

Pre-configured testing library setup.

```typescript
import { render, screen, waitFor } from '../../helpers/testUtils';

// Already includes all necessary providers and setup
render(<Component />);
```

---
