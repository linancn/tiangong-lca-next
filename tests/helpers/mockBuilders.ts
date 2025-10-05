/**
 * Shared mock builders for Supabase query patterns
 *
 * This module provides reusable mock builder functions for common Supabase
 * query patterns used across the test suite.
 */

/**
 * Creates a chainable Supabase query builder mock
 *
 * This helper creates a mock that supports common Supabase query methods
 * like select(), eq(), order(), range(), filter(), etc.
 *
 * @param resolvedValue - The value to return when the query is executed
 * @returns A mock query builder with chainable methods
 *
 * @example
 * const builder = createQueryBuilder({ data: [...], error: null, count: 10 });
 * mockFrom.mockReturnValue(builder);
 *
 * // Now the mock supports chaining:
 * supabase.from('table').select('*').eq('id', '123').order('name')
 */
export const createQueryBuilder = <T>(resolvedValue: T) => {
  const builder: any = {
    select: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    filter: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue(resolvedValue),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    upsert: jest.fn().mockReturnThis(),
    then: (resolve: any, reject?: any) => Promise.resolve(resolvedValue).then(resolve, reject),
  };

  // Add 'in' method separately to avoid TypeScript reserved keyword issues
  builder.in = jest.fn().mockReturnThis();

  return builder;
};

/**
 * Creates a mock Supabase session object
 *
 * @param userId - Optional user ID (defaults to 'test-user-id')
 * @param accessToken - Optional access token (defaults to 'test-token')
 * @returns A mock session object
 *
 * @example
 * const mockSession = createMockSession('user-123', 'abc-token');
 * mockAuthGetSession.mockResolvedValue(mockSession);
 */
export const createMockSession = (
  userId: string = 'test-user-id',
  accessToken: string = 'test-token',
) => ({
  data: {
    session: {
      user: { id: userId },
      access_token: accessToken,
    },
  },
  error: null,
});

/**
 * Creates a mock for no session (user not logged in)
 *
 * @returns A mock session object with null session
 *
 * @example
 * mockAuthGetSession.mockResolvedValue(createMockNoSession());
 */
export const createMockNoSession = () => ({
  data: {
    session: null,
  },
  error: null,
});

/**
 * Creates a mock Supabase success response
 *
 * @param data - The data to return
 * @param count - Optional count for pagination
 * @returns A mock Supabase response
 *
 * @example
 * const response = createMockSuccessResponse([{ id: '1', name: 'Test' }], 1);
 */
export const createMockSuccessResponse = <T>(data: T, count?: number) => ({
  data,
  error: null,
  count: count ?? null,
  status: 200,
  statusText: 'OK',
});

/**
 * Creates a mock Supabase error response
 *
 * @param message - Error message
 * @param code - Optional error code
 * @returns A mock Supabase error response
 *
 * @example
 * const errorResponse = createMockErrorResponse('Database error', 'PGRST000');
 */
export const createMockErrorResponse = (message: string = 'Database error', code?: string) => ({
  data: null,
  error: {
    message,
    code: code ?? 'ERROR',
    details: '',
    hint: '',
  },
  count: null,
  status: 500,
  statusText: 'Internal Server Error',
});

/**
 * Creates a mock edge function success response
 *
 * @param data - The data to return from the edge function
 * @returns A mock edge function response
 *
 * @example
 * const response = createMockEdgeFunctionResponse({ success: true, id: '123' });
 * mockFunctionsInvoke.mockResolvedValue(response);
 */
export const createMockEdgeFunctionResponse = <T>(data: T) => ({
  data,
  error: null,
});

/**
 * Creates a mock edge function error response
 *
 * @param message - Error message
 * @returns A mock edge function error response
 *
 * @example
 * const errorResponse = createMockEdgeFunctionError('Function execution failed');
 * mockFunctionsInvoke.mockResolvedValue(errorResponse);
 */
export const createMockEdgeFunctionError = (message: string = 'Function error') => ({
  data: null,
  error: {
    message,
  },
});

/**
 * Creates a mock RPC function response
 *
 * @param data - The data to return from the RPC call
 * @returns A mock RPC response
 *
 * @example
 * const response = createMockRpcResponse([{ id: '1', score: 0.95 }]);
 * mockRpc.mockResolvedValue(response);
 */
export const createMockRpcResponse = <T>(data: T) => ({
  data,
  error: null,
});

/**
 * Creates a mock RPC function error response
 *
 * @param message - Error message
 * @returns A mock RPC error response
 *
 * @example
 * const errorResponse = createMockRpcError('RPC function not found');
 * mockRpc.mockResolvedValue(errorResponse);
 */
export const createMockRpcError = (message: string = 'RPC error') => ({
  data: null,
  error: {
    message,
  },
});
