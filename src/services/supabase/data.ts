import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

export type SupabaseError = PostgrestError & {
  state_code?: number;
  review_state_code?: number;
};

export type SupabaseQueryResult<T> = Omit<PostgrestResponse<T>, 'error'> & {
  error: SupabaseError | null;
};

export type SupabaseMutationResult<T> = Omit<PostgrestResponse<T>, 'error'> & {
  error: SupabaseError | null;
};

export type SupabaseSingleResult<T> = Omit<PostgrestSingleResponse<T>, 'error'> & {
  error: SupabaseError | null;
};

export type SupabaseDeleteResult = SupabaseSingleResult<null>;

export function normalizeDeleteCommandResult<Row extends Record<string, unknown>>(
  result: SupabaseMutationResult<Row>,
): SupabaseDeleteResult {
  if (result.error) {
    return {
      data: null,
      error: result.error,
      count: null,
      status: result.status,
      statusText: result.statusText,
    };
  }

  return {
    data: null,
    error: null,
    count: null,
    status: 204,
    statusText: 'No Content',
  };
}
