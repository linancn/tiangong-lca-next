/**
 * Shared mock builders for Supabase query patterns
 *
 * This module provides reusable mock builder functions for common Supabase
 * query patterns used across the test suite.
 */

export type SupabaseQueryResultLike<T> = T;

type ChainableMethod<TResolved, Args extends unknown[]> = jest.Mock<
  SupabaseQueryBuilderMock<TResolved>,
  Args
>;

type SingleMethod<TResolved> = jest.Mock<Promise<TResolved>, []>;

export type SupabaseQueryBuilderMock<TResolved> = PromiseLike<TResolved> & {
  select: ChainableMethod<TResolved, [columns?: string, options?: unknown]>;
  order: ChainableMethod<TResolved, [column: string, options?: { ascending?: boolean } | unknown]>;
  range: ChainableMethod<TResolved, [from: number, to: number]>;
  eq: ChainableMethod<TResolved, [column: string, value: unknown]>;
  neq: ChainableMethod<TResolved, [column: string, value: unknown]>;
  filter: ChainableMethod<TResolved, [column: string, operator: string, value: unknown]>;
  gte: ChainableMethod<TResolved, [column: string, value: unknown]>;
  lte: ChainableMethod<TResolved, [column: string, value: unknown]>;
  gt: ChainableMethod<TResolved, [column: string, value: unknown]>;
  lt: ChainableMethod<TResolved, [column: string, value: unknown]>;
  limit: ChainableMethod<TResolved, [count: number]>;
  or: ChainableMethod<TResolved, [filters: string, options?: unknown]>;
  ilike: ChainableMethod<TResolved, [column: string, pattern: string]>;
  single: SingleMethod<TResolved>;
  insert: ChainableMethod<TResolved, [values: unknown, options?: unknown]>;
  update: ChainableMethod<TResolved, [values: unknown, options?: unknown]>;
  delete: ChainableMethod<TResolved, []>;
  upsert: ChainableMethod<TResolved, [values: unknown, options?: unknown]>;
  in: ChainableMethod<TResolved, [column: string, values: readonly unknown[]]>;
};

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
  const builder = {} as SupabaseQueryBuilderMock<T>;

  const chain = <Args extends unknown[]>(): ChainableMethod<T, Args> =>
    jest.fn<SupabaseQueryBuilderMock<T>, Args>((...args) => {
      void args;
      return builder;
    });

  builder.select = chain<[columns?: string, options?: unknown]>();
  builder.order = chain<[column: string, options?: { ascending?: boolean } | unknown]>();
  builder.range = chain<[from: number, to: number]>();
  builder.eq = chain<[column: string, value: unknown]>();
  builder.neq = chain<[column: string, value: unknown]>();
  builder.filter = chain<[column: string, operator: string, value: unknown]>();
  builder.gte = chain<[column: string, value: unknown]>();
  builder.lte = chain<[column: string, value: unknown]>();
  builder.gt = chain<[column: string, value: unknown]>();
  builder.lt = chain<[column: string, value: unknown]>();
  builder.limit = chain<[count: number]>();
  builder.or = chain<[filters: string, options?: unknown]>();
  builder.ilike = chain<[column: string, pattern: string]>();
  builder.single = jest.fn(async () => resolvedValue);
  builder.insert = chain<[values: unknown, options?: unknown]>();
  builder.update = chain<[values: unknown, options?: unknown]>();
  builder.delete = chain<[]>();
  builder.upsert = chain<[values: unknown, options?: unknown]>();
  builder.in = chain<[column: string, values: readonly unknown[]]>();

  builder.then = ((onfulfilled, onrejected) =>
    Promise.resolve(resolvedValue).then(onfulfilled, onrejected)) as PromiseLike<T>['then'];

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
