import type {
  SupabaseDeleteResult,
  SupabaseError,
  SupabaseMutationResult,
  SupabaseQueryResult,
  SupabaseSingleResult,
} from '@/services/supabase/data';

describe('supabase data shapes', () => {
  it('supports query and mutation result wrappers with extended state_code errors', () => {
    const error: SupabaseError = {
      name: 'PostgrestError',
      code: '23505',
      details: 'duplicate key',
      hint: 'Use another id',
      message: 'duplicate key value violates unique constraint',
      state_code: 409,
    };
    const queryResult: SupabaseQueryResult<{ id: string }> = {
      data: null,
      error,
      count: null,
      status: 409,
      statusText: 'Conflict',
    };
    const mutationResult: SupabaseMutationResult<{ id: string }> = {
      data: [{ id: 'row-2' }],
      error: null,
      count: 1,
      status: 200,
      statusText: 'OK',
    };

    expect(queryResult.error?.state_code).toBe(409);
    expect(queryResult.data).toBeNull();
    expect(mutationResult.error).toBeNull();
    expect(mutationResult.statusText).toBe('OK');
  });

  it('supports single-row and delete result wrappers', () => {
    const singleResult: SupabaseSingleResult<{ id: string }> = {
      data: { id: 'row-3' },
      error: null,
      count: 1,
      status: 200,
      statusText: 'OK',
    };
    const deleteResult: SupabaseDeleteResult = {
      data: null,
      error: null,
      count: null,
      status: 204,
      statusText: 'No Content',
    };

    expect(singleResult.data?.id).toBe('row-3');
    expect(deleteResult.data).toBeNull();
    expect(deleteResult.status).toBe(204);
  });
});
