import type {
  PostgrestError,
  PostgrestResponse,
  PostgrestSingleResponse,
} from '@supabase/supabase-js';

export type SupabaseError = PostgrestError & { state_code?: number };

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
