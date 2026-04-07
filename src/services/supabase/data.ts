type SupabaseResponseBase = {
  count: number | null;
  status: number;
  statusText: string;
  success?: boolean;
};

export type SupabaseError = {
  code: string;
  details: string;
  hint: string;
  message: string;
  name?: string;
  toJSON?: () => {
    code: string;
    details: string;
    hint: string;
    message: string;
    name?: string;
  };
  state_code?: number;
  review_state_code?: number;
};

type SupabaseFailureResult = SupabaseResponseBase & {
  data: null;
  error: SupabaseError;
};

type SupabaseQuerySuccessResult<T> = SupabaseResponseBase & {
  data: T[];
  error: null;
};

type SupabaseSingleSuccessResult<T> = SupabaseResponseBase & {
  data: T;
  error: null;
};

type SupabaseDeleteSuccessResult = SupabaseResponseBase & {
  data: null;
  error: null;
};

export type SupabaseQueryResult<T> = SupabaseQuerySuccessResult<T> | SupabaseFailureResult;

export type SupabaseMutationResult<T> = SupabaseQueryResult<T>;

export type SupabaseSingleResult<T> = SupabaseSingleSuccessResult<T> | SupabaseFailureResult;

export type SupabaseDeleteResult = SupabaseDeleteSuccessResult | SupabaseFailureResult;

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
      success: false,
    };
  }

  return {
    data: null,
    error: null,
    count: null,
    status: 204,
    statusText: 'No Content',
    success: true,
  };
}
